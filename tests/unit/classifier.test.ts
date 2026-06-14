import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockParse = vi.fn()

vi.mock('@anthropic-ai/sdk', () => {
  // Must use function keyword — arrow functions have no prototype and cannot be called with `new`
  const MockAnthropic = vi.fn().mockImplementation(function (this: { messages: unknown }) {
    this.messages = { parse: mockParse }
  })
  return { default: MockAnthropic }
})

// Import after mock is set up
const { classifyMessage } = await import('@/lib/ai/classifier')

beforeEach(() => vi.clearAllMocks())

describe('classifyMessage()', () => {
  it('returns a complaint with correct category and urgency', async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        is_complaint: true,
        category: 'plumbing',
        urgency: 'high',
        dedupe_target_id: null,
        extracted_entities: { location: 'דירה 5', problem: 'נזילה' },
        suggested_title_he: 'נזילה מתקרה בדירה 5',
      },
    })

    const result = await classifyMessage({ message: 'יש נזילה מהתקרה בדירה 5' })

    expect(result.is_complaint).toBe(true)
    expect(result.category).toBe('plumbing')
    expect(result.urgency).toBe('high')
    expect(result.suggested_title_he).toBe('נזילה מתקרה בדירה 5')
  })

  it('returns is_complaint false for non-complaint messages', async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        is_complaint: false,
        category: null,
        urgency: null,
        dedupe_target_id: null,
        extracted_entities: {},
        suggested_title_he: null,
      },
    })

    const result = await classifyMessage({ message: 'מתי האסיפה הבאה?' })

    expect(result.is_complaint).toBe(false)
    expect(result.category).toBeNull()
    expect(result.urgency).toBeNull()
  })

  it('identifies a duplicate and sets dedupe_target_id', async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        is_complaint: true,
        category: 'elevator',
        urgency: 'medium',
        dedupe_target_id: 'complaint-abc-123',
        extracted_entities: { location: 'קומה 3' },
        suggested_title_he: 'תקלה במעלית קומה 3',
      },
    })

    const result = await classifyMessage({
      message: 'המעלית לא עובדת שוב',
      openComplaints: [{ id: 'complaint-abc-123', title: 'תקלה במעלית', category: 'elevator' }],
    })

    expect(result.dedupe_target_id).toBe('complaint-abc-123')
  })

  it('passes open complaints to the API call', async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        is_complaint: true,
        category: 'noise',
        urgency: 'low',
        dedupe_target_id: null,
        extracted_entities: {},
        suggested_title_he: 'רעש מהשכן',
      },
    })

    const openComplaints = [{ id: 'cmp-1', title: 'רעש בלילה', category: 'noise' as const }]
    await classifyMessage({ message: 'יש רעש מהשכן', openComplaints })

    const callArgs = mockParse.mock.calls[0][0]
    const systemText = callArgs.system[0].text as string
    expect(systemText).toContain('cmp-1')
    expect(systemText).toContain('רעש בלילה')
  })

  it('uses the correct model and sets cache_control on system prompt', async () => {
    mockParse.mockResolvedValue({
      parsed_output: {
        is_complaint: false,
        category: null,
        urgency: null,
        dedupe_target_id: null,
        extracted_entities: {},
        suggested_title_he: null,
      },
    })

    await classifyMessage({ message: 'test' })

    const callArgs = mockParse.mock.calls[0][0]
    expect(callArgs.model).toBe('claude-haiku-4-5-20251001')
    expect(callArgs.system[0].cache_control).toEqual({ type: 'ephemeral' })
  })

  it('throws when parsed_output is null', async () => {
    mockParse.mockResolvedValue({ parsed_output: null })

    await expect(classifyMessage({ message: 'test' })).rejects.toThrow(
      'Classifier returned no parsed output',
    )
  })
})
