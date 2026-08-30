import type { DatabaseConnection } from '../database/connection.js'
import {
  createEventRepository,
  type EventRepository,
} from '../features/events/eventRepository.js'
import { createFeedbackRepository } from '../features/feedback/feedbackRepository.js'
import type { FeedbackPubSub } from '../features/feedback/feedbackPubSub.js'
import {
  createFeedbackService,
  type FeedbackService,
} from '../features/feedback/feedbackService.js'

/** Dependencies exposed to every GraphQL resolver operation. */
export interface GraphQLContext {
  eventRepository: EventRepository
  feedbackService: FeedbackService
}

interface GraphQLContextOptions {
  feedbackPubSub?: FeedbackPubSub
  now?: () => number
}

/**
 * Composes feature repositories and services once for use by HTTP requests and
 * WebSocket subscription operations.
 */
export function createGraphQLContext(
  database: DatabaseConnection,
  options: GraphQLContextOptions = {},
): GraphQLContext {
  const eventRepository = createEventRepository(database)
  const feedbackRepository = createFeedbackRepository(database)

  return {
    eventRepository,
    feedbackService: createFeedbackService(
      eventRepository,
      feedbackRepository,
      options,
    ),
  }
}
