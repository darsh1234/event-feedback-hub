import { useState } from 'react'

import './App.css'
import { EventSelector } from './components/EventSelector'
import { EventFeedbackExperience } from './components/EventFeedbackExperience'

/** Renders the application shell and activates feedback features after selection. */
function App() {
  const [selectedEvent, setSelectedEvent] = useState<{
    id: string
    name: string
  } | null>(null)
  const eventPanel = (
    <section aria-labelledby="event-heading" className="event-panel">
      <div>
        <p className="section-label">Start here</p>
        <h2 id="event-heading">Choose an event</h2>
        <p>Select the session whose feedback you want to view or add.</p>
      </div>
      <EventSelector
        onSelect={(eventId, eventName) =>
          setSelectedEvent(
            eventId.length === 0 ? null : { id: eventId, name: eventName },
          )
        }
        selectedEventId={selectedEvent?.id ?? ''}
        selectedEventName={selectedEvent?.name ?? ''}
      />
    </section>
  )

  return (
    <main className="shell">
      <header className="app-header">
        <p className="eyebrow">TrustLayer take-home assessment</p>
        <h1>Event Feedback Hub</h1>
        <p className="summary">
          Choose an event to share feedback and follow the conversation as it
          happens.
        </p>
      </header>

      <div className="dashboard-grid dashboard-grid-active">
        <EventFeedbackExperience
          eventPanel={eventPanel}
          eventId={selectedEvent?.id ?? null}
        />
      </div>
    </main>
  )
}

export default App
