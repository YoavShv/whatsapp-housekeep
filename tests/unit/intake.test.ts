import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from '@/lib/db/index'
import { classifyMessage } from '@/lib/ai/classifier'
import { sendFreeform } from '@/lib/whatsapp/cloud-api'

// vi.mock is hoisted above the imports below, so intake's deps resolve to these mocks.
vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn(),
    // Each insert() returns a fresh values mock so the complaint and message
    // inserts can be asserted independently via mock.results[0]/[1].
    insert: vi.fn(() => ({ values: vi.fn().mockResolvedValue(undefined) })),
  },
}))

vi.mock('@/lib/ai/classifier', () => ({ classifyMessage: vi.fn() }))
vi.mock('@/lib/whatsapp/cloud-api', () => ({ sendFreeform: vi.fn() }))

import { processIncomingMessage } from '@/lib/whatsapp/intake'

type ClassifyOutput = Awaited<ReturnType<typeof classifyMessage>>

function classification(overrides: Partial<ClassifyOutput> = {}): ClassifyOutput {
  return {
    is_complaint: false,
    category: null,
    urgency: null,
    dedupe_target_id: null,
    extracted_entities: {},
    suggested_title_he: null,
    ...overrides,
  }
}

const baseInput = {
  messageText: 'יש נזילה במרתף',
  phone: '+972501234567',
  buildingId: 'bldg-1',
  residentId: 'res-1',
  sentAt: new Date(1748890800 * 1000),
}

describe('processIncomingMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-establish default mock implementations cleared above.
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    })
    ;(db.insert as any).mockImplementation(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    }))
    vi.mocked(sendFreeform).mockResolvedValue('wamid.mock')
  })

  it('inserts a complaint and links message when is_complaint=true', async () => {
    vi.mocked(classifyMessage).mockResolvedValue(
      classification({ is_complaint: true, category: 'plumbing', urgency: 'high' }),
    )

    await processIncomingMessage(baseInput)

    expect(db.insert).toHaveBeenCalledTimes(2)
    const complaintValues = (db.insert as any).mock.results[0].value.values
    const messageValues = (db.insert as any).mock.results[1].value.values
    const complaintArg = complaintValues.mock.calls[0][0]
    const messageArg = messageValues.mock.calls[0][0]
    expect(complaintArg.category).toBe('plumbing')
    expect(messageArg.complaintId).toBe(complaintArg.id)
  })

  it('sets dedupeTargetId on complaint when classifier returns dedupe_target_id', async () => {
    vi.mocked(classifyMessage).mockResolvedValue(
      classification({
        is_complaint: true,
        category: 'plumbing',
        urgency: 'high',
        dedupe_target_id: 'cmp-existing',
      }),
    )

    await processIncomingMessage(baseInput)

    const complaintValues = (db.insert as any).mock.results[0].value.values
    expect(complaintValues).toHaveBeenCalledWith(
      expect.objectContaining({ dedupeTargetId: 'cmp-existing' }),
    )
  })

  it('inserts message with complaintId=null and skips sendFreeform when is_complaint=false', async () => {
    vi.mocked(classifyMessage).mockResolvedValue(classification({ is_complaint: false }))

    await processIncomingMessage(baseInput)

    expect(db.insert).toHaveBeenCalledTimes(1)
    const messageValues = (db.insert as any).mock.results[0].value.values
    expect(messageValues).toHaveBeenCalledWith(expect.objectContaining({ complaintId: null }))
    expect(sendFreeform).not.toHaveBeenCalled()
  })

  it('passes open complaints to the classifier', async () => {
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 'cmp-1', title: 'תלונה', category: 'elevator' },
            { id: 'cmp-2', title: 'רעש', category: 'noise' },
          ]),
        }),
      }),
    })
    vi.mocked(classifyMessage).mockResolvedValue(classification({ is_complaint: false }))

    await processIncomingMessage(baseInput)

    expect(classifyMessage).toHaveBeenCalledWith({
      message: baseInput.messageText,
      openComplaints: [
        { id: 'cmp-1', title: 'תלונה', category: 'elevator' },
        { id: 'cmp-2', title: 'רעש', category: 'noise' },
      ],
    })
  })

  it('substitutes placeholder for null title in open complaints passed to classifier', async () => {
    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 'cmp-1', title: null, category: 'elevator' },
            { id: 'cmp-2', title: 'רעש', category: 'noise' },
          ]),
        }),
      }),
    })
    vi.mocked(classifyMessage).mockResolvedValue(classification({ is_complaint: false }))

    await processIncomingMessage(baseInput)

    expect(classifyMessage).toHaveBeenCalledWith({
      message: baseInput.messageText,
      openComplaints: [
        { id: 'cmp-1', title: '(ללא כותרת)', category: 'elevator' },
        { id: 'cmp-2', title: 'רעש', category: 'noise' },
      ],
    })
  })

  it('handles anonymous resident (residentId=null)', async () => {
    vi.mocked(classifyMessage).mockResolvedValue(
      classification({ is_complaint: true, category: 'noise', urgency: 'low' }),
    )

    await processIncomingMessage({ ...baseInput, residentId: null })

    const complaintValues = (db.insert as any).mock.results[0].value.values
    expect(complaintValues).toHaveBeenCalledWith(expect.objectContaining({ residentId: null }))
    const messageValues = (db.insert as any).mock.results[1].value.values
    expect(messageValues).toHaveBeenCalledWith(expect.objectContaining({ residentId: null }))
  })

  it('still inserts message when classifier throws', async () => {
    vi.mocked(classifyMessage).mockRejectedValue(new Error('network down'))

    await processIncomingMessage(baseInput)

    expect(db.insert).toHaveBeenCalledTimes(1)
    const messageValues = (db.insert as any).mock.results[0].value.values
    expect(messageValues).toHaveBeenCalledWith(expect.objectContaining({ complaintId: null }))
  })

  it('sends ack to the resident phone after complaint creation', async () => {
    vi.mocked(classifyMessage).mockResolvedValue(
      classification({ is_complaint: true, category: 'noise', urgency: 'low' }),
    )

    await processIncomingMessage(baseInput)

    expect(sendFreeform).toHaveBeenCalledWith(baseInput.phone, expect.stringContaining('תודה'))
  })

  it('does not throw when sendFreeform fails', async () => {
    vi.mocked(classifyMessage).mockResolvedValue(
      classification({ is_complaint: true, category: 'noise', urgency: 'low' }),
    )
    vi.mocked(sendFreeform).mockRejectedValue(new Error('send failed'))

    await expect(processIncomingMessage(baseInput)).resolves.toBeUndefined()
  })

  it('uses category=other when classifier returns null category with is_complaint=true', async () => {
    vi.mocked(classifyMessage).mockResolvedValue(
      classification({ is_complaint: true, category: null, urgency: null }),
    )

    await processIncomingMessage(baseInput)

    const complaintValues = (db.insert as any).mock.results[0].value.values
    expect(complaintValues).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'other', urgency: 'medium' }),
    )
  })
})
