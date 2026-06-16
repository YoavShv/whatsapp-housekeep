import { and, eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { complaints, messages } from '@/lib/db/schema'
import { classifyMessage } from '@/lib/ai/classifier'
import { sendFreeform } from '@/lib/whatsapp/cloud-api'

export interface IntakeInput {
  messageText: string
  phone: string // includes '+' prefix
  buildingId: string
  residentId: string | null
  sentAt: Date
}

const ACK_MESSAGE = 'תודה, קיבלנו את פנייתך ונטפל בה בהקדם.'

export async function processIncomingMessage(input: IntakeInput): Promise<void> {
  const { messageText, phone, buildingId, residentId, sentAt } = input

  let complaintId: string | null = null

  try {
    // Cap at 50 open complaints for dedup context; mock chain must also end with .limit().
    const openRows = await db
      .select({ id: complaints.id, title: complaints.title, category: complaints.category })
      .from(complaints)
      .where(and(eq(complaints.buildingId, buildingId), eq(complaints.status, 'open')))
      .limit(50)

    const openComplaints = openRows.map((c) => ({
      id: c.id,
      // OpenComplaint.title is non-nullable; map a null DB title to a placeholder.
      title: c.title ?? '(ללא כותרת)',
      category: c.category,
    }))

    const classification = await classifyMessage({ message: messageText, openComplaints })

    if (classification.is_complaint) {
      const newComplaintId = crypto.randomUUID()
      await db.insert(complaints).values({
        id: newComplaintId,
        buildingId,
        residentId,
        title: classification.suggested_title_he,
        // category/urgency can be null even when is_complaint=true; default to satisfy NOT NULL.
        category: classification.category ?? 'other',
        urgency: classification.urgency ?? 'medium',
        status: 'open',
        priority: 0,
        dedupeTargetId: classification.dedupe_target_id,
      })
      complaintId = newComplaintId // only set AFTER confirmed DB write
    }
  } catch (err) {
    console.error('[intake] Classification or complaint insert failed', {
      phoneSuffix: phone.slice(-4),
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // The message is always persisted, even if classification failed (complaintId=null).
  await db.insert(messages).values({
    id: crypto.randomUUID(),
    complaintId,
    buildingId,
    residentId,
    content: messageText,
    source: 'whatsapp',
    sentAt,
  })

  if (complaintId) {
    try {
      await sendFreeform(phone, ACK_MESSAGE)
    } catch (err) {
      console.error('[intake] Ack send failed', {
        phoneSuffix: phone.slice(-4),
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }
}
