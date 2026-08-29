import { ApolloClient, HttpLink, InMemoryCache, split } from '@apollo/client'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { Kind, OperationTypeNode } from 'graphql'
import { createClient } from 'graphql-ws'

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

export const apolloClient = new ApolloClient({
  cache: new InMemoryCache(),
  link,
})
