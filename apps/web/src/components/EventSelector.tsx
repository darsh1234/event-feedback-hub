import { useQuery } from '@apollo/client/react'

import { EventsDocument } from '../graphql/generated/graphql'

interface EventSelectorProps {
  onSelect: (eventId: string) => void
  selectedEventId: string
}

export function EventSelector({
  onSelect,
  selectedEventId,
}: EventSelectorProps) {
  const { data, error, loading, refetch } = useQuery(EventsDocument, {
    fetchPolicy: 'cache-first',
  })

  if (error !== undefined && data === undefined) {
    return (
      <div className="event-selector-state" role="alert">
        <p>We couldn&apos;t load the available events.</p>
        <button type="button" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="event-selector">
      <label htmlFor="event">Event</label>
      <select
        disabled={loading && data === undefined}
        id="event"
        onChange={(event) => onSelect(event.target.value)}
        value={selectedEventId}
      >
        <option value="">
          {loading && data === undefined
            ? 'Loading events…'
            : 'Select an event'}
        </option>
        {data?.events.map((event) => (
          <option key={event.id} value={event.id}>
            {event.name}
          </option>
        ))}
      </select>
    </div>
  )
}
