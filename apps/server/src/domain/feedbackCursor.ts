import { isFeedbackId } from './ids.js'

export class InvalidFeedbackCursorError extends Error {
  constructor() {
    super('Invalid feedback cursor')
    this.name = 'InvalidFeedbackCursorError'
  }
}

export function encodeFeedbackCursor(feedbackId: string): string {
  if (!isFeedbackId(feedbackId)) {
    throw new InvalidFeedbackCursorError()
  }

  return Buffer.from(feedbackId, 'utf8').toString('base64url')
}

export function decodeFeedbackCursor(cursor: string): string {
  const feedbackId = Buffer.from(cursor, 'base64url').toString('utf8')
  const canonicalCursor = Buffer.from(feedbackId, 'utf8').toString('base64url')

  if (canonicalCursor !== cursor || !isFeedbackId(feedbackId)) {
    throw new InvalidFeedbackCursorError()
  }

  return feedbackId
}
