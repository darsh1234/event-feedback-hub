import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'
import { EventsDocument } from './graphql/generated/graphql'

describe('application', () => {
  it('introduces the feedback hub and loads the event selection control', async () => {
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: EventsDocument },
            result: { data: { events: [] } },
          },
        ]}
      >
        <App />
      </MockedProvider>,
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Event Feedback Hub' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('option', { name: 'Select an event' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Event' })).toBeEnabled()
  })
})
