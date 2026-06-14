import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { complaintCategories, urgencyLevels } from '@/lib/db/schema'
import { buildClassifySystemPrompt, type OpenComplaint } from './prompts/classify'

const ClassifySchema = z.object({
  is_complaint: z.boolean(),
  category: z.enum(complaintCategories).nullable(),
  urgency: z.enum(urgencyLevels).nullable(),
  dedupe_target_id: z.string().nullable(),
  extracted_entities: z.record(z.string(), z.string()),
  suggested_title_he: z.string().nullable(),
})

export type ClassifyOutput = z.infer<typeof ClassifySchema>

export interface ClassifyInput {
  message: string
  openComplaints?: OpenComplaint[]
}

const client = new Anthropic()

export async function classifyMessage(input: ClassifyInput): Promise<ClassifyOutput> {
  const { message, openComplaints = [] } = input
  const systemPrompt = buildClassifySystemPrompt(openComplaints)

  let response
  try {
    response = await client.messages.parse({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: [
        {
          type: 'text',
          text: systemPrompt,
          // cache_control tags the static prefix for reuse; activates at ≥4096 tokens
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: message }],
      output_config: { format: zodOutputFormat(ClassifySchema) },
    })
  } catch (err) {
    console.error('[classifier] API call failed', {
      messagePreview: message.slice(0, 80),
      error: err instanceof Error ? err.message : String(err),
    })
    throw err
  }

  const result = response.parsed_output
  if (!result) {
    throw new Error(
      `Classifier returned no parsed output (stop_reason=${response.stop_reason}, messagePreview=${message.slice(0, 60)})`
    )
  }

  return result
}
