import {
  decodeFeedbackCursor,
  encodeFeedbackCursor,
  InvalidFeedbackCursorError,
} from '../domain/feedbackCursor.js'
import { createFeedbackId, isEventId } from '../domain/ids.js'
import type { EventRepository } from '../repositories/eventRepository.js'
import type {
  FeedbackRecord,
  FeedbackRepository,
} from '../repositories/feedbackRepository.js'
import { createFeedbackPubSub, type FeedbackPubSub } from './feedbackPubSub.js'

export const feedbackSubmissionErrorCodes = {
  emptyText: 'EMPTY_TEXT',
  invalidEvent: 'INVALID_EVENT',
  invalidRating: 'INVALID_RATING',
  textTooLong: 'TEXT_TOO_LONG',
} as const

export type FeedbackSubmissionErrorCode =
  (typeof feedbackSubmissionErrorCodes)[keyof typeof feedbackSubmissionErrorCodes]

export interface SubmitFeedbackInput {
  eventId: string
  text: string
  rating: number
}

export interface FeedbackSubmissionError {
  field: 'eventId' | 'rating' | 'text'
  code: FeedbackSubmissionErrorCode
  message: string
}

export interface SubmitFeedbackResult {
  feedback: FeedbackRecord | null
  errors: FeedbackSubmissionError[]
}

export interface ListFeedbackInput {
  eventId: string
  rating?: number
  first: number
  after?: string
}

export interface FeedbackConnection {
  items: FeedbackRecord[]
  pageInfo: {
    endCursor: string | null
    hasNextPage: boolean
  }
}

export class FeedbackQueryValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FeedbackQueryValidationError'
  }
}

export interface FeedbackService {
  list(input: ListFeedbackInput): FeedbackConnection
  subscribe(eventId: string): AsyncIterableIterator<FeedbackRecord>
  submit(input: SubmitFeedbackInput): SubmitFeedbackResult
}

interface FeedbackServiceOptions {
  feedbackPubSub?: FeedbackPubSub
  now?: () => number
}

export function createFeedbackService(
  eventRepository: EventRepository,
  feedbackRepository: FeedbackRepository,
  {
    feedbackPubSub = createFeedbackPubSub(),
    now = Date.now,
  }: FeedbackServiceOptions = {},
): FeedbackService {
  const validateEvent = (eventId: string) => {
    if (!isEventId(eventId) || !eventRepository.exists(eventId)) {
      throw new FeedbackQueryValidationError('Select a valid event.')
    }
  }

  return {
    list: ({ eventId, rating, first, after }) => {
      validateEvent(eventId)

      if (
        rating !== undefined &&
        (!Number.isInteger(rating) || rating < 1 || rating > 5)
      ) {
        throw new FeedbackQueryValidationError(
          'Rating must be an integer from 1 through 5.',
        )
      }

      if (!Number.isInteger(first) || first < 1 || first > 50) {
        throw new FeedbackQueryValidationError(
          'first must be an integer from 1 through 50.',
        )
      }

      let afterId: string | undefined

      if (after !== undefined) {
        try {
          afterId = decodeFeedbackCursor(after)
        } catch (error) {
          if (error instanceof InvalidFeedbackCursorError) {
            throw new FeedbackQueryValidationError(
              'after must be a valid feedback cursor.',
            )
          }

          throw error
        }
      }

      const page = feedbackRepository.list({
        eventId,
        first,
        ...(rating === undefined ? {} : { rating }),
        ...(afterId === undefined ? {} : { afterId }),
      })
      const lastItem = page.items.at(-1)

      return {
        items: page.items,
        pageInfo: {
          endCursor:
            lastItem === undefined ? null : encodeFeedbackCursor(lastItem.id),
          hasNextPage: page.hasNextPage,
        },
      }
    },
    subscribe: (eventId) => {
      validateEvent(eventId)
      return feedbackPubSub.subscribe(eventId)
    },
    submit: ({ eventId, text, rating }) => {
      const trimmedText = text.trim()
      const errors: FeedbackSubmissionError[] = []

      if (!isEventId(eventId) || !eventRepository.exists(eventId)) {
        errors.push({
          field: 'eventId',
          code: feedbackSubmissionErrorCodes.invalidEvent,
          message: 'Select a valid event.',
        })
      }

      if (trimmedText.length === 0) {
        errors.push({
          field: 'text',
          code: feedbackSubmissionErrorCodes.emptyText,
          message: 'Feedback cannot be empty.',
        })
      } else if (trimmedText.length > 1000) {
        errors.push({
          field: 'text',
          code: feedbackSubmissionErrorCodes.textTooLong,
          message: 'Feedback must be 1,000 characters or fewer.',
        })
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        errors.push({
          field: 'rating',
          code: feedbackSubmissionErrorCodes.invalidRating,
          message: 'Rating must be an integer from 1 through 5.',
        })
      }

      if (errors.length > 0) {
        return { feedback: null, errors }
      }

      const submittedAt = now()
      const feedback = feedbackRepository.create({
        id: createFeedbackId(submittedAt),
        eventId,
        text: trimmedText,
        rating,
        createdAt: new Date(submittedAt).toISOString(),
      })

      feedbackPubSub.publish(feedback)

      return { feedback, errors: [] }
    },
  }
}
