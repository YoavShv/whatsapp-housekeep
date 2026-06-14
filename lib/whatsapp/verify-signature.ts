import { createHmac, timingSafeEqual } from 'crypto'

export function verifySignature(secret: string, payload: string, header: string): boolean {
  if (!secret) return false
  if (!header.startsWith('sha256=')) return false
  const received = header.slice('sha256='.length)
  const expected = createHmac('sha256', secret).update(payload, 'utf8').digest('hex')
  const expectedBuf = Buffer.from(expected, 'hex')
  const receivedBuf = Buffer.from(received, 'hex')
  // Guard buffer lengths (not string lengths) — non-hex chars in received cause Buffer.from to
  // silently produce a shorter buffer, making timingSafeEqual throw on mismatched byte lengths.
  if (receivedBuf.length !== expectedBuf.length) return false
  return timingSafeEqual(expectedBuf, receivedBuf)
}
