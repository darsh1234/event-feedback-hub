import type { DatabaseConnection } from '../database/connection.js'

export interface EventRecord {
  id: string
  name: string
}

export interface EventRepository {
  list(): EventRecord[]
}

export function createEventRepository(
  database: DatabaseConnection,
): EventRepository {
  const listEvents = database.prepare<[], EventRecord>(
    `
      SELECT id, name
      FROM events
      ORDER BY name, id
    `,
  )

  return {
    list: () => listEvents.all(),
  }
}
