import type { DatabaseConnection } from '../database/connection.js'
import {
  createEventRepository,
  type EventRepository,
} from '../repositories/eventRepository.js'

export interface GraphQLContext {
  eventRepository: EventRepository
}

export function createGraphQLContext(
  database: DatabaseConnection,
): GraphQLContext {
  return {
    eventRepository: createEventRepository(database),
  }
}
