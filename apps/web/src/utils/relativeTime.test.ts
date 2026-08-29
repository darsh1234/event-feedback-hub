import { describe, expect, it } from 'vitest'

import { formatRelativeTime } from './relativeTime'

const now = Date.parse('2026-08-29T20:00:00.000Z')

describe('formatRelativeTime', () => {
  it.each([
    ['2026-08-29T19:59:45.000Z', 'Just now'],
    ['2026-08-29T19:55:00.000Z', '5 minutes ago'],
    ['2026-08-29T18:00:00.000Z', '2 hours ago'],
    ['2026-08-26T20:00:00.000Z', '3 days ago'],
    ['2026-06-29T20:00:00.000Z', '2 months ago'],
    ['2025-08-29T20:00:00.000Z', '1 year ago'],
  ])('formats %s as %s', (createdAt, expected) => {
    expect(formatRelativeTime(createdAt, now)).toBe(expected)
  })

  it('handles invalid and future values safely', () => {
    expect(formatRelativeTime('not-a-date', now)).toBe('Unknown time')
    expect(formatRelativeTime('2026-08-30T20:00:00.000Z', now)).toBe('Just now')
  })
})
