import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createHmac } from 'crypto'
import { verifySignature } from '@/lib/whatsapp/verify-signature'
import { db } from '@/lib/db/index'

// vi.mock is hoisted above the imports below, so the route's db import resolves to this mock.
vi.mock('@/lib/db/index', () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
  },
}))

vi.mock('@/lib/whatsapp/intake', () => ({
  processIncomingMessage: vi.fn().mockResolvedValue(undefined),
}))

import { GET, POST } from '@/app/api/whatsapp/webhook/route'
import { processIncomingMessage } from '@/lib/whatsapp/intake'

describe('verifySignature', () => {
  const SECRET = 'test-secret'
  const PAYLOAD = '{"hello":"world"}'

  function makeHeader(payload = PAYLOAD, secret = SECRET): string {
    return 'sha256=' + createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
  }

  it('returns true for a valid signature', () => {
    expect(verifySignature(SECRET, PAYLOAD, makeHeader())).toBe(true)
  })

  it('returns false for a tampered payload', () => {
    expect(verifySignature(SECRET, PAYLOAD + 'x', makeHeader())).toBe(false)
  })

  it('returns false for a wrong secret', () => {
    expect(verifySignature('wrong-secret', PAYLOAD, makeHeader())).toBe(false)
  })

  it('returns false when header is missing sha256= prefix', () => {
    const hex = createHmac('sha256', SECRET).update(PAYLOAD, 'utf8').digest('hex')
    expect(verifySignature(SECRET, PAYLOAD, hex)).toBe(false)
  })

  it('returns false for an empty header', () => {
    expect(verifySignature(SECRET, PAYLOAD, '')).toBe(false)
  })

  it('returns false for a truncated hex (wrong length)', () => {
    expect(verifySignature(SECRET, PAYLOAD, 'sha256=deadbeef')).toBe(false)
  })
})

describe('GET /api/whatsapp/webhook', () => {
  const VERIFY_TOKEN = 'my-verify-token'

  beforeEach(() => {
    process.env.WHATSAPP_VERIFY_TOKEN = VERIFY_TOKEN
  })

  it('returns 200 with challenge when token matches', async () => {
    const req = new Request(
      'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my-verify-token&hub.challenge=echo123',
    )
    const res = await GET(req as never)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('echo123')
  })

  it('returns 403 when token does not match', async () => {
    const req = new Request(
      'http://localhost/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=echo123',
    )
    const res = await GET(req as never)
    expect(res.status).toBe(403)
  })

  it('returns 403 when hub.mode is not subscribe', async () => {
    const req = new Request(
      'http://localhost/api/whatsapp/webhook?hub.mode=unsubscribe&hub.verify_token=my-verify-token&hub.challenge=echo123',
    )
    const res = await GET(req as never)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/whatsapp/webhook', () => {
  const APP_SECRET = 'app-secret-123'

  function makeSignedRequest(body: string, secret = APP_SECRET): Request {
    const sig = 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex')
    return new Request('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'x-hub-signature-256': sig, 'content-type': 'application/json' },
      body,
    })
  }

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = APP_SECRET
    vi.clearAllMocks()
  })

  const validPayload = JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: 'waba-id',
        changes: [
          {
            field: 'messages',
            value: {
              messages: [
                {
                  from: '972501234567',
                  id: 'wamid.123',
                  timestamp: '1748890800',
                  type: 'text',
                  text: { body: 'הדלת תקועה' },
                },
              ],
            },
          },
        ],
      },
    ],
  })

  it('returns 401 for invalid signature', async () => {
    const req = new Request('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      headers: {
        'x-hub-signature-256':
          'sha256=badhex000000000000000000000000000000000000000000000000000000000000',
        'content-type': 'application/json',
      },
      body: validPayload,
    })
    const res = await POST(req as never)
    expect(res.status).toBe(401)
  })

  it('returns 200 for a valid signed payload', async () => {
    const res = await POST(makeSignedRequest(validPayload) as never)
    expect(res.status).toBe(200)
  })

  it('returns 200 and skips non-text messages', async () => {
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-id',
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  { from: '972501234567', id: 'wamid.456', timestamp: '1748890800', type: 'image' },
                ],
              },
            },
          ],
        },
      ],
    })
    const res = await POST(makeSignedRequest(payload) as never)
    expect(res.status).toBe(200)
  })

  it('returns 200 and skips status-only change entries', async () => {
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-id',
          changes: [
            { field: 'statuses', value: { statuses: [{ id: 'wamid.789', status: 'delivered' }] } },
          ],
        },
      ],
    })
    const res = await POST(makeSignedRequest(payload) as never)
    expect(res.status).toBe(200)
  })

  it('returns 500 when WHATSAPP_APP_SECRET env var is not set', async () => {
    const saved = process.env.WHATSAPP_APP_SECRET
    delete process.env.WHATSAPP_APP_SECRET
    try {
      const res = await POST(makeSignedRequest(validPayload) as never)
      expect(res.status).toBe(500)
    } finally {
      process.env.WHATSAPP_APP_SECRET = saved
    }
  })

  it('returns 400 for a valid-signature but non-JSON body', async () => {
    const body = 'not-json-at-all'
    const sig = 'sha256=' + createHmac('sha256', APP_SECRET).update(body, 'utf8').digest('hex')
    const req = new Request('http://localhost/api/whatsapp/webhook', {
      method: 'POST',
      headers: { 'x-hub-signature-256': sig },
      body,
    })
    const res = await POST(req as never)
    expect(res.status).toBe(400)
  })

  it('calls processIncomingMessage with correct IntakeInput for a valid text message', async () => {
    const res = await POST(makeSignedRequest(validPayload) as never)
    expect(res.status).toBe(200)
    expect(processIncomingMessage).toHaveBeenCalledTimes(1)
    expect(processIncomingMessage).toHaveBeenCalledWith({
      messageText: 'הדלת תקועה',
      phone: '+972501234567',
      buildingId: expect.any(String),
      residentId: null,
      sentAt: new Date(1748890800 * 1000),
    })
  })

  it('does not call processIncomingMessage for non-text messages', async () => {
    const payload = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'waba-id',
          changes: [
            {
              field: 'messages',
              value: {
                messages: [
                  { from: '972501234567', id: 'wamid.456', timestamp: '1748890800', type: 'image' },
                ],
              },
            },
          ],
        },
      ],
    })
    await POST(makeSignedRequest(payload) as never)
    expect(processIncomingMessage).not.toHaveBeenCalled()
  })

  it('passes resident buildingId and residentId when resident is found', async () => {
    const fakeResident = { id: 'res-001', buildingId: 'bldg-abc', phone: '+972501234567' }
    ;(db.select as any).mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([fakeResident]),
        }),
      }),
    })

    await POST(makeSignedRequest(validPayload) as never)

    expect(processIncomingMessage).toHaveBeenCalledWith(
      expect.objectContaining({ buildingId: 'bldg-abc', residentId: 'res-001' }),
    )
  })
})
