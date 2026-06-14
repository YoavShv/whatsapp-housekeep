import { describe, it, expect } from 'vitest'
import { buildClassifySystemPrompt } from '@/lib/ai/prompts/classify'

describe('buildClassifySystemPrompt()', () => {
  it('uses Hebrew fallback when no open complaints are provided', () => {
    const prompt = buildClassifySystemPrompt([])
    expect(prompt).toContain('אין תלונות פתוחות כרגע.')
  })

  it('formats each open complaint with index, id, category, and title', () => {
    const prompt = buildClassifySystemPrompt([
      { id: 'cmp-1', title: 'נזילה בקומה 2', category: 'plumbing' },
      { id: 'cmp-2', title: 'תקלת מעלית', category: 'elevator' },
    ])
    expect(prompt).toContain('1. [cmp-1] קטגוריה: plumbing — נזילה בקומה 2')
    expect(prompt).toContain('2. [cmp-2] קטגוריה: elevator — תקלת מעלית')
  })
})
