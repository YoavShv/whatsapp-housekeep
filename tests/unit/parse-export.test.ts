import { describe, expect, it } from 'vitest'
import { parseExport } from '@/lib/whatsapp/parse-export'

describe('parseExport', () => {
  it('parses a basic Android message (Hebrew sender)', () => {
    const records = parseExport('14/3/25, 09:15 - דני כהן: שלום לכולם')
    expect(records).toHaveLength(1)
    expect(records[0].sender).toBe('דני כהן')
    expect(records[0].text).toBe('שלום לכולם')
    expect(records[0].timestamp).toEqual(new Date(2025, 2, 14, 9, 15, 0))
  })

  it('parses an Android message with seconds', () => {
    const records = parseExport('14/3/25, 09:15:30 - Alice: hi')
    expect(records).toHaveLength(1)
    expect(records[0].sender).toBe('Alice')
    expect(records[0].text).toBe('hi')
    expect(records[0].timestamp).toEqual(new Date(2025, 2, 14, 9, 15, 30))
  })

  it('parses the iOS bracketed format', () => {
    const records = parseExport('[14/03/2025, 09:15:00] Alice: hello')
    expect(records).toHaveLength(1)
    expect(records[0].sender).toBe('Alice')
    expect(records[0].text).toBe('hello')
    expect(records[0].timestamp).toEqual(new Date(2025, 2, 14, 9, 15, 0))
  })

  it('parses an AM/PM time', () => {
    const records = parseExport('[14/03/2025, 09:15:00 PM] Alice: evening')
    expect(records[0].timestamp).toEqual(new Date(2025, 2, 14, 21, 15, 0))
  })

  it('converts 12:00 AM to midnight (hour 0)', () => {
    const records = parseExport('[14/03/2025, 12:00:00 AM] Alice: night owl')
    expect(records[0].timestamp).toEqual(new Date(2025, 2, 14, 0, 0, 0))
  })

  it('keeps 12:30 PM as noon (not 24:30)', () => {
    const records = parseExport('[14/03/2025, 12:30:00 PM] Alice: lunch')
    expect(records[0].timestamp).toEqual(new Date(2025, 2, 14, 12, 30, 0))
  })

  it('treats a message with no sender as a system message', () => {
    const records = parseExport('14/3/25, 09:20 - הודעות ושיחות מוצפנות מקצה לקצה')
    expect(records).toHaveLength(1)
    expect(records[0].sender).toBeNull()
    expect(records[0].text).toBe('הודעות ושיחות מוצפנות מקצה לקצה')
  })

  it('appends continuation lines to the previous message text', () => {
    const input = ['14/3/25, 09:15 - Alice: line one', 'line two', 'line three'].join('\n')
    const records = parseExport(input)
    expect(records).toHaveLength(1)
    expect(records[0].text).toBe('line one\nline two\nline three')
  })

  it('parses timestamps containing LRM/RLM direction marks', () => {
    const records = parseExport('14‏/3‏/25, 09:15 - Alice: hi')
    expect(records).toHaveLength(1)
    expect(records[0].timestamp).toEqual(new Date(2025, 2, 14, 9, 15, 0))
    expect(Number.isNaN(records[0].timestamp.getTime())).toBe(false)
  })

  it('keeps <Media omitted> verbatim as a normal message', () => {
    const records = parseExport('14/3/25, 09:15 - Alice: <Media omitted>')
    expect(records).toHaveLength(1)
    expect(records[0].sender).toBe('Alice')
    expect(records[0].text).toBe('<Media omitted>')
  })

  it('skips a malformed garbage line before any valid message', () => {
    const records = parseExport('not a message at all')
    expect(records).toEqual([])
  })

  it('returns an empty array for empty string input', () => {
    expect(parseExport('')).toEqual([])
  })

  it('skips leading blank lines silently', () => {
    const input = ['', '', '14/3/25, 09:15 - Alice: hi'].join('\n')
    const records = parseExport(input)
    expect(records).toHaveLength(1)
    expect(records[0].text).toBe('hi')
  })

  it('returns the correct record count for a multi-message fixture', () => {
    const input = [
      '14/3/25, 09:15 - Alice: first',
      '14/3/25, 09:16 - Bob: second',
      '14/3/25, 09:20 - הודעות מוצפנות',
      '14/3/25, 09:21 - Alice: fourth',
    ].join('\n')
    const records = parseExport(input)
    expect(records).toHaveLength(4)
    expect(records.map((r) => r.sender)).toEqual(['Alice', 'Bob', null, 'Alice'])
  })

  it('returns Date instances for timestamps', () => {
    const records = parseExport('14/3/25, 09:15 - Alice: hi')
    expect(records[0].timestamp).toBeInstanceOf(Date)
  })

  it('attaches a continuation to the correct prior message after a system message', () => {
    const input = [
      '14/3/25, 09:20 - system notice',
      'continued system line',
      '14/3/25, 09:21 - Alice: hello',
    ].join('\n')
    const records = parseExport(input)
    expect(records).toHaveLength(2)
    expect(records[0].sender).toBeNull()
    expect(records[0].text).toBe('system notice\ncontinued system line')
    expect(records[1].sender).toBe('Alice')
    expect(records[1].text).toBe('hello')
  })

  it('parses the en-dash separator variant', () => {
    const records = parseExport('14/3/25, 09:15 – Alice: hi')
    expect(records).toHaveLength(1)
    expect(records[0].sender).toBe('Alice')
    expect(records[0].text).toBe('hi')
  })

  it('parses a dot-separated date (European format)', () => {
    const records = parseExport('14.3.25, 09:15 - Alice: hi')
    expect(records).toHaveLength(1)
    expect(records[0].timestamp).toEqual(new Date(2025, 2, 14, 9, 15, 0))
  })

  it('strips carriage returns from CRLF line endings', () => {
    const records = parseExport('14/3/25, 09:15 - Alice: hi\r\n14/3/25, 09:16 - Bob: there\r\n')
    expect(records[0].text).toBe('hi')
    expect(records[1].text).toBe('there')
  })
})
