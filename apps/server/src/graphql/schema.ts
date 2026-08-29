import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const schemaPath = resolve(
  import.meta.dirname,
  '../../src/graphql/schema.graphql',
)

export const typeDefs = readFileSync(schemaPath, 'utf8')
