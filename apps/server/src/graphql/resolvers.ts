import type { Resolvers } from './generated/resolver-types.js'

export const resolvers: Resolvers = {
  Query: {
    events: (_parent, _arguments, { eventRepository }) =>
      eventRepository.list(),
  },
}
