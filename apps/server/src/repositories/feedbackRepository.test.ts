import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type DatabaseConnection,
  openDatabase,
} from '../database/connection.js'
import { initializeDatabase } from '../database/initialize.js'
import { createFeedbackId } from '../domain/ids.js'
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
})
