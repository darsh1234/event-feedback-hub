import type { FeedbackRecord } from '../repositories/feedbackRepository.js'

export interface FeedbackPubSub {
  publish(feedback: FeedbackRecord): void
  subscribe(eventId: string): AsyncIterableIterator<FeedbackRecord>
}

interface FeedbackSubscriber {
  close(): void
  push(feedback: FeedbackRecord): void
}

export function createFeedbackPubSub(): FeedbackPubSub {
  const subscribersByEvent = new Map<string, Set<FeedbackSubscriber>>()

  return {
    publish: (feedback) => {
      for (const subscriber of subscribersByEvent.get(feedback.eventId) ?? []) {
        subscriber.push(feedback)
      }
    },
    subscribe: (eventId) => {
      const queuedFeedback: FeedbackRecord[] = []
      let closed = false
      const pendingNext: Array<
        (result: IteratorResult<FeedbackRecord>) => void
      > = []

      const removeSubscriber = () => {
        const eventSubscribers = subscribersByEvent.get(eventId)

        eventSubscribers?.delete(subscriber)

        if (eventSubscribers?.size === 0) {
          subscribersByEvent.delete(eventId)
        }
      }

      const subscriber: FeedbackSubscriber = {
        close: () => {
          if (closed) {
            return
          }

          closed = true
          queuedFeedback.length = 0
          removeSubscriber()

          for (const resolveNext of pendingNext.splice(0)) {
            resolveNext({ done: true, value: undefined })
          }
        },
        push: (feedback) => {
          if (closed) {
            return
          }

          const resolveNext = pendingNext.shift()

          if (resolveNext === undefined) {
            queuedFeedback.push(feedback)
            return
          }

          resolveNext({ done: false, value: feedback })
        },
      }
      const eventSubscribers = subscribersByEvent.get(eventId) ?? new Set()

      eventSubscribers.add(subscriber)
      subscribersByEvent.set(eventId, eventSubscribers)

      return {
        [Symbol.asyncIterator]() {
          return this
        },
        next: () => {
          const nextFeedback = queuedFeedback.shift()

          if (nextFeedback !== undefined) {
            return Promise.resolve({
              done: false,
              value: nextFeedback,
            })
          }

          if (closed) {
            return Promise.resolve({ done: true, value: undefined })
          }

          return new Promise<IteratorResult<FeedbackRecord>>((resolve) => {
            pendingNext.push(resolve)
          })
        },
        return: () => {
          subscriber.close()
          return Promise.resolve({ done: true, value: undefined })
        },
      }
    },
  }
}
