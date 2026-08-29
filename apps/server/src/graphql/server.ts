import { ApolloServer } from '@apollo/server'

import type { GraphQLContext } from './context.js'
import { resolvers } from './resolvers.js'
import { typeDefs } from './schema.js'

export function createGraphQLServer(): ApolloServer<GraphQLContext> {
  return new ApolloServer<GraphQLContext>({
    typeDefs,
    resolvers,
  })
}
