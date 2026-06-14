import { createHmac, timingSafeEqual } from 'crypto'

export function verifySignature(secret: string, payload: string, header: string): boolean {
  if (!header.startsWith('sha256=')) return false
  const received = header.slice('sha256='.length)
  const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
  // HMAC-SHA256 is always 64 hex chars; length mismatch means invalid/tampered header.
  // Also guards timingSafeEqual, which throws on differing buffer lengths.
  if (received.length !== expected.length) return false
  return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
}
