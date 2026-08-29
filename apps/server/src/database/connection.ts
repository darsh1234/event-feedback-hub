import Database from 'better-sqlite3'

export type DatabaseConnection = Database.Database

/** Opens a SQLite connection with referential-integrity checks enabled. */
export function openDatabase(filename: string): DatabaseConnection {
  const database = new Database(filename)
  database.pragma('foreign_keys = ON')

  return database
}
