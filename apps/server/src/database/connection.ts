import Database from 'better-sqlite3'

export type DatabaseConnection = Database.Database

export function openDatabase(filename: string): DatabaseConnection {
  const database = new Database(filename)
  database.pragma('foreign_keys = ON')

  return database
}
