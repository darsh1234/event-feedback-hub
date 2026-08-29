import request from 'supertest'
import { describe, expect, it } from 'vitest'

import { createApp } from './app.js'

describe('server shell', () => {
  it('reports that the API process is healthy', async () => {
    const response = await request(createApp()).get('/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      service: 'event-feedback-hub-api',
      status: 'ok',
    })
  })
})
