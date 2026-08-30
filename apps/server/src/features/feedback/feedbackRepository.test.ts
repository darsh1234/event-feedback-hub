import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type DatabaseConnection,
  openDatabase,
} from '../../database/connection.js'
import { initializeDatabase } from '../../database/initialize.js'
import { createFeedbackId } from '../identifiers.js'
import {
  type FeedbackRepository,
  createFeedbackRepository,
} from './feedbackRepository.js'

const workshopId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'

describe('feedback repository', () => {
  let database: DatabaseConnection
  let feedbackRepository: FeedbackRepository

  beforeEach(() => {
    database = openDatabase(':memory:')
    initializeDatabase(database)
    feedbackRepository = createFeedbackRepository(database)
  })

  afterEach(() => {
    database.close()
  })

  it('inserts feedback and returns the persisted database row', () => {
    const createdAt = '2100-01-01T00:00:00.000Z'
    const feedback = {
      id: createFeedbackId(Date.parse(createdAt)),
      eventId: workshopId,
      text: 'A clear and useful workshop.',
      rating: 5,
      createdAt,
    }

    expect(feedbackRepository.create(feedback)).toEqual(feedback)
    expect(
      database
        .prepare<[string], typeof feedback>(
          `
            SELECT
              id,
              event_id AS eventId,
              text,
              rating,
              created_at AS createdAt
            FROM feedback
            WHERE id = ?
          `,
        )
        .get(feedback.id),
    ).toEqual(feedback)
  })

  it('allows database integrity failures to propagate', () => {
    expect(() =>
      feedbackRepository.create({
        id: createFeedbackId(),
        eventId: 'E-01JGFJJZ000JX0K3SAK84YSW4S',
        text: 'Feedback for an event that does not exist.',
        rating: 5,
        createdAt: new Date().toISOString(),
      }),
    ).toThrow()
  })

  it('returns newest-first pages using the first-plus-one boundary', () => {
    const firstPage = feedbackRepository.list({
      eventId: workshopId,
      first: 20,
    })

    expect(firstPage.items).toHaveLength(20)
    expect(firstPage.hasNextPage).toBe(true)
    expect(firstPage.items.map(({ text }) => text)).toEqual(
      Array.from(
        { length: 20 },
        (_value, index) =>
          `Demo feedback ${String(25 - index).padStart(2, '0')} for rating ${Math.ceil(
            (25 - index) / 5,
          )}.`,
      ),
    )
    const firstPageEndId = firstPage.items.at(-1)?.id

    if (firstPageEndId === undefined) {
      throw new Error('Expected the first feedback page to have an end ID')
    }

    const secondPage = feedbackRepository.list({
      eventId: workshopId,
      first: 20,
      afterId: firstPageEndId,
    })

    expect(secondPage.items.map(({ text }) => text)).toEqual([
      'Demo feedback 05 for rating 1.',
      'Demo feedback 04 for rating 1.',
      'Demo feedback 03 for rating 1.',
      'Demo feedback 02 for rating 1.',
      'Demo feedback 01 for rating 1.',
    ])
    expect(secondPage.hasNextPage).toBe(false)
  })

  it('filters pages by event and rating', () => {
    const ratingPage = feedbackRepository.list({
      eventId: workshopId,
      rating: 3,
      first: 3,
    })

    expect(ratingPage.items.map(({ text }) => text)).toEqual([
      'Demo feedback 15 for rating 3.',
      'Demo feedback 14 for rating 3.',
      'Demo feedback 13 for rating 3.',
    ])
    expect(ratingPage.hasNextPage).toBe(true)
    const ratingPageEndId = ratingPage.items.at(-1)?.id

    if (ratingPageEndId === undefined) {
      throw new Error('Expected the filtered feedback page to have an end ID')
    }

    const remainingRatingPage = feedbackRepository.list({
      eventId: workshopId,
      rating: 3,
      first: 3,
      afterId: ratingPageEndId,
    })

    expect(remainingRatingPage.items.map(({ text }) => text)).toEqual([
      'Demo feedback 12 for rating 3.',
      'Demo feedback 11 for rating 3.',
    ])
    expect(remainingRatingPage.hasNextPage).toBe(false)

    expect(
      feedbackRepository.list({
        eventId: 'E-01JGFJJZZ832B8E8AQ4P779QN7',
        first: 20,
      }),
    ).toEqual({ items: [], hasNextPage: false })
  })

  it('keeps an existing cursor boundary stable after a newer insertion', () => {
    const firstPage = feedbackRepository.list({
      eventId: workshopId,
      first: 3,
    })
    const cursorId = firstPage.items.at(-1)?.id

    expect(firstPage.items.map(({ text }) => text)).toEqual([
      'Demo feedback 25 for rating 5.',
      'Demo feedback 24 for rating 5.',
      'Demo feedback 23 for rating 5.',
    ])
    expect(cursorId).toBeDefined()

    if (cursorId === undefined) {
      throw new Error('Expected the first feedback page to have a cursor ID')
    }

    feedbackRepository.create({
      id: createFeedbackId(Date.UTC(2100, 0, 2)),
      eventId: workshopId,
      text: 'Newer feedback inserted between page requests.',
      rating: 5,
      createdAt: '2100-01-02T00:00:00.000Z',
    })

    const nextPage = feedbackRepository.list({
      eventId: workshopId,
      first: 3,
      afterId: cursorId,
    })

    expect(nextPage.items.map(({ text }) => text)).toEqual([
      'Demo feedback 22 for rating 5.',
      'Demo feedback 21 for rating 5.',
      'Demo feedback 20 for rating 4.',
    ])
    expect(nextPage.items.some(({ id }) => id === cursorId)).toBe(false)
    expect(nextPage.hasNextPage).toBe(true)
  })
})
