import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import type { DatabaseConnection } from './connection.js'
import { openDatabase } from './connection.js'

const schemaPath = resolve(import.meta.dirname, '../../database/schema.sql')
const seedPath = resolve(import.meta.dirname, '../../database/seed.sql')

export const defaultDatabasePath = resolve(
  import.meta.dirname,
  '../../data/event-feedback.db',
)

const schemaSql = readFileSync(schemaPath, 'utf8')
const seedSql = readFileSync(seedPath, 'utf8')

export function initializeDatabase(database: DatabaseConnection): void {
  const initialize = database.transaction(() => {
    database.exec(schemaSql)
    database.exec(seedSql)
  })

  initialize.immediate()
}

export function resetDatabaseFile(databasePath = defaultDatabasePath): string {
  const resolvedDatabasePath = resolve(databasePath)
  mkdirSync(dirname(resolvedDatabasePath), { recursive: true })

  for (const suffix of ['', '-shm', '-wal']) {
    rmSync(`${resolvedDatabasePath}${suffix}`, { force: true })
  }

  const database = openDatabase(resolvedDatabasePath)

  try {
    initializeDatabase(database)
  } finally {
    database.close()
  }

  return resolvedDatabasePath
}
