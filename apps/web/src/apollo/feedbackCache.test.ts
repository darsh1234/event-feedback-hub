import type { InMemoryCache } from '@apollo/client'
import { describe, expect, it } from 'vitest'

import {
  FeedbackDocument,
  type FeedbackQuery,
  type FeedbackQueryVariables,
} from '../graphql/generated/graphql'
import { createApolloCache } from './client'
import { prependFeedbackToCache } from './feedbackCache'

type FeedbackItem = FeedbackQuery['feedback']['items'][number]

const workshopId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'
const webinarId = 'E-01JGFJJZZ832B8E8AQ4P779QN7'

function feedbackItem(
  id: string,
  rating: number,
  event = {
    id: workshopId,
    name: 'Document Intelligence Workshop',
  },
): FeedbackItem {
  return {
    __typename: 'Feedback',
    id,
    event: {
      __typename: 'Event',
      ...event,
    },
    text: `Feedback ${id}`,
    rating,
    createdAt: '2026-08-29T20:00:00.000Z',
  }
}

function writePage(
  cache: InMemoryCache,
  variables: FeedbackQueryVariables,
  items: FeedbackItem[],
  endCursor: string | null,
  hasNextPage: boolean,
) {
  cache.writeQuery<FeedbackQuery, FeedbackQueryVariables>({
    query: FeedbackDocument,
    variables,
    data: {
      feedback: {
        __typename: 'FeedbackConnection',
        items,
        pageInfo: {
          __typename: 'PageInfo',
          endCursor,
          hasNextPage,
        },
      },
    },
  })
}

function readPage(cache: InMemoryCache, variables: FeedbackQueryVariables) {
  return cache.readQuery<FeedbackQuery, FeedbackQueryVariables>({
    query: FeedbackDocument,
    variables,
  })?.feedback
}

describe('feedback field policy', () => {
  it('replaces a logical list when a new first page arrives', () => {
    const cache = createApolloCache()
    const variables = { eventId: workshopId, first: 20 }
    const older = feedbackItem('F-older', 3)
    const newer = feedbackItem('F-newer', 5)

    writePage(cache, variables, [older], 'cursor-older', false)
    writePage(cache, variables, [newer], 'cursor-newer', false)

    expect(readPage(cache, variables)?.items.map(({ id }) => id)).toEqual([
      newer.id,
    ])
    expect(readPage(cache, variables)?.pageInfo.endCursor).toBe('cursor-newer')
  })

  it('prepends live feedback once without changing the oldest-page cursor', () => {
    const cache = createApolloCache()
    const variables = { eventId: workshopId, first: 20 }
    const persisted = feedbackItem('F-persisted', 4)
    const live = feedbackItem('F-live', 5)

    writePage(cache, variables, [persisted], 'cursor-oldest', true)

    expect(prependFeedbackToCache(cache, live, workshopId, null)).toBe(true)
    expect(prependFeedbackToCache(cache, live, workshopId, null)).toBe(true)

    expect(readPage(cache, variables)?.items.map(({ id }) => id)).toEqual([
      live.id,
      persisted.id,
    ])
    expect(readPage(cache, variables)?.pageInfo).toEqual({
      __typename: 'PageInfo',
      endCursor: 'cursor-oldest',
      hasNextPage: true,
    })
  })

  it('does not merge live feedback into a different event or rating list', () => {
    const cache = createApolloCache()
    const variables = { eventId: workshopId, first: 20, rating: 5 }
    const persisted = feedbackItem('F-persisted', 5)

    writePage(cache, variables, [persisted], null, false)

    expect(
      prependFeedbackToCache(cache, feedbackItem('F-three', 3), workshopId, 5),
    ).toBe(false)
    expect(
      prependFeedbackToCache(
        cache,
        feedbackItem('F-webinar', 5, {
          id: webinarId,
          name: 'Insurance Automation Webinar',
        }),
        workshopId,
        5,
      ),
    ).toBe(false)

    expect(readPage(cache, variables)?.items.map(({ id }) => id)).toEqual([
      persisted.id,
    ])
  })

  it('appends an older page, deduplicates IDs, and advances the cursor', () => {
    const cache = createApolloCache()
    const variables = { eventId: workshopId, first: 20 }
    const newest = feedbackItem('F-newest', 5)
    const boundary = feedbackItem('F-boundary', 4)
    const oldest = feedbackItem('F-oldest', 3)

    writePage(cache, variables, [newest, boundary], 'cursor-boundary', true)
    writePage(
      cache,
      { ...variables, after: 'cursor-boundary' },
      [boundary, oldest],
      'cursor-oldest',
      false,
    )

    expect(readPage(cache, variables)?.items.map(({ id }) => id)).toEqual([
      newest.id,
      boundary.id,
      oldest.id,
    ])
    expect(readPage(cache, variables)?.pageInfo).toEqual({
      __typename: 'PageInfo',
      endCursor: 'cursor-oldest',
      hasNextPage: false,
    })
  })

  it('isolates lists by event and rating but not pagination arguments', () => {
    const cache = createApolloCache()
    const allRatings = feedbackItem('F-all', 3)
    const fiveStars = feedbackItem('F-five', 5)
    const webinarFeedback = feedbackItem('F-webinar', 4, {
      id: webinarId,
      name: 'Insurance Automation Webinar',
    })

    writePage(
      cache,
      { eventId: workshopId, first: 20 },
      [allRatings],
      null,
      false,
    )
    writePage(
      cache,
      { eventId: workshopId, first: 20, rating: 5 },
      [fiveStars],
      null,
      false,
    )
    writePage(
      cache,
      { eventId: webinarId, first: 20 },
      [webinarFeedback],
      null,
      false,
    )

    expect(
      readPage(cache, { eventId: workshopId, first: 5 })?.items.map(
        ({ id }) => id,
      ),
    ).toEqual([allRatings.id])
    expect(
      readPage(cache, {
        eventId: workshopId,
        first: 50,
        rating: 5,
      })?.items.map(({ id }) => id),
    ).toEqual([fiveStars.id])
    expect(
      readPage(cache, { eventId: webinarId, first: 20 })?.items.map(
        ({ id }) => id,
      ),
    ).toEqual([webinarFeedback.id])
  })
})
