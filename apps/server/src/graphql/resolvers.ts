import {
  FeedbackErrorCode,
  type Resolvers,
} from './generated/resolver-types.js'
import type { FeedbackSubmissionErrorCode } from '../services/feedbackService.js'

const graphQLErrorCodes: Record<
  FeedbackSubmissionErrorCode,
  FeedbackErrorCode
> = {
  EMPTY_TEXT: FeedbackErrorCode.EmptyText,
  INVALID_EVENT: FeedbackErrorCode.InvalidEvent,
  INVALID_RATING: FeedbackErrorCode.InvalidRating,
  TEXT_TOO_LONG: FeedbackErrorCode.TextTooLong,
}

export const resolvers: Resolvers = {
  Feedback: {
    event: ({ eventId }, _arguments, { eventRepository }) => {
      const event = eventRepository.findById(eventId)

      if (event === undefined) {
        throw new Error(`Feedback references missing event ${eventId}`)
      }

      return event
    },
  },
  Mutation: {
    submitFeedback: (_parent, { input }, { feedbackService }) => {
      const result = feedbackService.submit(input)

      return {
        feedback: result.feedback,
        errors: result.errors.map((error) => ({
          ...error,
          code: graphQLErrorCodes[error.code],
        })),
      }
    },
  },
  Query: {
    events: (_parent, _arguments, { eventRepository }) =>
      eventRepository.list(),
  },
}
