import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { sendFreeform, sendTemplate, WhatsAppApiError } from '@/lib/whatsapp/cloud-api'

const MOCK_PHONE_ID = 'test-phone-id'
const MOCK_TOKEN = 'test-token'
const RECIPIENT = '+972501234567'
const WAMID = 'wamid.abc123'

function mockSuccess() {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ messages: [{ id: WAMID }] }), { status: 200 }),
  )
}

function mockApiError(code: number, message: string) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ error: { code, message } }), { status: 400 }),
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
  vi.stubEnv('WHATSAPP_PHONE_NUMBER_ID', MOCK_PHONE_ID)
  vi.stubEnv('WHATSAPP_TOKEN', MOCK_TOKEN)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('sendFreeform', () => {
  it('POSTs to the messages endpoint and returns the message id', async () => {
    mockSuccess()

    const id = await sendFreeform(RECIPIENT, 'Hello')

    expect(id).toBe(WAMID)
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/${MOCK_PHONE_ID}/messages`),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: `Bearer ${MOCK_TOKEN}`,
        }),
      }),
    )
  })

  it('throws WhatsAppApiError with the error code when the API responds with an error', async () => {
    mockApiError(131047, 'Re-engagement message')

    const err = await sendFreeform(RECIPIENT, 'Hello').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(WhatsAppApiError)
    expect((err as WhatsAppApiError).error.code).toBe(131047)
  })
})

describe('sendTemplate', () => {
  it('POSTs a template message without components and returns the message id', async () => {
    mockSuccess()

    const id = await sendTemplate(RECIPIENT, 'complaint_received', 'he')

    expect(id).toBe(WAMID)
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.type).toBe('template')
    expect(body.template.name).toBe('complaint_received')
    expect(body.template.language.code).toBe('he')
    expect(body.template.components).toBeUndefined()
  })

  it('includes components in the request body when provided', async () => {
    mockSuccess()

    await sendTemplate(RECIPIENT, 'complaint_received', 'he', [
      { type: 'body', parameters: [{ type: 'text', text: 'elevator' }] },
    ])

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.template.components).toHaveLength(1)
    expect(body.template.components[0].type).toBe('body')
  })

  it('throws WhatsAppApiError when the API returns an error', async () => {
    mockApiError(131030, 'Invalid recipient')

    const err = await sendTemplate(RECIPIENT, 'tmpl', 'he').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(WhatsAppApiError)
  })
})
