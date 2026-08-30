import { useQuery } from '@apollo/client/react'
import { type KeyboardEvent, useId, useMemo, useState } from 'react'

import { EventsDocument } from '../graphql/generated/graphql'

interface EventSelectorProps {
  onSelect: (eventId: string, eventName: string) => void
  selectedEventId: string
  selectedEventName?: string
}

/** Loads the predefined events and presents selection with retryable error state. */
export function EventSelector({
  onSelect,
  selectedEventId,
  selectedEventName = '',
}: EventSelectorProps) {
  const { data, error, loading, refetch } = useQuery(EventsDocument, {
    fetchPolicy: 'cache-first',
  })
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listboxId = useId()
  const selectedEvent = data?.events.find(
    (event) => event.id === selectedEventId,
  )
  const displayedQuery = query ?? selectedEvent?.name ?? selectedEventName
  const filteredEvents = useMemo(() => {
    const normalizedQuery = displayedQuery.trim().toLocaleLowerCase()

    return normalizedQuery.length === 0
      ? (data?.events ?? [])
      : (data?.events.filter((event) =>
          event.name.toLocaleLowerCase().includes(normalizedQuery),
        ) ?? [])
  }, [data?.events, displayedQuery])

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

  /** Commits one result and restores the input's selected-event label. */
  function selectEvent(eventId: string, eventName: string) {
    setQuery(eventName)
    setIsOpen(false)
    onSelect(eventId, eventName)
  }

  /** Keeps all combobox navigation available without moving focus from input. */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((currentIndex) =>
        currentIndex < 0
          ? 0
          : Math.min(currentIndex + 1, Math.max(filteredEvents.length - 1, 0)),
      )
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((currentIndex) =>
        currentIndex < 0
          ? Math.max(filteredEvents.length - 1, 0)
          : Math.max(currentIndex - 1, 0),
      )
      return
    }

    if (event.key === 'Enter' && isOpen) {
      const activeEvent = filteredEvents[activeIndex]

      if (activeEvent !== undefined) {
        event.preventDefault()
        selectEvent(activeEvent.id, activeEvent.name)
      }

      return
    }

    if (event.key === 'Escape') {
      setQuery(null)
      setIsOpen(false)
    }
  }

  return (
    <div
      className="event-selector"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setQuery(null)
          setIsOpen(false)
        }
      }}
    >
      <label htmlFor="event">Event</label>
      <div className="event-select-control">
        <input
          aria-activedescendant={
            isOpen && filteredEvents[activeIndex] !== undefined
              ? `${listboxId}-${filteredEvents[activeIndex].id}`
              : undefined
          }
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          autoComplete="off"
          disabled={loading && data === undefined}
          id="event"
          onChange={(event) => {
            setQuery(event.target.value)
            setActiveIndex(0)
            setIsOpen(true)
          }}
          onClick={(event) => {
            setActiveIndex(-1)
            setIsOpen(true)
            event.currentTarget.select()
          }}
          onFocus={(event) => {
            setActiveIndex(-1)
            setIsOpen(true)
            event.currentTarget.select()
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            loading && data === undefined ? 'Loading events…' : 'Search events…'
          }
          role="combobox"
          type="text"
          value={displayedQuery}
        />
        <span aria-hidden="true" className="event-select-chevron" />

        {isOpen && !loading ? (
          <div className="event-options" id={listboxId} role="listbox">
            {filteredEvents.length === 0 ? (
              <p className="event-options-empty" role="status">
                No events found.
              </p>
            ) : (
              filteredEvents.map((event, index) => (
                <button
                  aria-selected={event.id === selectedEventId}
                  className={
                    index === activeIndex
                      ? 'event-option event-option-active'
                      : 'event-option'
                  }
                  id={`${listboxId}-${event.id}`}
                  key={event.id}
                  onClick={() => selectEvent(event.id, event.name)}
                  onMouseDown={(mouseEvent) => mouseEvent.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  role="option"
                  type="button"
                >
                  <span>{event.name}</span>
                  {event.id === selectedEventId ? (
                    <span aria-hidden="true" className="event-option-check">
                      ✓
                    </span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
