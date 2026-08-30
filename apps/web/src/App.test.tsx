import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'
import { EventsDocument, FeedbackDocument } from './graphql/generated/graphql'

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
    const selector = screen.getByRole('combobox', { name: 'Event' })
    await waitFor(() => expect(selector).toBeEnabled())
    expect(selector).toHaveAttribute('placeholder', 'Search events…')
    expect(
      screen.getByRole('region', { name: 'Feedback workspace' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Choose an event to continue',
      }),
    ).toBeInTheDocument()
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
          {
            request: {
              query: FeedbackDocument,
              variables: { eventId: event.id, first: 20 },
            },
            result: {
              data: {
                feedback: {
                  __typename: 'FeedbackConnection',
                  items: [],
                  pageInfo: {
                    __typename: 'PageInfo',
                    endCursor: null,
                    hasNextPage: false,
                  },
                },
              },
            },
          },
        ]}
      >
        <App />
      </MockedProvider>,
    )

    expect(
      screen.queryByRole('heading', { level: 2, name: 'Add feedback' }),
    ).not.toBeInTheDocument()

    const selector = screen.getByRole('combobox', { name: 'Event' })
    await waitFor(() => expect(selector).toBeEnabled())
    await user.click(selector)
    await user.click(screen.getByRole('option', { name: event.name }))

    expect(
      screen.getByRole('heading', { level: 2, name: 'Add feedback' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Event' })).toHaveValue(
      event.name,
    )
    expect(
      screen.queryByRole('heading', {
        level: 2,
        name: 'Choose an event to continue',
      }),
    ).not.toBeInTheDocument()

    const workspace = screen.getByRole('region', {
      name: 'Feedback workspace',
    })
    expect(workspace).toContainElement(
      screen.getByRole('heading', { level: 2, name: 'Choose an event' }),
    )
    expect(workspace).toContainElement(
      screen.getByRole('heading', { level: 2, name: 'Add feedback' }),
    )
  })
})
