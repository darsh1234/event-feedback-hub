import type { MockedResponse } from '@apollo/client/testing'
import { MockedProvider } from '@apollo/client/testing/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import {
  SubmitFeedbackDocument,
  type SubmitFeedbackMutation,
  type SubmitFeedbackMutationVariables,
} from '../graphql/generated/graphql'
import { FeedbackForm } from './FeedbackForm'

const eventId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'
const feedbackText = 'Really useful session.'

function submissionMock(
  result: SubmitFeedbackMutation,
  delay?: number,
): MockedResponse<SubmitFeedbackMutation, SubmitFeedbackMutationVariables> {
  return {
    ...(delay === undefined ? {} : { delay }),
    request: {
      query: SubmitFeedbackDocument,
      variables: {
        input: {
          eventId,
          rating: 5,
          text: feedbackText,
        },
      },
    },
    result: { data: result },
  }
}

function renderForm(
  mocks: MockedResponse<
    SubmitFeedbackMutation,
    SubmitFeedbackMutationVariables
  >[] = [],
) {
  render(
    <MockedProvider mocks={mocks}>
      <FeedbackForm eventId={eventId} />
    </MockedProvider>,
  )
}

async function completeForm() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('radio', { name: '5 stars' }))
  await user.type(
    screen.getByRole('textbox', { name: 'Feedback' }),
    feedbackText,
  )
  return user
}

describe('FeedbackForm', () => {
  it('explains missing fields before sending a mutation', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Submit feedback' }))

    expect(screen.getByText('Enter your feedback.')).toBeInTheDocument()
    expect(
      screen.getByText('Choose a rating from 1 through 5.'),
    ).toBeInTheDocument()
  })

  it('rejects feedback longer than the shared limit', async () => {
    const user = userEvent.setup()
    renderForm()
    await user.click(screen.getByRole('radio', { name: '5 stars' }))
    fireEvent.change(screen.getByRole('textbox', { name: 'Feedback' }), {
      target: { value: 'x'.repeat(1001) },
    })

    await user.click(screen.getByRole('button', { name: 'Submit feedback' }))

    expect(
      screen.getByText('Feedback must be 1,000 characters or fewer.'),
    ).toBeInTheDocument()
  })

  it('fills every star through the selected rating', async () => {
    const user = userEvent.setup()
    const { container } = render(
      <MockedProvider>
        <FeedbackForm eventId={eventId} />
      </MockedProvider>,
    )

    await user.click(screen.getByRole('radio', { name: '4 stars' }))

    expect(container.querySelectorAll('.rating-star-selected')).toHaveLength(4)
    expect(screen.getByRole('radio', { name: '4 stars' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '3 stars' })).not.toBeChecked()
  })

  it('prevents duplicate submission while pending and clears after success', async () => {
    renderForm([
      submissionMock(
        {
          submitFeedback: {
            feedback: {
              __typename: 'Feedback',
              id: 'F-01M17J0000000000000000000',
              event: {
                __typename: 'Event',
                id: eventId,
                name: 'Document Intelligence Workshop',
              },
              text: feedbackText,
              rating: 5,
              createdAt: '2026-08-29T20:00:00.000Z',
            },
            errors: [],
          },
        },
        50,
      ),
    ])
    const user = await completeForm()

    await user.click(screen.getByRole('button', { name: 'Submit feedback' }))

    expect(screen.getByRole('button', { name: 'Submitting…' })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: 'Feedback' })).toBeDisabled()

    expect(
      await screen.findByText('Thanks—your feedback was submitted.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Feedback' })).toHaveValue('')
    expect(screen.getByRole('radio', { name: '5 stars' })).not.toBeChecked()
  })

  it('shows structured server errors beside their field and preserves input', async () => {
    renderForm([
      submissionMock({
        submitFeedback: {
          feedback: null,
          errors: [
            {
              field: 'text',
              code: 'TEXT_TOO_LONG',
              message: 'Feedback must be 1,000 characters or fewer.',
            },
          ],
        },
      }),
    ])
    const user = await completeForm()

    await user.click(screen.getByRole('button', { name: 'Submit feedback' }))

    expect(
      await screen.findByText('Feedback must be 1,000 characters or fewer.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Feedback' })).toHaveValue(
      feedbackText,
    )
    expect(screen.getByRole('radio', { name: '5 stars' })).toBeChecked()
  })

  it('shows an unexpected failure at form level and preserves input', async () => {
    const mock: MockedResponse<
      SubmitFeedbackMutation,
      SubmitFeedbackMutationVariables
    > = {
      request: {
        query: SubmitFeedbackDocument,
        variables: {
          input: { eventId, rating: 5, text: feedbackText },
        },
      },
      error: new Error('Network unavailable'),
    }
    renderForm([mock])
    const user = await completeForm()

    await user.click(screen.getByRole('button', { name: 'Submit feedback' }))

    expect(
      await screen.findByText(
        "We couldn't submit your feedback. Please try again.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Feedback' })).toHaveValue(
      feedbackText,
    )

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Submit feedback' }),
      ).toBeEnabled(),
    )
  })
})
