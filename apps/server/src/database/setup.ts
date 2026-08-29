import { resetDatabaseFile } from './initialize.js'

const databasePath = resetDatabaseFile()

console.log(`Created and seeded SQLite database at ${databasePath}`)
