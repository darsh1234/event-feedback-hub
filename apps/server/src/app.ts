import express, { type Express } from 'express'

export function createApp(): Express {
  const app = express()

  app.get('/health', (_request, response) => {
    response.status(200).json({
      service: 'event-feedback-hub-api',
      status: 'ok',
    })
  })

  return app
}
