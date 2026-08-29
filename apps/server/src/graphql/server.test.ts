import type { ApolloServer } from '@apollo/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type DatabaseConnection,
  openDatabase,
} from '../database/connection.js'
import { initializeDatabase } from '../database/initialize.js'
import { type GraphQLContext, createGraphQLContext } from './context.js'
import { createGraphQLServer } from './server.js'

describe('GraphQL events query', () => {
  let context: GraphQLContext
  let database: DatabaseConnection
  let graphQLServer: ApolloServer<GraphQLContext>

  beforeEach(() => {
    database = openDatabase(':memory:')
    initializeDatabase(database)
    context = createGraphQLContext(database)
    graphQLServer = createGraphQLServer()
  })

  afterEach(async () => {
    await graphQLServer.stop()
    database.close()
  })

  it('returns seeded events through the real resolver and repository', async () => {
    const response = await graphQLServer.executeOperation(
      {
        query: `
          query Events {
            events {
              id
              name
            }
          }
        `,
      },
      { contextValue: context },
    )

    expect(response.body.kind).toBe('single')

    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response')
    }

    expect(response.body.singleResult.errors).toBeUndefined()
    expect(response.body.singleResult.data).toEqual({
      events: [
        {
          id: 'E-01JGFJJZ000JX0K3SAK84YSW4T',
          name: 'Document Intelligence Workshop',
        },
        {
          id: 'E-01JGFJJZZ832B8E8AQ4P779QN7',
          name: 'Insurance Automation Webinar',
        },
        {
          id: 'E-01JGFJK0YGS77JRTDAXX7DB3BM',
          name: 'Insurtech Product Conference',
        },
      ],
    })
  })
})
