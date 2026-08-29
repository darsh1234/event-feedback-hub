import type { DatabaseConnection } from '../database/connection.js'

export interface FeedbackRecord {
  id: string
  eventId: string
  text: string
  rating: number
  createdAt: string
}

export interface CreateFeedbackRecord {
  id: string
  eventId: string
  text: string
  rating: number
  createdAt: string
}

export interface ListFeedbackRecordsInput {
  eventId: string
  rating?: number
  first: number
  afterId?: string
}

export interface FeedbackRecordPage {
  items: FeedbackRecord[]
  hasNextPage: boolean
}

/** Persistence contract for appending and paging feedback records. */
export interface FeedbackRepository {
  create(input: CreateFeedbackRecord): FeedbackRecord
  list(input: ListFeedbackRecordsInput): FeedbackRecordPage
}

/**
 * Provides append-only feedback persistence and stable newest-first cursor
 * pagination through parameterized SQLite statements.
 */
export function createFeedbackRepository(
  database: DatabaseConnection,
): FeedbackRepository {
  const insertFeedback = database.prepare<
    [string, string, string, number, string],
    FeedbackRecord
  >(
    `
      INSERT INTO feedback (id, event_id, text, rating, created_at)
      VALUES (?, ?, ?, ?, ?)
      RETURNING
        id,
        event_id AS eventId,
        text,
        rating,
        created_at AS createdAt
    `,
  )
  const listByEvent = database.prepare<[string, number], FeedbackRecord>(
    `
      SELECT
        id,
        event_id AS eventId,
        text,
        rating,
        created_at AS createdAt
      FROM feedback
      WHERE event_id = ?
      ORDER BY id DESC
      LIMIT ?
    `,
  )
  const listByEventAfter = database.prepare<
    [string, string, number],
    FeedbackRecord
  >(
    `
      SELECT
        id,
        event_id AS eventId,
        text,
        rating,
        created_at AS createdAt
      FROM feedback
      WHERE event_id = ? AND id < ?
      ORDER BY id DESC
      LIMIT ?
    `,
  )
  const listByEventAndRating = database.prepare<
    [string, number, number],
    FeedbackRecord
  >(
    `
      SELECT
        id,
        event_id AS eventId,
        text,
        rating,
        created_at AS createdAt
      FROM feedback
      WHERE event_id = ? AND rating = ?
      ORDER BY id DESC
      LIMIT ?
    `,
  )
  const listByEventAndRatingAfter = database.prepare<
    [string, number, string, number],
    FeedbackRecord
  >(
    `
      SELECT
        id,
        event_id AS eventId,
        text,
        rating,
        created_at AS createdAt
      FROM feedback
      WHERE event_id = ? AND rating = ? AND id < ?
      ORDER BY id DESC
      LIMIT ?
    `,
  )

  return {
    create: ({ id, eventId, text, rating, createdAt }) => {
      const feedback = insertFeedback.get(id, eventId, text, rating, createdAt)

      if (feedback === undefined) {
        throw new Error('SQLite did not return the inserted feedback')
      }

      return feedback
    },
    list: ({ eventId, rating, first, afterId }) => {
      // One extra row determines hasNextPage without a separate COUNT query.
      const limit = first + 1
      let rows: FeedbackRecord[]

      if (rating !== undefined && afterId !== undefined) {
        rows = listByEventAndRatingAfter.all(eventId, rating, afterId, limit)
      } else if (rating !== undefined) {
        rows = listByEventAndRating.all(eventId, rating, limit)
      } else if (afterId !== undefined) {
        rows = listByEventAfter.all(eventId, afterId, limit)
      } else {
        rows = listByEvent.all(eventId, limit)
      }

      return {
        items: rows.slice(0, first),
        hasNextPage: rows.length > first,
      }
    },
  }
}
