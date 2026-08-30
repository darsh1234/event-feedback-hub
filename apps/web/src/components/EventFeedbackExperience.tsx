import { useApolloClient, useSubscription } from '@apollo/client/react'
import { type ReactNode, useCallback, useState } from 'react'

import {
  type FeedbackListItem,
  prependFeedbackToCache,
} from '../apollo/feedbackCache'
import { FeedbackAddedDocument } from '../graphql/generated/graphql'
import { FeedbackForm } from './FeedbackForm'
import { FeedbackStream } from './FeedbackStream'

interface EventFeedbackExperienceProps {
  eventPanel: ReactNode
  eventId: string | null
}

interface ActiveEventFeedbackExperienceProps {
  eventPanel: ReactNode
  eventId: string
}

/** Explains why the feedback controls are unavailable before event selection. */
function WorkspacePrompt() {
  return (
    <section
      aria-labelledby="workspace-prompt-heading"
      className="workspace-prompt"
    >
      <div className="workspace-prompt-content">
        <span aria-hidden="true" className="workspace-prompt-icon">
          ✓
        </span>
        <p className="section-label">Next step</p>
        <h2 id="workspace-prompt-heading">Choose an event to continue</h2>
        <p>
          Select a session to add anonymous feedback and see what other
          attendees are saying.
        </p>
      </div>
    </section>
  )
}

/** Coordinates one event's submission, filtering, subscription, and buffering. */
function ActiveEventFeedbackExperience({
  eventPanel,
  eventId,
}: ActiveEventFeedbackExperienceProps) {
  const client = useApolloClient()
  const [rating, setRating] = useState<number | null>(null)
  const [isAtTop, setIsAtTop] = useState(true)
  const [bufferedFeedback, setBufferedFeedback] = useState<FeedbackListItem[]>(
    [],
  )

  // Use one merge path for mutation and subscription results so IDs deduplicate.
  const receiveFeedback = useCallback(
    (feedback: FeedbackListItem) => {
      if (
        feedback.event.id !== eventId ||
        (rating !== null && feedback.rating !== rating)
      ) {
        return
      }

      if (
        isAtTop &&
        prependFeedbackToCache(client.cache, feedback, eventId, rating)
      ) {
        return
      }

      // Keep live responses out of the reader's way until they return to the top.
      setBufferedFeedback((currentFeedback) =>
        currentFeedback.some(({ id }) => id === feedback.id)
          ? currentFeedback
          : [...currentFeedback, feedback],
      )
    },
    [client.cache, eventId, isAtTop, rating],
  )

  useSubscription(FeedbackAddedDocument, {
    ignoreResults: true,
    onData({ data }) {
      const feedback = data.data?.feedbackAdded

      if (feedback !== undefined) {
        receiveFeedback(feedback)
      }
    },
    variables: { eventId },
  })

  /** Resets transient stream state when the active logical cache list changes. */
  function changeRating(nextRating: number | null) {
    // Buffered records belong to the filter that was active when they arrived.
    setBufferedFeedback([])
    setIsAtTop(true)
    setRating(nextRating)
  }

  /** Moves buffered live feedback into Apollo when the reader requests it. */
  function revealBufferedFeedback() {
    // Retain any item whose target cache list has not been loaded yet.
    const remainingFeedback = bufferedFeedback.filter(
      (feedback) =>
        !prependFeedbackToCache(client.cache, feedback, eventId, rating),
    )

    setBufferedFeedback(remainingFeedback)
    setIsAtTop(true)
  }

  return (
    <>
      <section aria-label="Feedback workspace" className="interaction-panel">
        {eventPanel}
        <FeedbackForm eventId={eventId} onSubmitted={receiveFeedback} />
      </section>
      <FeedbackStream
        bufferedFeedbackCount={bufferedFeedback.length}
        eventId={eventId}
        onAtTopChange={setIsAtTop}
        onRatingChange={changeRating}
        onRevealBufferedFeedback={revealBufferedFeedback}
        rating={rating}
      />
    </>
  )
}

/** Keeps the workspace geometry stable while activating event-specific state. */
export function EventFeedbackExperience({
  eventPanel,
  eventId,
}: EventFeedbackExperienceProps) {
  if (eventId === null) {
    return (
      <section aria-label="Feedback workspace" className="interaction-panel">
        {eventPanel}
        <WorkspacePrompt />
      </section>
    )
  }

  return (
    <ActiveEventFeedbackExperience
      eventPanel={eventPanel}
      eventId={eventId}
      key={eventId}
    />
  )
}
