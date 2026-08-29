import { useState } from 'react'

import './App.css'
import { EventSelector } from './components/EventSelector'
import { EventFeedbackExperience } from './components/EventFeedbackExperience'

/** Renders the application shell and activates feedback features after selection. */
function App() {
  const [selectedEventId, setSelectedEventId] = useState('')

  return (
    <main className="shell">
      <p className="eyebrow">TrustLayer take-home assessment</p>
      <h1>Event Feedback Hub</h1>
      <p className="summary">
        Choose an event to share feedback and follow the conversation as it
        happens.
      </p>

      <section aria-labelledby="event-heading" className="event-panel">
        <div>
          <p className="section-label">Start here</p>
          <h2 id="event-heading">Choose an event</h2>
          <p>Select the session whose feedback you want to view or add.</p>
        </div>
        <EventSelector
          onSelect={setSelectedEventId}
          selectedEventId={selectedEventId}
        />
      </section>

      {selectedEventId.length === 0 ? null : (
        <EventFeedbackExperience
          key={selectedEventId}
          eventId={selectedEventId}
        />
      )}
    </main>
  )
}

export default App
