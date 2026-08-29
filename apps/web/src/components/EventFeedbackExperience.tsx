import { useApolloClient, useSubscription } from '@apollo/client/react'
import { useCallback, useState } from 'react'

import {
  type FeedbackListItem,
  prependFeedbackToCache,
} from '../apollo/feedbackCache'
import { FeedbackAddedDocument } from '../graphql/generated/graphql'
import { FeedbackForm } from './FeedbackForm'
import { FeedbackStream } from './FeedbackStream'

interface EventFeedbackExperienceProps {
  eventId: string
}

/** Coordinates submission, filtering, subscription delivery, and live buffering. */
export function EventFeedbackExperience({
  eventId,
}: EventFeedbackExperienceProps) {
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
      <FeedbackForm eventId={eventId} onSubmitted={receiveFeedback} />
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
