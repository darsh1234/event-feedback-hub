import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it('shows the submission form after an event is selected', async () => {
    const user = userEvent.setup()
    const event = {
      id: 'E-01JGFJJZ000JX0K3SAK84YSW4T',
      name: 'Document Intelligence Workshop',
    }
    render(
      <MockedProvider
        mocks={[
          {
            request: { query: EventsDocument },
            result: { data: { events: [event] } },
          },
        ]}
      >
        <App />
      </MockedProvider>,
    )

    expect(
      screen.queryByRole('heading', { level: 2, name: 'Add feedback' }),
    ).not.toBeInTheDocument()

    await screen.findByRole('option', { name: event.name })
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Event' }),
      event.id,
    )

    expect(
      screen.getByRole('heading', { level: 2, name: 'Add feedback' }),
    ).toBeInTheDocument()
  })
})
