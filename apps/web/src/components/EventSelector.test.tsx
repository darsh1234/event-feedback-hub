import type { MockedResponse } from '@apollo/client/testing'
import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
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

  function SelectorHarness() {
    const [selectedEvent, setSelectedEvent] = useState<{
      id: string
      name: string
    } | null>(null)

    return (
      <EventSelector
        onSelect={(eventId, eventName) => {
          setSelectedEvent(
            eventId.length === 0 ? null : { id: eventId, name: eventName },
          )
          onSelect(eventId, eventName)
        }}
        selectedEventId={selectedEvent?.id ?? ''}
        selectedEventName={selectedEvent?.name ?? ''}
      />
    )
  }

  render(
    <MockedProvider mocks={mocks}>
      <SelectorHarness />
    </MockedProvider>,
  )

  return onSelect
}

describe('EventSelector', () => {
  it('disables selection while events are loading', () => {
    renderSelector([eventsResult()])

    expect(screen.getByRole('combobox', { name: 'Event' })).toBeDisabled()
    expect(screen.getByPlaceholderText('Loading events…')).toBeInTheDocument()
  })

  it('opens for direct typing, filters events, and reports the selection', async () => {
    const user = userEvent.setup()
    const onSelect = renderSelector([eventsResult()])
    const selector = screen.getByRole('combobox', { name: 'Event' })

    await waitFor(() => expect(selector).toBeEnabled())
    await user.click(selector)
    await user.type(selector, 'insurance')

    expect(
      screen.queryByRole('option', { name: workshop.name }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('option', { name: webinar.name }))

    expect(onSelect).toHaveBeenCalledWith(webinar.id, webinar.name)
    expect(selector).toHaveValue(webinar.name)
    expect(selector).toHaveAttribute('aria-expanded', 'false')
  })

  it('supports selecting a filtered event from the keyboard', async () => {
    const user = userEvent.setup()
    const onSelect = renderSelector([eventsResult()])
    const selector = screen.getByRole('combobox', { name: 'Event' })

    await waitFor(() => expect(selector).toBeEnabled())
    await user.click(selector)
    await user.type(selector, 'document')
    await user.keyboard('{Enter}')

    expect(onSelect).toHaveBeenCalledWith(workshop.id, workshop.name)
    expect(selector).toHaveValue(workshop.name)
  })

  it('starts arrow-key navigation at the first event', async () => {
    const user = userEvent.setup()
    const onSelect = renderSelector([eventsResult()])
    const selector = screen.getByRole('combobox', { name: 'Event' })

    await waitFor(() => expect(selector).toBeEnabled())
    await user.click(selector)
    await user.keyboard('{ArrowDown}{Enter}')

    expect(onSelect).toHaveBeenCalledWith(workshop.id, workshop.name)
    expect(selector).toHaveValue(workshop.name)
  })

  it('keeps the committed event active while searching for a replacement', async () => {
    const user = userEvent.setup()
    const onSelect = renderSelector([eventsResult()])
    const selector = screen.getByRole('combobox', { name: 'Event' })

    await waitFor(() => expect(selector).toBeEnabled())
    await user.click(selector)
    await user.click(screen.getByRole('option', { name: workshop.name }))

    await user.click(selector)
    await user.type(selector, 'insurance')

    expect(onSelect).not.toHaveBeenCalledWith('', '')
    await user.click(screen.getByRole('option', { name: webinar.name }))

    expect(onSelect).toHaveBeenLastCalledWith(webinar.id, webinar.name)
    expect(selector).toHaveValue(webinar.name)
  })

  it('restores the committed event when an unfinished search loses focus', async () => {
    const user = userEvent.setup()
    renderSelector([eventsResult()])
    const selector = screen.getByRole('combobox', { name: 'Event' })

    await waitFor(() => expect(selector).toBeEnabled())
    await user.click(selector)
    await user.click(screen.getByRole('option', { name: workshop.name }))

    await user.click(selector)
    await user.type(selector, 'unlisted event')
    await user.tab()

    expect(selector).toHaveValue(workshop.name)
    expect(selector).toHaveAttribute('aria-expanded', 'false')
  })

  it('explains when no event matches the search', async () => {
    const user = userEvent.setup()
    renderSelector([eventsResult()])
    const selector = screen.getByRole('combobox', { name: 'Event' })

    await waitFor(() => expect(selector).toBeEnabled())
    await user.click(selector)
    await user.type(selector, 'unlisted summit')

    expect(screen.getByRole('status')).toHaveTextContent('No events found.')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
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

    const selector = screen.getByRole('combobox', { name: 'Event' })
    await waitFor(() => expect(selector).toBeEnabled())
    await user.click(selector)

    expect(
      screen.getByRole('option', { name: 'Insurance Automation Webinar' }),
    ).toBeInTheDocument()
  })
})
