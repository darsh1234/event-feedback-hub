import { createFeedbackId, isEventId } from '../domain/ids.js'
import type { EventRepository } from '../repositories/eventRepository.js'
import type {
  FeedbackRecord,
  FeedbackRepository,
} from '../repositories/feedbackRepository.js'

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

export interface FeedbackService {
  submit(input: SubmitFeedbackInput): SubmitFeedbackResult
}

interface FeedbackServiceOptions {
  now?: () => number
}

export function createFeedbackService(
  eventRepository: EventRepository,
  feedbackRepository: FeedbackRepository,
  { now = Date.now }: FeedbackServiceOptions = {},
): FeedbackService {
  return {
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

      return { feedback, errors: [] }
    },
  }
}
