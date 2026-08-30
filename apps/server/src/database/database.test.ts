import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { decodeTime } from 'ulid'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createFeedbackId,
  isEventId,
  isFeedbackId,
} from '../features/identifiers.js'
import { type DatabaseConnection, openDatabase } from './connection.js'
import { initializeDatabase, resetDatabaseFile } from './initialize.js'

const workshopId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'
const emptyEventIds = [
  'E-01JGFJJZZ832B8E8AQ4P779QN7',
  'E-01JGFJK0YGS77JRTDAXX7DB3BM',
] as const

interface CountRow {
  count: number
}

interface EventRow {
  id: string
  name: string
}

interface SeedFeedbackRow {
  createdAt: string
  id: string
}

interface TimestampRow {
  createdAt: string
}

interface RatingCountRow {
  rating: number
  count: number
}

interface IndexRow {
  name: string
}

function insertFeedback(
  database: DatabaseConnection,
  {
    id = createFeedbackId(),
    eventId = workshopId,
    text = 'A valid feedback response.',
    rating = 5,
    createdAt = new Date().toISOString(),
  }: {
    id?: string
    eventId?: string
    text?: string
    rating?: number
    createdAt?: string
  } = {},
): void {
  database
    .prepare<[string, string, string, number, string]>(
      `
        INSERT INTO feedback (id, event_id, text, rating, created_at)
        VALUES (?, ?, ?, ?, ?)
      `,
    )
    .run(id, eventId, text, rating, createdAt)
}

describe('database schema and seed data', () => {
  let database: DatabaseConnection

  beforeEach(() => {
    database = openDatabase(':memory:')
    initializeDatabase(database)
  })

  afterEach(() => {
    database.close()
  })

  it('seeds the predefined events with valid event IDs', () => {
    const events = database
      .prepare<[], EventRow>('SELECT id, name FROM events ORDER BY id')
      .all()

    expect(events).toEqual([
      {
        id: workshopId,
        name: 'Document Intelligence Workshop',
      },
      {
        id: emptyEventIds[0],
        name: 'Insurance Automation Webinar',
      },
      {
        id: emptyEventIds[1],
        name: 'Insurtech Product Conference',
      },
    ])
    expect(events.every(({ id }) => isEventId(id))).toBe(true)
  })

  it('seeds a pagination-sized rating distribution and two empty events', () => {
    const feedback = database
      .prepare<[], SeedFeedbackRow>(
        'SELECT id, created_at AS createdAt FROM feedback ORDER BY id',
      )
      .all()
    const ratingCounts = database
      .prepare<[string], RatingCountRow>(
        `
          SELECT rating, COUNT(*) AS count
          FROM feedback
          WHERE event_id = ?
          GROUP BY rating
          ORDER BY rating
        `,
      )
      .all(workshopId)

    expect(feedback).toHaveLength(25)
    expect(feedback.every(({ id }) => isFeedbackId(id))).toBe(true)
    expect(
      feedback.every(
        ({ createdAt, id }) =>
          new Date(decodeTime(id.slice(2))).toISOString() === createdAt,
      ),
    ).toBe(true)
    expect(ratingCounts).toEqual([
      { rating: 1, count: 5 },
      { rating: 2, count: 5 },
      { rating: 3, count: 5 },
      { rating: 4, count: 5 },
      { rating: 5, count: 5 },
    ])

    const countFeedbackForEvent = database.prepare<[string], CountRow>(
      'SELECT COUNT(*) AS count FROM feedback WHERE event_id = ?',
    )

    for (const eventId of emptyEventIds) {
      expect(countFeedbackForEvent.get(eventId)).toEqual({ count: 0 })
    }
  })

  it('enables foreign keys and creates the planned composite indexes', () => {
    expect(database.pragma('foreign_keys', { simple: true })).toBe(1)

    const indexes = database
      .prepare<[], IndexRow>(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'index' AND tbl_name = 'feedback'
          ORDER BY name
        `,
      )
      .all()
      .map(({ name }) => name)

    expect(indexes).toEqual(
      expect.arrayContaining([
        'feedback_event_id_idx',
        'feedback_event_rating_id_idx',
      ]),
    )
  })

  it('accepts valid feedback and rejects invalid foreign keys', () => {
    const createdAt = '2026-08-29T12:34:56.789Z'

    insertFeedback(database, { createdAt })
    insertFeedback(database, { text: 'x'.repeat(1000) })

    const count = database
      .prepare<[], CountRow>('SELECT COUNT(*) AS count FROM feedback')
      .get()
    const storedTimestamp = database
      .prepare<[string], TimestampRow>(
        'SELECT created_at AS createdAt FROM feedback WHERE created_at = ?',
      )
      .get(createdAt)

    expect(count).toEqual({ count: 27 })
    expect(storedTimestamp).toEqual({ createdAt })
    expect(() =>
      insertFeedback(database, {
        eventId: 'E-01JGFJJZ000JX0K3SAK84YSW4S',
      }),
    ).toThrow()
  })

  it('rejects malformed IDs, invalid text, ratings, and timestamps', () => {
    expect(() =>
      insertFeedback(database, {
        id: 'E-01JGFJM06GDW96TSJ73FAN8F1T',
      }),
    ).toThrow()
    expect(() => insertFeedback(database, { text: '   ' })).toThrow()
    expect(() => insertFeedback(database, { text: 'x'.repeat(1001) })).toThrow()
    expect(() => insertFeedback(database, { rating: 0 })).toThrow()
    expect(() => insertFeedback(database, { rating: 6 })).toThrow()
    expect(() =>
      insertFeedback(database, { createdAt: '2025-02-30T00:00:00.000Z' }),
    ).toThrow()
    expect(() =>
      insertFeedback(database, { createdAt: '2025-01-01T00:00:00Z' }),
    ).toThrow()
    expect(() =>
      insertFeedback(database, { createdAt: 'not-a-timestamp' }),
    ).toThrow()

    expect(() =>
      database
        .prepare<[string, string, string, number]>(
          `
            INSERT INTO feedback (id, event_id, text, rating)
            VALUES (?, ?, ?, ?)
          `,
        )
        .run(
          createFeedbackId(),
          workshopId,
          'Feedback without a timestamp.',
          5,
        ),
    ).toThrow()
  })
})

describe('database setup command', () => {
  it('replaces and deterministically seeds a local database file', () => {
    const temporaryDirectory = mkdtempSync(
      join(tmpdir(), 'event-feedback-hub-'),
    )
    const databasePath = join(temporaryDirectory, 'test.db')

    try {
      resetDatabaseFile(databasePath)
      resetDatabaseFile(databasePath)

      expect(existsSync(databasePath)).toBe(true)

      const database = openDatabase(databasePath)

      try {
        const eventCount = database
          .prepare<[], CountRow>('SELECT COUNT(*) AS count FROM events')
          .get()
        const feedbackCount = database
          .prepare<[], CountRow>('SELECT COUNT(*) AS count FROM feedback')
          .get()

        expect(eventCount).toEqual({ count: 3 })
        expect(feedbackCount).toEqual({ count: 25 })
      } finally {
        database.close()
      }
    } finally {
      rmSync(temporaryDirectory, { force: true, recursive: true })
    }
  })
})
