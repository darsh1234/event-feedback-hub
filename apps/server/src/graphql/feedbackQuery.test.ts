import type { ApolloServer } from '@apollo/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type DatabaseConnection,
  openDatabase,
} from '../database/connection.js'
import { initializeDatabase } from '../database/initialize.js'
import { encodeFeedbackCursor } from '../features/feedback/feedbackCursor.js'
import { type GraphQLContext, createGraphQLContext } from './context.js'
import { createGraphQLServer } from './server.js'

const workshopId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'
const emptyEventId = 'E-01JGFJJZZ832B8E8AQ4P779QN7'
const feedbackIds = {
  first: 'F-01JGFJK8RGN7CW5XQXAZSR44CA',
  sixth: 'F-01JGFJKDMR3E0MGS53PSNPAJJ0',
  eleventh: 'F-01JGFJKJH0TKDTB3TFPENRRDYD',
  thirteenth: 'F-01JGFJKMFGZBR1B0QZ3N8DK825',
  twentyFifth: 'F-01JGFJM06GDW96TSJ73FAN8F1T',
} as const

const feedbackQuery = `
  query Feedback(
    $eventId: ID!
    $rating: Int
    $first: Int
    $after: String
  ) {
    feedback(
      eventId: $eventId
      rating: $rating
      first: $first
      after: $after
    ) {
      items {
        text
        rating
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

const feedbackPageInfoQuery = `
  query FeedbackPageInfo(
    $eventId: ID!
    $rating: Int
    $first: Int
    $after: String
  ) {
    feedback(
      eventId: $eventId
      rating: $rating
      first: $first
      after: $after
    ) {
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`

describe('GraphQL feedback query', () => {
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

  async function executeFeedbackQuery(
    query: string,
    variables: Record<string, unknown>,
  ) {
    const response = await graphQLServer.executeOperation(
      { query, variables },
      { contextValue: context },
    )

    if (response.body.kind !== 'single') {
      throw new Error('Expected a single GraphQL response')
    }

    return response.body.singleResult
  }

  it('returns the default newest-first page with an opaque end cursor', async () => {
    const result = await executeFeedbackQuery(feedbackQuery, {
      eventId: workshopId,
    })

    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      feedback: {
        items: Array.from({ length: 20 }, (_value, index) => {
          const feedbackNumber = 25 - index

          return {
            text: `Demo feedback ${String(feedbackNumber).padStart(
              2,
              '0',
            )} for rating ${Math.ceil(feedbackNumber / 5)}.`,
            rating: Math.ceil(feedbackNumber / 5),
          }
        }),
        pageInfo: {
          endCursor: encodeFeedbackCursor(feedbackIds.sixth),
          hasNextPage: true,
        },
      },
    })
  })

  it('filters by rating and traverses the next page without overlap', async () => {
    const firstPage = await executeFeedbackQuery(feedbackQuery, {
      eventId: workshopId,
      rating: 3,
      first: 3,
    })

    expect(firstPage.errors).toBeUndefined()
    expect(firstPage.data).toEqual({
      feedback: {
        items: [
          { text: 'Demo feedback 15 for rating 3.', rating: 3 },
          { text: 'Demo feedback 14 for rating 3.', rating: 3 },
          { text: 'Demo feedback 13 for rating 3.', rating: 3 },
        ],
        pageInfo: {
          endCursor: encodeFeedbackCursor(feedbackIds.thirteenth),
          hasNextPage: true,
        },
      },
    })

    const secondPage = await executeFeedbackQuery(feedbackQuery, {
      eventId: workshopId,
      rating: 3,
      first: 3,
      after: encodeFeedbackCursor(feedbackIds.thirteenth),
    })

    expect(secondPage.errors).toBeUndefined()
    expect(secondPage.data).toEqual({
      feedback: {
        items: [
          { text: 'Demo feedback 12 for rating 3.', rating: 3 },
          { text: 'Demo feedback 11 for rating 3.', rating: 3 },
        ],
        pageInfo: {
          endCursor: encodeFeedbackCursor(feedbackIds.eleventh),
          hasNextPage: false,
        },
      },
    })
  })

  it('returns an empty connection for an event without feedback', async () => {
    const result = await executeFeedbackQuery(feedbackQuery, {
      eventId: emptyEventId,
    })

    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      feedback: {
        items: [],
        pageInfo: {
          endCursor: null,
          hasNextPage: false,
        },
      },
    })
  })

  it.each([
    {
      first: 1,
      endCursor: encodeFeedbackCursor(feedbackIds.twentyFifth),
      hasNextPage: true,
    },
    {
      first: 50,
      endCursor: encodeFeedbackCursor(feedbackIds.first),
      hasNextPage: false,
    },
  ])('accepts the page-size boundary first=$first', async (expected) => {
    const result = await executeFeedbackQuery(feedbackPageInfoQuery, {
      eventId: workshopId,
      first: expected.first,
    })

    expect(result.errors).toBeUndefined()
    expect(result.data).toEqual({
      feedback: {
        pageInfo: {
          endCursor: expected.endCursor,
          hasNextPage: expected.hasNextPage,
        },
      },
    })
  })

  it.each([0, 51])(
    'rejects the out-of-range page size first=%i with BAD_USER_INPUT',
    async (first) => {
      const result = await executeFeedbackQuery(feedbackPageInfoQuery, {
        eventId: workshopId,
        first,
      })

      expect(result.data).toBeNull()
      expect(result.errors).toHaveLength(1)
      expect(result.errors?.[0]?.message).toBe(
        'first must be an integer from 1 through 50.',
      )
      expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
    },
  )

  it.each([
    {
      name: 'malformed cursor',
      variables: { after: 'not-a-cursor' },
      message: 'after must be a valid feedback cursor.',
    },
    {
      name: 'invalid rating',
      variables: { rating: 6 },
      message: 'Rating must be an integer from 1 through 5.',
    },
    {
      name: 'unknown event',
      variables: { eventId: 'E-01JGFJJZ000JX0K3SAK84YSW4S' },
      message: 'Select a valid event.',
    },
  ])('rejects $name with BAD_USER_INPUT', async ({ variables, message }) => {
    const result = await executeFeedbackQuery(feedbackPageInfoQuery, {
      eventId: workshopId,
      ...variables,
    })

    expect(result.data).toBeNull()
    expect(result.errors).toHaveLength(1)
    expect(result.errors?.[0]?.message).toBe(message)
    expect(result.errors?.[0]?.extensions?.code).toBe('BAD_USER_INPUT')
  })
})
