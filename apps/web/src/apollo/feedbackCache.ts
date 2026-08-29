import type { FieldPolicy } from '@apollo/client/cache'
import type { Reference, StoreObject } from '@apollo/client/utilities'

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

export const feedbackFieldPolicy: FieldPolicy<
  CachedFeedbackConnection,
  CachedFeedbackConnection
> = {
  keyArgs: ['eventId', 'rating'],
  merge(existing, incoming, { args, readField }) {
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
