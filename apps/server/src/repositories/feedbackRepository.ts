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

export interface FeedbackRepository {
  create(input: CreateFeedbackRecord): FeedbackRecord
}

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

  return {
    create: ({ id, eventId, text, rating, createdAt }) => {
      const feedback = insertFeedback.get(id, eventId, text, rating, createdAt)

      if (feedback === undefined) {
        throw new Error('SQLite did not return the inserted feedback')
      }

      return feedback
    },
  }
}
