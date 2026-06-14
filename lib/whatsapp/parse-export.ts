export interface ParsedMessage {
  timestamp: Date
  sender: string | null // null for system messages
  text: string
}

// LRM (U+200E), RLM (U+200F), ZWJ (U+200D) direction marks WhatsApp injects around RTL text.
const DIRECTION_MARKS = /[‎‏‍]/g

// A message-start line: optional [brackets], date, time (optional seconds, optional AM/PM),
// then the remainder (sender + text, or system text). Android uses a ` - ` separator;
// iOS uses the closing bracket plus a space, so the hyphen/en-dash is optional.
const MSG_LINE_RE =
  /^\[?(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}),?\s(\d{1,2}:\d{2}(?::\d{2})?(?:\s?[APap]\.?[Mm]\.?)?)\]?\s?(?:[-–]\s)?([\s\S]*)$/

// Splits a remainder into sender and text. Non-greedy author capture stops at the first ': '.
const AUTHOR_RE = /^(.+?):\s([\s\S]*)$/

function parseDate(dateStr: string, timeStr: string): Date {
  const [day, month, yearRaw] = dateStr.split(/[/.\-]/).map((p) => parseInt(p, 10))
  const year = yearRaw < 100 ? yearRaw + 2000 : yearRaw

  const ampmMatch = timeStr.match(/([APap])\.?[Mm]\.?$/)
  const timeDigits = timeStr.replace(/\s?[APap]\.?[Mm]\.?$/, '').trim()
  const [hoursRaw, minutes, seconds] = timeDigits.split(':').map((p) => parseInt(p, 10))

  let hours = hoursRaw
  if (ampmMatch) {
    const isPm = ampmMatch[1].toLowerCase() === 'p'
    if (isPm && hours < 12) hours += 12
    if (!isPm && hours === 12) hours = 0
  }

  return new Date(year, month - 1, day, hours, minutes, seconds || 0)
}

export function parseExport(content: string): ParsedMessage[] {
  const messages: ParsedMessage[] = []
  const lines = content.split('\n')
  let current: ParsedMessage | null = null

  for (const rawLine of lines) {
    const line = rawLine.replace(DIRECTION_MARKS, '')
    const match = line.match(MSG_LINE_RE)

    if (match) {
      if (current) messages.push(current)

      const [, dateStr, timeStr, remainder] = match
      const timestamp = parseDate(dateStr, timeStr)
      const authorMatch = remainder.match(AUTHOR_RE)

      if (authorMatch) {
        current = { timestamp, sender: authorMatch[1], text: authorMatch[2] }
      } else {
        current = { timestamp, sender: null, text: remainder }
      }
    } else if (current) {
      // Continuation of a multi-line message.
      current.text += '\n' + line
    }
    // Otherwise: malformed line before any message — skip silently.
  }

  if (current) messages.push(current)

  return messages
}
