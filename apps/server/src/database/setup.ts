import { resetDatabaseFile } from './initialize.js'

// Keep local setup reproducible by rebuilding the database from source files.
const databasePath = resetDatabaseFile()

console.log(`Created and seeded SQLite database at ${databasePath}`)
