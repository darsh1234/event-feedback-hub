import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { makeExecutableSchema } from '@graphql-tools/schema'

import { resolvers } from './resolvers.js'

const schemaPath = resolve(
  import.meta.dirname,
  '../../src/graphql/schema.graphql',
)

/** Raw SDL used by code generation and executable-schema construction. */
export const typeDefs = readFileSync(schemaPath, 'utf8')

/** Shared executable schema used by HTTP, WebSocket, and integration tests. */
export const graphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
