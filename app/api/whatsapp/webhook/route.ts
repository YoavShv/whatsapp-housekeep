import { NextRequest } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db/index'
import { residents } from '@/lib/db/schema'
import { verifySignature } from '@/lib/whatsapp/verify-signature'
import { processIncomingMessage } from '@/lib/whatsapp/intake'

type WebhookTextMessage = {
  from: string
  id: string
  timestamp: string
  type: string
  text?: { body: string }
}

type WebhookPayload = {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      field: string
      value: {
        messages?: WebhookTextMessage[]
      }
    }>
  }>
}

export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    if (!challenge) return new Response('Bad Request', { status: 400 })
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

export async function POST(req: NextRequest): Promise<Response> {
  // Read the raw body once — req.text() consumes the stream, so req.json() can't be called after.
  const rawBody = await req.text()
  const sig = req.headers.get('x-hub-signature-256') ?? ''
  const secret = process.env.WHATSAPP_APP_SECRET ?? ''

  if (!secret) {
    console.error('[webhook] WHATSAPP_APP_SECRET is not configured')
    return new Response('Internal Server Error', { status: 500 })
  }

  if (!verifySignature(secret, rawBody, sig)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let payload: WebhookPayload
  try {
    payload = JSON.parse(rawBody) as WebhookPayload
  } catch {
    console.error('[webhook] Malformed JSON body (first 200 chars):', rawBody.slice(0, 200))
    return new Response('Bad Request', { status: 400 })
  }
  const pocBuildingId = process.env.POC_BUILDING_ID ?? 'building-001'

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      // Skip status receipts and other non-message changes.
      if (change.field !== 'messages') continue
      // value.messages may be absent when the change only contains delivery/read statuses.
      for (const msg of change.value.messages ?? []) {
        if (msg.type !== 'text' || !msg.text?.body) continue

        // Meta sends the phone without a leading '+'; residents store it with one.
        const phone = '+' + msg.from
        const sentAt = new Date(parseInt(msg.timestamp, 10) * 1000)

        try {
          const [resident] = await db
            .select()
            .from(residents)
            .where(eq(residents.phone, phone))
            .limit(1)

          await processIncomingMessage({
            messageText: msg.text.body,
            phone,
            buildingId: resident?.buildingId ?? pocBuildingId,
            residentId: resident?.id ?? null,
            sentAt,
          })
        } catch (err) {
          console.error('[webhook] Failed to process message from', phone, err)
        }
      }
    }
  }

  return new Response('OK', { status: 200 })
}
