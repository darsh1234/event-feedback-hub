import { ApolloServer, type ApolloServerPlugin } from '@apollo/server'

import type { GraphQLContext } from './context.js'
import { graphQLSchema } from './schema.js'

export function createGraphQLServer(
  plugins: ApolloServerPlugin<GraphQLContext>[] = [],
): ApolloServer<GraphQLContext> {
  return new ApolloServer<GraphQLContext>({
    schema: graphQLSchema,
    plugins,
  })
}
