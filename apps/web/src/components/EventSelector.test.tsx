import type { MockedResponse } from '@apollo/client/testing'
import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EventsDocument, type EventsQuery } from '../graphql/generated/graphql'
import { EventSelector } from './EventSelector'

const workshop = {
  id: 'E-01JGFJJZ000JX0K3SAK84YSW4T',
  name: 'Document Intelligence Workshop',
} satisfies EventsQuery['events'][number]

const webinar = {
  id: 'E-01JGFJJZZ832B8E8AQ4P779QN7',
  name: 'Insurance Automation Webinar',
} satisfies EventsQuery['events'][number]

const events: EventsQuery['events'] = [workshop, webinar]

function eventsResult(): MockedResponse<EventsQuery> {
  return {
    request: { query: EventsDocument },
    result: { data: { events } },
  }
}

function renderSelector(mocks: MockedResponse<EventsQuery>[]) {
  const onSelect = vi.fn()

  render(
    <MockedProvider mocks={mocks}>
      <EventSelector onSelect={onSelect} selectedEventId="" />
    </MockedProvider>,
  )

  return onSelect
}

describe('EventSelector', () => {
  it('disables selection while events are loading', () => {
    renderSelector([eventsResult()])

    expect(screen.getByRole('combobox', { name: 'Event' })).toBeDisabled()
    expect(
      screen.getByRole('option', { name: 'Loading events…' }),
    ).toBeInTheDocument()
  })

  it('loads events and reports the selected event ID', async () => {
    const user = userEvent.setup()
    const onSelect = renderSelector([eventsResult()])
    expect(
      await screen.findByRole('option', {
        name: 'Document Intelligence Workshop',
      }),
    ).toBeInTheDocument()
    const selector = screen.getByRole('combobox', { name: 'Event' })

    expect(selector).toBeEnabled()

    await user.selectOptions(selector, workshop.id)

    expect(onSelect).toHaveBeenCalledWith(workshop.id)
  })

  it('offers a retry when event loading fails', async () => {
    const user = userEvent.setup()
    renderSelector([
      {
        request: { query: EventsDocument },
        error: new Error('Event request failed'),
      },
      eventsResult(),
    ])

    expect(
      await screen.findByText("We couldn't load the available events."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(
      await screen.findByRole('option', {
        name: 'Insurance Automation Webinar',
      }),
    ).toBeInTheDocument()
  })
})
