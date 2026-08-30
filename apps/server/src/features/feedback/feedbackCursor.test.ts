import { describe, expect, it } from 'vitest'

import {
  decodeFeedbackCursor,
  encodeFeedbackCursor,
  InvalidFeedbackCursorError,
} from './feedbackCursor.js'

const feedbackId = 'F-01JGFJM06GDW96TSJ73FAN8F1T'

describe('feedback cursor', () => {
  it('round-trips a feedback ID through an opaque base64url value', () => {
    const cursor = encodeFeedbackCursor(feedbackId)

    expect(cursor).not.toBe(feedbackId)
    expect(cursor).not.toContain('F-')
    expect(decodeFeedbackCursor(cursor)).toBe(feedbackId)
  })

  it.each([
    '',
    'not-base64url!',
    Buffer.from('not-a-feedback-id').toString('base64url'),
    Buffer.from('E-01JGFJJZ000JX0K3SAK84YSW4T').toString('base64url'),
    `${encodeFeedbackCursor(feedbackId)}=`,
  ])('rejects malformed or noncanonical cursor %s', (cursor) => {
    expect(() => decodeFeedbackCursor(cursor)).toThrow(
      InvalidFeedbackCursorError,
    )
  })

  it('rejects non-feedback IDs when encoding', () => {
    expect(() => encodeFeedbackCursor('E-01JGFJJZ000JX0K3SAK84YSW4T')).toThrow(
      InvalidFeedbackCursorError,
    )
  })
})
