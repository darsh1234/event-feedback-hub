import { createClient, type Client } from 'graphql-ws'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import WebSocket from 'ws'

import { type Application, createApp } from './app.js'
import { type DatabaseConnection, openDatabase } from './database/connection.js'
import { initializeDatabase } from './database/initialize.js'
import { createGraphQLContext } from './graphql/context.js'
import {
  createFeedbackPubSub,
  type FeedbackPubSub,
} from './services/feedbackPubSub.js'

const workshopId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'
const webinarId = 'E-01JGFJJZZ832B8E8AQ4P779QN7'

const feedbackAddedSubscription = `
  subscription FeedbackAdded($eventId: ID!) {
    feedbackAdded(eventId: $eventId) {
      id
      event {
        id
        name
      }
      text
      rating
      createdAt
    }
  }
`

function listen(application: Application): Promise<number> {
  return new Promise((resolve, reject) => {
    application.httpServer.once('error', reject)
    application.httpServer.listen(0, '127.0.0.1', () => {
      application.httpServer.off('error', reject)
      const address = application.httpServer.address()

      if (address === null || typeof address === 'string') {
        reject(new Error('Expected the HTTP server to listen on a TCP port'))
        return
      }

      resolve(address.port)
    })
  })
}

function subscribeOnce(client: Client, eventId: string) {
  let dispose: () => void = () => undefined
  const result = new Promise<unknown>((resolve, reject) => {
    dispose = client.subscribe(
      {
        query: feedbackAddedSubscription,
        variables: { eventId },
      },
      {
        complete: () => {
          reject(new Error('Subscription completed before delivering feedback'))
        },
        error: reject,
        next: resolve,
      },
    )
  })

  return { dispose, result }
}

describe('server shell', () => {
  let application: Application
  let database: DatabaseConnection
  let onSubscription: (eventId: string) => void
  let webSocketClient: Client | undefined

  beforeEach(async () => {
    database = openDatabase(':memory:')
    initializeDatabase(database)
    onSubscription = () => undefined
    const inMemoryFeedbackPubSub = createFeedbackPubSub()
    const feedbackPubSub: FeedbackPubSub = {
      publish: (feedback) => inMemoryFeedbackPubSub.publish(feedback),
      subscribe: (eventId) => {
        const subscription = inMemoryFeedbackPubSub.subscribe(eventId)
        onSubscription(eventId)
        return subscription
      },
    }
    application = await createApp(
      createGraphQLContext(database, { feedbackPubSub }),
    )
  })

  afterEach(async () => {
    await webSocketClient?.dispose()
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

  it('streams committed feedback only to subscribers for its event', async () => {
    const port = await listen(application)
    const subscribedEvents = new Set<string>()
    const subscriptionsReady = new Promise<void>((resolve) => {
      onSubscription = (eventId) => {
        subscribedEvents.add(eventId)

        if (subscribedEvents.size === 2) {
          resolve()
        }
      }
    })
    webSocketClient = createClient({
      lazy: true,
      retryAttempts: 0,
      url: `ws://127.0.0.1:${port}/graphql`,
      webSocketImpl: WebSocket,
    })
    const workshopSubscription = subscribeOnce(webSocketClient, workshopId)
    const webinarSubscription = subscribeOnce(webSocketClient, webinarId)

    await subscriptionsReady

    const workshopResponse = await request(`http://127.0.0.1:${port}`)
      .post('/graphql')
      .send({
        query: `
          mutation SubmitFeedback($input: SubmitFeedbackInput!) {
            submitFeedback(input: $input) {
              errors { code }
            }
          }
        `,
        variables: {
          input: {
            eventId: workshopId,
            text: 'Live workshop feedback.',
            rating: 5,
          },
        },
      })

    expect(workshopResponse.status).toBe(200)
    expect(workshopResponse.body).toMatchObject({
      data: {
        submitFeedback: {
          errors: [],
        },
      },
    })
    expect(await workshopSubscription.result).toMatchObject({
      data: {
        feedbackAdded: {
          event: {
            id: workshopId,
            name: 'Document Intelligence Workshop',
          },
          text: 'Live workshop feedback.',
          rating: 5,
        },
      },
    })

    const webinarResponse = await request(`http://127.0.0.1:${port}`)
      .post('/graphql')
      .send({
        query: `
          mutation SubmitFeedback($input: SubmitFeedbackInput!) {
            submitFeedback(input: $input) {
              errors { code }
            }
          }
        `,
        variables: {
          input: {
            eventId: webinarId,
            text: 'Live webinar feedback.',
            rating: 4,
          },
        },
      })

    expect(webinarResponse.status).toBe(200)
    expect(webinarResponse.body).toMatchObject({
      data: {
        submitFeedback: {
          errors: [],
        },
      },
    })
    expect(await webinarSubscription.result).toMatchObject({
      data: {
        feedbackAdded: {
          event: {
            id: webinarId,
            name: 'Insurance Automation Webinar',
          },
          text: 'Live webinar feedback.',
          rating: 4,
        },
      },
    })

    workshopSubscription.dispose()
    webinarSubscription.dispose()
  })
})
