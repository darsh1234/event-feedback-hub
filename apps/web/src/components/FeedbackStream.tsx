import { NetworkStatus } from '@apollo/client'
import { useQuery } from '@apollo/client/react'
import { useEffect, useRef, useState } from 'react'

import { feedbackPageSize } from '../apollo/feedbackCache'
import { FeedbackDocument } from '../graphql/generated/graphql'
import { formatAbsoluteTime, formatRelativeTime } from '../utils/relativeTime'

interface FeedbackStreamProps {
  bufferedFeedbackCount: number
  eventId: string
  onAtTopChange: (isAtTop: boolean) => void
  onRatingChange: (rating: number | null) => void
  onRevealBufferedFeedback: () => void
  rating: number | null
}

const ratings = [1, 2, 3, 4, 5] as const

function RatingFilter({
  rating,
  setRating,
}: {
  rating: number | null
  setRating: (rating: number | null) => void
}) {
  return (
    <fieldset className="rating-filter">
      <legend>Filter by rating</legend>
      <div>
        <button
          aria-pressed={rating === null}
          onClick={() => setRating(null)}
          type="button"
        >
          All
        </button>
        {ratings.map((value) => (
          <button
            aria-label={`${value} ${value === 1 ? 'star' : 'stars'}`}
            aria-pressed={rating === value}
            key={value}
            onClick={() => setRating(value)}
            type="button"
          >
            <span aria-hidden="true">★</span> {value}
          </button>
        ))}
      </div>
    </fieldset>
  )
}

function FeedbackLoadingState() {
  return (
    <div className="feedback-loading" role="status">
      <span className="visually-hidden">Loading feedback…</span>
      {[1, 2, 3].map((value) => (
        <div aria-hidden="true" className="feedback-skeleton" key={value} />
      ))}
    </div>
  )
}

function FeedbackRating({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`${rating} out of 5 stars`}
      className="feedback-card-rating"
      role="img"
    >
      <span aria-hidden="true">
        {'★'.repeat(rating)}
        <span className="feedback-card-empty-stars">
          {'★'.repeat(5 - rating)}
        </span>
      </span>
    </span>
  )
}

export function FeedbackStream({
  bufferedFeedbackCount,
  eventId,
  onAtTopChange,
  onRatingChange,
  onRevealBufferedFeedback,
  rating,
}: FeedbackStreamProps) {
  const [paginationError, setPaginationError] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const scrollRegionRef = useRef<HTMLDivElement>(null)
  const variables = {
    eventId,
    first: feedbackPageSize,
    ...(rating === null ? {} : { rating }),
  }
  const { data, error, fetchMore, loading, networkStatus, refetch } = useQuery(
    FeedbackDocument,
    {
      fetchPolicy: 'cache-and-network',
      notifyOnNetworkStatusChange: true,
      variables,
    },
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 60_000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    if (scrollRegionRef.current !== null) {
      scrollRegionRef.current.scrollTop = 0
    }

    onAtTopChange(true)
  }, [eventId, onAtTopChange, rating])

  function changeRating(nextRating: number | null) {
    setPaginationError('')
    onRatingChange(nextRating)
  }

  async function loadOlderFeedback() {
    const endCursor = data?.feedback.pageInfo.endCursor

    if (endCursor === null || endCursor === undefined) {
      return
    }

    setPaginationError('')

    try {
      await fetchMore({
        variables: {
          ...variables,
          after: endCursor,
        },
      })
    } catch {
      setPaginationError(
        "We couldn't load older feedback. Your current feedback is still here.",
      )
    }
  }

  function revealBufferedFeedback() {
    onRevealBufferedFeedback()

    if (scrollRegionRef.current !== null) {
      scrollRegionRef.current.scrollTop = 0
    }

    onAtTopChange(true)
  }

  const isInitialLoading = loading && data === undefined
  const isLoadingOlder = networkStatus === NetworkStatus.fetchMore

  return (
    <section aria-labelledby="stream-heading" className="stream-panel">
      <div className="stream-header">
        <div>
          <p className="section-label">What attendees are saying</p>
          <h2 id="stream-heading">Feedback</h2>
        </div>
        <RatingFilter rating={rating} setRating={changeRating} />
      </div>

      {bufferedFeedbackCount > 0 ? (
        <button
          className="new-feedback-button"
          onClick={revealBufferedFeedback}
          type="button"
        >
          {bufferedFeedbackCount}{' '}
          {bufferedFeedbackCount === 1 ? 'new response' : 'new responses'}
        </button>
      ) : null}

      <div
        aria-label="Feedback responses"
        className="feedback-scroll-region"
        onScroll={(event) => onAtTopChange(event.currentTarget.scrollTop <= 8)}
        ref={scrollRegionRef}
        role="region"
        tabIndex={0}
      >
        {isInitialLoading ? <FeedbackLoadingState /> : null}

        {data === undefined && error !== undefined ? (
          <div className="stream-state stream-state-error">
            <p role="alert">We couldn&apos;t load feedback for this event.</p>
            <button type="button" onClick={() => void refetch()}>
              Retry
            </button>
          </div>
        ) : null}

        {data?.feedback.items.length === 0 ? (
          <div className="stream-state">
            {rating === null ? (
              <p>No feedback yet. Be the first to share a response.</p>
            ) : (
              <>
                <p>
                  No {rating}-star feedback yet. Try another rating or show all
                  feedback.
                </p>
                <button type="button" onClick={() => changeRating(null)}>
                  Show all feedback
                </button>
              </>
            )}
          </div>
        ) : null}

        {data !== undefined && data.feedback.items.length > 0 ? (
          <ul className="feedback-list">
            {data.feedback.items.map((feedback) => (
              <li key={feedback.id}>
                <article className="feedback-card">
                  <header>
                    <div>
                      <p className="feedback-event-name">
                        {feedback.event.name}
                      </p>
                      <FeedbackRating rating={feedback.rating} />
                    </div>
                    <time
                      dateTime={feedback.createdAt}
                      title={formatAbsoluteTime(feedback.createdAt)}
                    >
                      {formatRelativeTime(feedback.createdAt, now)}
                    </time>
                  </header>
                  <p>{feedback.text}</p>
                </article>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {paginationError.length === 0 ? null : (
        <p className="pagination-error" role="alert">
          {paginationError}
        </p>
      )}

      {data?.feedback.pageInfo.hasNextPage === true ? (
        <button
          className="load-older-button"
          disabled={isLoadingOlder}
          onClick={() => void loadOlderFeedback()}
          type="button"
        >
          {isLoadingOlder
            ? 'Loading older feedback…'
            : paginationError.length > 0
              ? 'Retry loading older feedback'
              : 'Load older feedback'}
        </button>
      ) : null}
    </section>
  )
}
