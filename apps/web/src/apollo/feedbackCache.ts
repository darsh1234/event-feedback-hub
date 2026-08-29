import type { ApolloCache, FieldPolicy } from '@apollo/client/cache'
import type { Reference, StoreObject } from '@apollo/client/utilities'

import {
  FeedbackDocument,
  type FeedbackQuery,
  type FeedbackQueryVariables,
} from '../graphql/generated/graphql'

/** Generated feedback shape shared by cache helpers and presentation components. */
export type FeedbackListItem = FeedbackQuery['feedback']['items'][number]

/** Matches the server's default page size for every cache read and write. */
export const feedbackPageSize = 20

type CachedFeedbackItem = Reference | StoreObject

interface CachedPageInfo extends StoreObject {
  endCursor: string | null
  hasNextPage: boolean
}

interface CachedFeedbackConnection extends StoreObject {
  items: CachedFeedbackItem[]
  pageInfo: CachedPageInfo
}

function hasAfterCursor(args: unknown) {
  return (
    typeof args === 'object' &&
    args !== null &&
    'after' in args &&
    typeof args.after === 'string'
  )
}

/**
 * Treats event and rating as list identity while appending cursor pages without
 * duplicating normalized feedback references.
 */
export const feedbackFieldPolicy: FieldPolicy<
  CachedFeedbackConnection,
  CachedFeedbackConnection
> = {
  keyArgs: ['eventId', 'rating'],
  merge(existing, incoming, { args, readField }) {
    // A request without `after` is the authoritative newest page for this list.
    if (!hasAfterCursor(args)) {
      return incoming
    }

    const items = [...(existing?.items ?? [])]
    const knownIds = new Set(
      items
        .map((item) => readField<string>('id', item))
        .filter((id): id is string => id !== undefined),
    )

    for (const item of incoming.items) {
      const id = readField<string>('id', item)

      if (id === undefined || !knownIds.has(id)) {
        items.push(item)

        if (id !== undefined) {
          knownIds.add(id)
        }
      }
    }

    return {
      ...incoming,
      items,
    }
  },
}

/**
 * Prepends a matching feedback record to an existing visible list, preserving
 * the oldest loaded cursor so subsequent pagination continues correctly.
 */
export function prependFeedbackToCache(
  cache: ApolloCache,
  feedback: FeedbackListItem,
  eventId: string,
  rating: number | null,
) {
  if (
    feedback.event.id !== eventId ||
    (rating !== null && feedback.rating !== rating)
  ) {
    return false
  }

  const variables: FeedbackQueryVariables = {
    eventId,
    first: feedbackPageSize,
    ...(rating === null ? {} : { rating }),
  }
  const data = cache.readQuery<FeedbackQuery, FeedbackQueryVariables>({
    query: FeedbackDocument,
    variables,
  })

  if (data === null) {
    return false
  }

  if (data.feedback.items.some(({ id }) => id === feedback.id)) {
    return true
  }

  cache.writeQuery<FeedbackQuery, FeedbackQueryVariables>({
    query: FeedbackDocument,
    variables,
    data: {
      feedback: {
        ...data.feedback,
        items: [feedback, ...data.feedback.items],
      },
    },
  })

  return true
}
