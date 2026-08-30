import {
  FeedbackErrorCode,
  type Resolvers,
} from './generated/resolver-types.js'
import { GraphQLError } from 'graphql'

import type { FeedbackRecord } from '../features/feedback/feedbackTypes.js'
import {
  FeedbackQueryValidationError,
  type FeedbackSubmissionErrorCode,
} from '../features/feedback/feedbackService.js'

const graphQLErrorCodes: Record<
  FeedbackSubmissionErrorCode,
  FeedbackErrorCode
> = {
  EMPTY_TEXT: FeedbackErrorCode.EmptyText,
  INVALID_EVENT: FeedbackErrorCode.InvalidEvent,
  INVALID_RATING: FeedbackErrorCode.InvalidRating,
  TEXT_TOO_LONG: FeedbackErrorCode.TextTooLong,
}

/** Converts expected query validation failures into GraphQL input errors. */
function throwFeedbackValidationError(error: unknown): never {
  if (error instanceof FeedbackQueryValidationError) {
    throw new GraphQLError(error.message, {
      extensions: { code: 'BAD_USER_INPUT' },
    })
  }

  throw error
}

/** Maps the generated GraphQL contract onto the repository-backed services. */
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
    feedback: (
      _parent,
      { eventId, rating, first, after },
      { feedbackService },
    ) => {
      try {
        return feedbackService.list({
          eventId,
          first,
          ...(rating === null || rating === undefined ? {} : { rating }),
          ...(after === null || after === undefined ? {} : { after }),
        })
      } catch (error) {
        return throwFeedbackValidationError(error)
      }
    },
  },
  Subscription: {
    feedbackAdded: {
      subscribe: (_parent, { eventId }, { feedbackService }) => {
        try {
          return feedbackService.subscribe(eventId)
        } catch (error) {
          return throwFeedbackValidationError(error)
        }
      },
      resolve: (feedback: FeedbackRecord) => feedback,
    },
  },
}
