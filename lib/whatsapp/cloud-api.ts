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
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as ApiSuccessResponse | ApiErrorResponse
  if (!res.ok) {
    const { error } = data as ApiErrorResponse
    throw new WhatsAppApiError({
      code: error.code,
      message: error.message,
      details: error.error_data?.details,
      fbtrace_id: error.fbtrace_id,
    })
  }
  return data as ApiSuccessResponse
}

export async function sendFreeform(to: string, text: string): Promise<string> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
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
