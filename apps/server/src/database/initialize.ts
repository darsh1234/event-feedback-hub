import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import type { DatabaseConnection } from './connection.js'
import { openDatabase } from './connection.js'

const schemaPath = resolve(import.meta.dirname, '../../sql/schema.sql')
const seedPath = resolve(import.meta.dirname, '../../sql/seed.sql')

/** Default runtime location for the generated local database. */
export const defaultDatabasePath = resolve(
  import.meta.dirname,
  '../../data/event-feedback.db',
)

const schemaSql = readFileSync(schemaPath, 'utf8')
const seedSql = readFileSync(seedPath, 'utf8')

/** Applies the committed schema and demonstration data atomically. */
export function initializeDatabase(database: DatabaseConnection): void {
  const initialize = database.transaction(() => {
    database.exec(schemaSql)
    database.exec(seedSql)
  })

  initialize.immediate()
}

/**
 * Recreates a local SQLite file from the committed schema and seed scripts.
 * This destructive reset is reserved for the explicit local setup command.
 */
export function resetDatabaseFile(databasePath = defaultDatabasePath): string {
  const resolvedDatabasePath = resolve(databasePath)
  mkdirSync(dirname(resolvedDatabasePath), { recursive: true })

  // SQLite can leave write-ahead-log sidecars beside the primary file.
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
