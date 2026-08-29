import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { Kind, OperationTypeNode } from 'graphql'
import { createClient } from 'graphql-ws'

import { feedbackFieldPolicy } from './feedbackCache'

const graphQLHttpUrl = 'http://localhost:4000/graphql'
const graphQLWebSocketUrl = 'ws://localhost:4000/graphql'

const httpLink = new HttpLink({ uri: graphQLHttpUrl })
const webSocketLink = new GraphQLWsLink(
  createClient({
    lazy: true,
    url: graphQLWebSocketUrl,
  }),
)

const link = split(
  ({ query }) => {
    const definition = getMainDefinition(query)

    return (
      definition.kind === Kind.OPERATION_DEFINITION &&
      definition.operation === OperationTypeNode.SUBSCRIPTION
    )
  },
  webSocketLink,
  httpLink,
)

/** Creates the normalized cache with the feedback list's cursor merge policy. */
export function createApolloCache() {
  return new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          feedback: feedbackFieldPolicy,
        },
      },
    },
  })
}

/** Shared client that routes subscriptions to WebSocket and other operations to HTTP. */
export const apolloClient = new ApolloClient({
  cache: createApolloCache(),
  link,
})
