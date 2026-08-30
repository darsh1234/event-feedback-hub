import { describe, expect, it } from 'vitest'

import {
  createEventId,
  createFeedbackId,
  isEventId,
  isFeedbackId,
} from './identifiers.js'

describe('prefixed ULIDs', () => {
  it('creates valid type-specific identifiers', () => {
    const eventId = createEventId()
    const feedbackId = createFeedbackId()

    expect(eventId).toHaveLength(28)
    expect(feedbackId).toHaveLength(28)
    expect(isEventId(eventId)).toBe(true)
    expect(isFeedbackId(feedbackId)).toBe(true)
    expect(isFeedbackId(eventId)).toBe(false)
    expect(isEventId(feedbackId)).toBe(false)
  })

  it('preserves generation order within the same millisecond', () => {
    const seedTime = Date.UTC(2099, 0, 1)
    const firstId = createFeedbackId(seedTime)
    const secondId = createFeedbackId(seedTime)

    expect(secondId > firstId).toBe(true)
  })

  it('rejects malformed identifiers', () => {
    expect(isEventId('E-not-a-ulid')).toBe(false)
    expect(isFeedbackId('F-not-a-ulid')).toBe(false)
    expect(isEventId('F-01JGFJK8RGN7CW5XQXAZSR44CA')).toBe(false)
  })
})
