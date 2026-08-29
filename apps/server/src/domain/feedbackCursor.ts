import { isFeedbackId } from './ids.js'

/** Identifies malformed or noncanonical feedback pagination cursors. */
export class InvalidFeedbackCursorError extends Error {
  constructor() {
    super('Invalid feedback cursor')
    this.name = 'InvalidFeedbackCursorError'
  }
}

/** Encodes a validated feedback ID as an opaque, unpadded base64url cursor. */
export function encodeFeedbackCursor(feedbackId: string): string {
  if (!isFeedbackId(feedbackId)) {
    throw new InvalidFeedbackCursorError()
  }

  return Buffer.from(feedbackId, 'utf8').toString('base64url')
}

/**
 * Decodes a cursor only when re-encoding produces the exact canonical value
 * and the payload is a valid feedback ID.
 */
export function decodeFeedbackCursor(cursor: string): string {
  const feedbackId = Buffer.from(cursor, 'base64url').toString('utf8')
  const canonicalCursor = Buffer.from(feedbackId, 'utf8').toString('base64url')

  if (canonicalCursor !== cursor || !isFeedbackId(feedbackId)) {
    throw new InvalidFeedbackCursorError()
  }

  return feedbackId
}
