const GRAPH_API_VERSION = 'v22.0'
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

export interface CloudApiError {
  code: number
  message: string
  details?: string
  fbtrace_id?: string
}

export class WhatsAppApiError extends Error {
  constructor(public readonly error: CloudApiError) {
    super(`WhatsApp API error ${error.code}: ${error.message}`)
    this.name = 'WhatsAppApiError'
  }
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters: { type: 'text'; text: string }[]
}

interface ApiSuccessResponse {
  messages: { id: string }[]
}

interface ApiErrorResponse {
  error: {
    code: number
    message: string
    error_data?: { details?: string }
    fbtrace_id?: string
  }
}

async function callApi(path: string, body: unknown): Promise<ApiSuccessResponse> {
  const token = process.env.WHATSAPP_TOKEN
  if (!token) throw new Error('WHATSAPP_TOKEN is not set')

  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (cause) {
    throw new WhatsAppApiError({
      code: -2,
      message: `Network error: ${cause instanceof Error ? cause.message : String(cause)}`,
    })
  }

  let data: ApiSuccessResponse | ApiErrorResponse
  try {
    data = (await res.json()) as ApiSuccessResponse | ApiErrorResponse
  } catch {
    throw new WhatsAppApiError({
      code: -1,
      message: `Non-JSON response (HTTP ${res.status})`,
      details: `Content-Type: ${res.headers.get('content-type') ?? 'unknown'}`,
    })
  }

  if (!res.ok) {
    const apiError = (data as Partial<ApiErrorResponse>).error
    throw new WhatsAppApiError({
      code: apiError?.code ?? res.status,
      message: apiError?.message ?? `HTTP ${res.status}`,
      details: apiError?.error_data?.details ?? JSON.stringify(data),
      fbtrace_id: apiError?.fbtrace_id,
    })
  }
  return data as ApiSuccessResponse
}

export async function sendFreeform(to: string, text: string): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set')
  const data = await callApi(`/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: text },
  })
  return data.messages[0].id
}

export async function sendTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: TemplateComponent[],
): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!phoneNumberId) throw new Error('WHATSAPP_PHONE_NUMBER_ID is not set')
  const data = await callApi(`/${phoneNumberId}/messages`, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components?.length ? { components } : {}),
    },
  })
  return data.messages[0].id
}
