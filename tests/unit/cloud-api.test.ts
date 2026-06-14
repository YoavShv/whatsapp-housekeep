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

function mockApiError(code: number, message: string, extra?: Record<string, unknown>) {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ error: { code, message, ...extra } }), { status: 400 }),
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
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.messaging_product).toBe('whatsapp')
    expect(body.to).toBe(RECIPIENT)
    expect(body.type).toBe('text')
    expect(body.text.body).toBe('Hello')
  })

  it('throws WhatsAppApiError with the error code when the API responds with an error', async () => {
    mockApiError(131047, 'Re-engagement message')

    const err = await sendFreeform(RECIPIENT, 'Hello').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(WhatsAppApiError)
    expect((err as WhatsAppApiError).error.code).toBe(131047)
  })

  it('maps error_data.details and fbtrace_id onto WhatsAppApiError', async () => {
    mockApiError(131047, 'Re-engagement message', {
      error_data: { details: 'User must opt-in first' },
      fbtrace_id: 'AbCdEfG',
    })

    const err = await sendFreeform(RECIPIENT, 'Hello').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(WhatsAppApiError)
    expect((err as WhatsAppApiError).error.details).toBe('User must opt-in first')
    expect((err as WhatsAppApiError).error.fbtrace_id).toBe('AbCdEfG')
  })

  it('wraps network errors as WhatsAppApiError with code -2', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const err = await sendFreeform(RECIPIENT, 'Hello').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(WhatsAppApiError)
    expect((err as WhatsAppApiError).error.code).toBe(-2)
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

  it('omits components key when an empty array is passed', async () => {
    mockSuccess()

    await sendTemplate(RECIPIENT, 'complaint_received', 'he', [])

    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.template.components).toBeUndefined()
  })

  it('throws WhatsAppApiError when the API returns an error', async () => {
    mockApiError(131030, 'Invalid recipient')

    const err = await sendTemplate(RECIPIENT, 'tmpl', 'he').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(WhatsAppApiError)
  })
})
