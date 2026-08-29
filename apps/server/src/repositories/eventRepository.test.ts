import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type DatabaseConnection,
  openDatabase,
} from '../database/connection.js'
import { initializeDatabase } from '../database/initialize.js'
import {
  type EventRepository,
  createEventRepository,
} from './eventRepository.js'

describe('event repository', () => {
  let database: DatabaseConnection
  let eventRepository: EventRepository

  beforeEach(() => {
    database = openDatabase(':memory:')
    initializeDatabase(database)
    eventRepository = createEventRepository(database)
  })

  afterEach(() => {
    database.close()
  })

  it('lists the seeded events in deterministic name order', () => {
    expect(eventRepository.list()).toEqual([
      {
        id: 'E-01JGFJJZ000JX0K3SAK84YSW4T',
        name: 'Document Intelligence Workshop',
      },
      {
        id: 'E-01JGFJJZZ832B8E8AQ4P779QN7',
        name: 'Insurance Automation Webinar',
      },
      {
        id: 'E-01JGFJK0YGS77JRTDAXX7DB3BM',
        name: 'Insurtech Product Conference',
      },
    ])
  })
})
