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

export interface GraphQLContext {
  eventRepository: EventRepository
  feedbackService: FeedbackService
}

interface GraphQLContextOptions {
  feedbackPubSub?: FeedbackPubSub
  now?: () => number
}

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
