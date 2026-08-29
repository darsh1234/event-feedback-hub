import type { DatabaseConnection } from '../database/connection.js'

export interface EventRecord {
  id: string
  name: string
}

export interface EventRepository {
  exists(id: string): boolean
  findById(id: string): EventRecord | undefined
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
  const findEventById = database.prepare<[string], EventRecord>(
    `
      SELECT id, name
      FROM events
      WHERE id = ?
    `,
  )

  return {
    exists: (id) => findEventById.get(id) !== undefined,
    findById: (id) => findEventById.get(id),
    list: () => listEvents.all(),
  }
}
