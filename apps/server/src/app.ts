import type { ApolloServer } from '@apollo/server'
import { expressMiddleware } from '@as-integrations/express5'
import cors from 'cors'
import express, { type Express } from 'express'

import type { GraphQLContext } from './graphql/context.js'
import { createGraphQLServer } from './graphql/server.js'

export interface Application {
  app: Express
  graphQLServer: ApolloServer<GraphQLContext>
}

export async function createApp(context: GraphQLContext): Promise<Application> {
  const app = express()
  const graphQLServer = createGraphQLServer()

  app.get('/health', (_request, response) => {
    response.status(200).json({
      service: 'event-feedback-hub-api',
      status: 'ok',
    })
  })

  await graphQLServer.start()

  app.use(
    '/graphql',
    cors<cors.CorsRequest>(),
    express.json(),
    expressMiddleware(graphQLServer, {
      context: () => Promise.resolve(context),
    }),
  )

  return { app, graphQLServer }
}
