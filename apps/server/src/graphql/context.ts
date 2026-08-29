import type { DatabaseConnection } from '../database/connection.js'
import {
  createEventRepository,
  type EventRepository,
} from '../repositories/eventRepository.js'
import { createFeedbackRepository } from '../repositories/feedbackRepository.js'
import type { FeedbackPubSub } from '../services/feedbackPubSub.js'
import {
  createFeedbackService,
  type FeedbackService,
} from '../services/feedbackService.js'

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
 * Composes repositories and domain services once for use by HTTP requests and
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
