import { useMutation } from '@apollo/client/react'
import { type FormEvent, useState } from 'react'

import type { FeedbackListItem } from '../apollo/feedbackCache'
import { SubmitFeedbackDocument } from '../graphql/generated/graphql'

interface FeedbackFormProps {
  eventId: string
  onSubmitted?: (feedback: FeedbackListItem) => void
}

type FeedbackField = 'rating' | 'text'
type FieldErrors = Partial<Record<FeedbackField, string>>

const maximumFeedbackLength = 1000
const ratings = [1, 2, 3, 4, 5] as const

function validateFeedback(text: string, rating: number | null): FieldErrors {
  const errors: FieldErrors = {}
  const trimmedText = text.trim()

  if (trimmedText.length === 0) {
    errors.text = 'Enter your feedback.'
  } else if (trimmedText.length > maximumFeedbackLength) {
    errors.text = `Feedback must be ${maximumFeedbackLength.toLocaleString()} characters or fewer.`
  }

  if (rating === null) {
    errors.rating = 'Choose a rating from 1 through 5.'
  }

  return errors
}

export function FeedbackForm({ eventId, onSubmitted }: FeedbackFormProps) {
  const [text, setText] = useState('')
  const [rating, setRating] = useState<number | null>(null)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [submitFeedback, { loading }] = useMutation(SubmitFeedbackDocument)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (loading) {
      return
    }

    setFormError('')
    setSuccessMessage('')

    const clientErrors = validateFeedback(text, rating)
    setFieldErrors(clientErrors)

    if (Object.keys(clientErrors).length > 0 || rating === null) {
      return
    }

    try {
      const { data } = await submitFeedback({
        variables: {
          input: {
            eventId,
            rating,
            text: text.trim(),
          },
        },
      })
      const payload = data?.submitFeedback

      if (payload === undefined) {
        setFormError("We couldn't submit your feedback. Please try again.")
        return
      }

      if (payload.errors.length > 0) {
        const serverFieldErrors: FieldErrors = {}
        const generalErrors: string[] = []

        for (const error of payload.errors) {
          if (error.field === 'text' || error.field === 'rating') {
            serverFieldErrors[error.field] = error.message
          } else {
            generalErrors.push(error.message)
          }
        }

        setFieldErrors(serverFieldErrors)
        setFormError(generalErrors.join(' '))
        return
      }

      if (payload.feedback === null) {
        setFormError("We couldn't submit your feedback. Please try again.")
        return
      }

      setText('')
      setRating(null)
      setFieldErrors({})
      setSuccessMessage('Thanks—your feedback was submitted.')
      onSubmitted?.(payload.feedback)
    } catch {
      setFormError("We couldn't submit your feedback. Please try again.")
    }
  }

  return (
    <section aria-labelledby="feedback-heading" className="feedback-panel">
      <div>
        <p className="section-label">Share your experience</p>
        <h2 id="feedback-heading">Add feedback</h2>
        <p>Your response is anonymous.</p>
      </div>

      <form
        className="feedback-form"
        noValidate
        onSubmit={(event) => void handleSubmit(event)}
      >
        <fieldset
          aria-describedby={
            fieldErrors.rating === undefined ? undefined : 'rating-error'
          }
          aria-invalid={fieldErrors.rating === undefined ? undefined : true}
          className="rating-field"
          disabled={loading}
        >
          <legend>Rating</legend>
          <div className="rating-options">
            {ratings.map((value) => (
              <label key={value}>
                <input
                  checked={rating === value}
                  name="rating"
                  onChange={() => setRating(value)}
                  type="radio"
                  value={value}
                />
                <span
                  aria-hidden="true"
                  className={
                    rating !== null && value <= rating
                      ? 'rating-star rating-star-selected'
                      : 'rating-star'
                  }
                >
                  ★
                </span>
                <span className="visually-hidden">
                  {value} {value === 1 ? 'star' : 'stars'}
                </span>
              </label>
            ))}
          </div>
          {fieldErrors.rating === undefined ? null : (
            <p className="field-error" id="rating-error" role="alert">
              {fieldErrors.rating}
            </p>
          )}
        </fieldset>

        <div className="text-field">
          <div className="text-label-row">
            <label htmlFor="feedback-text">Feedback</label>
            <span aria-live="polite">
              {text.length.toLocaleString()}/
              {maximumFeedbackLength.toLocaleString()}
            </span>
          </div>
          <textarea
            aria-describedby={
              fieldErrors.text === undefined ? undefined : 'text-error'
            }
            aria-invalid={fieldErrors.text === undefined ? undefined : true}
            disabled={loading}
            id="feedback-text"
            onChange={(event) => setText(event.target.value)}
            placeholder="What worked well, and what could be better?"
            rows={5}
            value={text}
          />
          {fieldErrors.text === undefined ? null : (
            <p className="field-error" id="text-error" role="alert">
              {fieldErrors.text}
            </p>
          )}
        </div>

        {formError.length === 0 ? null : (
          <p className="form-message form-message-error" role="alert">
            {formError}
          </p>
        )}
        {successMessage.length === 0 ? null : (
          <p className="form-message form-message-success" role="status">
            {successMessage}
          </p>
        )}

        <button className="submit-button" disabled={loading} type="submit">
          {loading ? 'Submitting…' : 'Submit feedback'}
        </button>
      </form>
    </section>
  )
}
