import { createApp } from './app.js'
import { openDatabase } from './database/connection.js'
import { defaultDatabasePath } from './database/initialize.js'
import { createGraphQLContext } from './graphql/context.js'

const port = 4000
const database = openDatabase(defaultDatabasePath)
const context = createGraphQLContext(database)
const { app } = await createApp(context)

app.listen(port, () => {
  console.log(
    `Event Feedback Hub API listening on http://localhost:${port}/graphql`,
  )
})
