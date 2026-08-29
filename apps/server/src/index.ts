import { createApp } from './app.js'
import { openDatabase } from './database/connection.js'
import { defaultDatabasePath } from './database/initialize.js'
import { createGraphQLContext } from './graphql/context.js'

// Compose the long-lived database and GraphQL context once for both transports.
const port = 4000
const database = openDatabase(defaultDatabasePath)
const context = createGraphQLContext(database)
const { httpServer } = await createApp(context)

httpServer.listen(port, () => {
  console.log(
    `Event Feedback Hub API listening on http://localhost:${port}/graphql`,
  )
})
