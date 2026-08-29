import { createServer, type Server as HttpServer } from 'node:http'
import type { ApolloServer } from '@apollo/server'
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer'
import { expressMiddleware } from '@as-integrations/express5'
import cors from 'cors'
import express, { type Express } from 'express'
import { useServer } from 'graphql-ws/use/ws'
import { WebSocketServer } from 'ws'

import type { GraphQLContext } from './graphql/context.js'
import { graphQLSchema } from './graphql/schema.js'
import { createGraphQLServer } from './graphql/server.js'

export interface Application {
  app: Express
  graphQLServer: ApolloServer<GraphQLContext>
  httpServer: HttpServer
}

export async function createApp(context: GraphQLContext): Promise<Application> {
  const app = express()
  const httpServer = createServer(app)
  const webSocketServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  })
  const webSocketCleanup = useServer(
    {
      schema: graphQLSchema,
      context: () => context,
    },
    webSocketServer,
  )
  const graphQLServer = createGraphQLServer([
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      serverWillStart() {
        return Promise.resolve({
          async drainServer() {
            await webSocketCleanup.dispose()
          },
        })
      },
    },
  ])

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

  return { app, graphQLServer, httpServer }
}
