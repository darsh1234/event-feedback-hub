import type { ApolloServer } from '@apollo/server'
import { decodeTime } from 'ulid'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type DatabaseConnection,
  openDatabase,
} from '../database/connection.js'
import { initializeDatabase } from '../database/initialize.js'
import type { FeedbackRepository } from '../repositories/feedbackRepository.js'
import { createFeedbackService } from '../services/feedbackService.js'
import { type GraphQLContext, createGraphQLContext } from './context.js'
import { createGraphQLServer } from './server.js'

const workshopId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'
const submittedAt = Date.UTC(2100, 0, 1)

interface CountRow {
  count: number
}

interface StoredFeedbackRow {
  createdAt: string
  eventId: string
  id: string
  rating: number
  text: string
}

const submitFeedbackMutation = `
  mutation SubmitFeedback($input: SubmitFeedbackInput!) {
    submitFeedback(input: $input) {
      feedback {
        id
        event {
          id
          name
        }
        text
        rating
        createdAt
      }
      errors {
        field
        code
        message
      }
    }
  }
`

describe('GraphQL API', () => {
  let context: GraphQLContext
  let database: DatabaseConnection
  let graphQLServer: ApolloServer<GraphQLContext>

  beforeEach(() => {
    database = openDatabase(':memory:')
    initializeDatabase(database)
    context = createGraphQLContext(database, { now: () => submittedAt })
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

  it('validates, trims, persists, and returns anonymous feedback', async () => {
    const response = await graphQLServer.executeOperation(
      {
        query: submitFeedbackMutation,
        variables: {
          input: {
            eventId: workshopId,
            text: '  A clear and useful workshop.  ',
            rating: 5,
          },
        },
      },
      { contextValue: context },
    )

    expect(response.body.kind).toBe('single')

    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response')
    }

    const storedFeedback = database
      .prepare<[], StoredFeedbackRow>(
        `
          SELECT
            id,
            event_id AS eventId,
            text,
            rating,
            created_at AS createdAt
          FROM feedback
          WHERE text = 'A clear and useful workshop.'
        `,
      )
      .get()

    expect(storedFeedback).toBeDefined()

    if (storedFeedback === undefined) {
      throw new Error('Expected submitted feedback to be persisted')
    }

    expect(storedFeedback).toMatchObject({
      eventId: workshopId,
      text: 'A clear and useful workshop.',
      rating: 5,
      createdAt: '2100-01-01T00:00:00.000Z',
    })
    expect(decodeTime(storedFeedback.id.slice(2))).toBe(submittedAt)
    expect(response.body.singleResult.errors).toBeUndefined()
    expect(response.body.singleResult.data).toEqual({
      submitFeedback: {
        feedback: {
          id: storedFeedback.id,
          event: {
            id: workshopId,
            name: 'Document Intelligence Workshop',
          },
          text: 'A clear and useful workshop.',
          rating: 5,
          createdAt: '2100-01-01T00:00:00.000Z',
        },
        errors: [],
      },
    })
  })

  it('returns all applicable validation errors without writing feedback', async () => {
    const response = await graphQLServer.executeOperation(
      {
        query: submitFeedbackMutation,
        variables: {
          input: {
            eventId: 'E-01JGFJJZ000JX0K3SAK84YSW4S',
            text: '   ',
            rating: 0,
          },
        },
      },
      { contextValue: context },
    )

    expect(response.body.kind).toBe('single')

    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response')
    }

    expect(response.body.singleResult.errors).toBeUndefined()
    expect(response.body.singleResult.data).toEqual({
      submitFeedback: {
        feedback: null,
        errors: [
          {
            field: 'eventId',
            code: 'INVALID_EVENT',
            message: 'Select a valid event.',
          },
          {
            field: 'text',
            code: 'EMPTY_TEXT',
            message: 'Feedback cannot be empty.',
          },
          {
            field: 'rating',
            code: 'INVALID_RATING',
            message: 'Rating must be an integer from 1 through 5.',
          },
        ],
      },
    })
    expect(
      database
        .prepare<[], CountRow>('SELECT COUNT(*) AS count FROM feedback')
        .get(),
    ).toEqual({ count: 25 })
  })

  it('distinguishes feedback that exceeds the text limit', async () => {
    const response = await graphQLServer.executeOperation(
      {
        query: submitFeedbackMutation,
        variables: {
          input: {
            eventId: workshopId,
            text: ` ${'x'.repeat(1001)} `,
            rating: 5,
          },
        },
      },
      { contextValue: context },
    )

    expect(response.body.kind).toBe('single')

    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response')
    }

    expect(response.body.singleResult.errors).toBeUndefined()
    expect(response.body.singleResult.data).toEqual({
      submitFeedback: {
        feedback: null,
        errors: [
          {
            field: 'text',
            code: 'TEXT_TOO_LONG',
            message: 'Feedback must be 1,000 characters or fewer.',
          },
        ],
      },
    })
    expect(
      database
        .prepare<[], CountRow>('SELECT COUNT(*) AS count FROM feedback')
        .get(),
    ).toEqual({ count: 25 })
  })

  it('keeps unexpected repository failures as top-level GraphQL errors', async () => {
    const failingFeedbackRepository: FeedbackRepository = {
      create: () => {
        throw new Error('Simulated database failure')
      },
    }
    const failingContext: GraphQLContext = {
      eventRepository: context.eventRepository,
      feedbackService: createFeedbackService(
        context.eventRepository,
        failingFeedbackRepository,
        { now: () => submittedAt },
      ),
    }
    const response = await graphQLServer.executeOperation(
      {
        query: submitFeedbackMutation,
        variables: {
          input: {
            eventId: workshopId,
            text: 'Valid feedback before a database failure.',
            rating: 5,
          },
        },
      },
      { contextValue: failingContext },
    )

    expect(response.body.kind).toBe('single')

    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response')
    }

    expect(response.body.singleResult.data).toBeNull()
    expect(response.body.singleResult.errors).toHaveLength(1)
    expect(response.body.singleResult.errors?.[0]?.message).toBe(
      'Simulated database failure',
    )
    expect(
      database
        .prepare<[], CountRow>('SELECT COUNT(*) AS count FROM feedback')
        .get(),
    ).toEqual({ count: 25 })
  })
})
