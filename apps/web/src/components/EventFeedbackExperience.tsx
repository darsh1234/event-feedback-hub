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

export function EventFeedbackExperience({
  eventId,
}: EventFeedbackExperienceProps) {
  const client = useApolloClient()
  const [rating, setRating] = useState<number | null>(null)
  const [isAtTop, setIsAtTop] = useState(true)
  const [bufferedFeedback, setBufferedFeedback] = useState<FeedbackListItem[]>(
    [],
  )

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

  function changeRating(nextRating: number | null) {
    setBufferedFeedback([])
    setIsAtTop(true)
    setRating(nextRating)
  }

  function revealBufferedFeedback() {
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
