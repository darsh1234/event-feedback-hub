import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { makeExecutableSchema } from '@graphql-tools/schema'

import { resolvers } from './resolvers.js'

const schemaPath = resolve(
  import.meta.dirname,
  '../../src/graphql/schema.graphql',
)

export const typeDefs = readFileSync(schemaPath, 'utf8')

export const graphQLSchema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
