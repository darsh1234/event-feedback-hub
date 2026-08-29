import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { type Application, createApp } from './app.js'
import { type DatabaseConnection, openDatabase } from './database/connection.js'
import { initializeDatabase } from './database/initialize.js'
import { createGraphQLContext } from './graphql/context.js'

describe('server shell', () => {
  let application: Application
  let database: DatabaseConnection

  beforeEach(async () => {
    database = openDatabase(':memory:')
    initializeDatabase(database)
    application = await createApp(createGraphQLContext(database))
  })

  afterEach(async () => {
    await application.graphQLServer.stop()
    database.close()
  })

  it('reports that the API process is healthy', async () => {
    const response = await request(application.app).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      service: 'event-feedback-hub-api',
      status: 'ok',
    })
  })

  it('serves GraphQL operations over HTTP', async () => {
    const response = await request(application.app)
      .post('/graphql')
      .send({
        query: `
          query Events {
            events {
              id
              name
            }
          }
        `,
      })

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
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
      },
    })
  })
})
