import type { MockedResponse } from '@apollo/client/testing'
import { MockedProvider } from '@apollo/client/testing/react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { createApolloCache } from '../apollo/client'
import {
  FeedbackAddedDocument,
  FeedbackDocument,
  SubmitFeedbackDocument,
  type FeedbackAddedSubscription,
  type FeedbackQuery,
} from '../graphql/generated/graphql'
import { EventFeedbackExperience } from './EventFeedbackExperience'

const eventId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'

function feedback(id: string, text: string, rating = 5) {
  return {
    __typename: 'Feedback' as const,
    id,
    event: {
      __typename: 'Event' as const,
      id: eventId,
      name: 'Document Intelligence Workshop',
    },
    text,
    rating,
    createdAt: '2026-08-29T20:30:00.000Z',
  }
}

function feedbackQueryMock(
  items: FeedbackQuery['feedback']['items'],
  rating?: number,
): MockedResponse {
  return {
    request: {
      query: FeedbackDocument,
      variables: {
        eventId,
        first: 20,
        ...(rating === undefined ? {} : { rating }),
      },
    },
    result: {
      data: {
        feedback: {
          __typename: 'FeedbackConnection',
          items,
          pageInfo: {
            __typename: 'PageInfo',
            endCursor: items.at(-1)?.id ?? null,
            hasNextPage: items.length > 0,
          },
        },
      },
    },
  }
}

function subscriptionMock(
  liveFeedback: FeedbackAddedSubscription['feedbackAdded'],
  delay: number,
  delivered = vi.fn(),
): MockedResponse {
  return {
    delay,
    request: {
      query: FeedbackAddedDocument,
      variables: { eventId },
    },
    result: () => {
      delivered()

      return { data: { feedbackAdded: liveFeedback } }
    },
  }
}

function renderExperience(mocks: MockedResponse[]) {
  render(
    <MockedProvider cache={createApolloCache()} mocks={mocks}>
      <EventFeedbackExperience eventId={eventId} />
    </MockedProvider>,
  )
}

describe('EventFeedbackExperience', () => {
  it('prepends event-scoped subscription feedback while the reader is at the top', async () => {
    const persisted = feedback('F-persisted', 'Persisted response')
    const live = feedback('F-live', 'Live response')
    renderExperience([
      feedbackQueryMock([persisted]),
      subscriptionMock(live, 50),
    ])

    expect(await screen.findByText(persisted.text)).toBeInTheDocument()
    expect(await screen.findByText(live.text)).toBeInTheDocument()
    expect(
      screen.getAllByRole('article').map(({ textContent }) => textContent),
    ).toEqual([
      expect.stringContaining(live.text),
      expect.stringContaining(persisted.text),
    ])
  })

  it('buffers live feedback while reading older responses and reveals it once', async () => {
    const persisted = feedback('F-persisted', 'Persisted response')
    const live = feedback('F-live', 'Buffered live response')
    renderExperience([
      feedbackQueryMock([persisted]),
      subscriptionMock(live, 100),
    ])
    const user = userEvent.setup()

    await screen.findByText(persisted.text)
    const scrollRegion = screen.getByRole('region', {
      name: 'Feedback responses',
    })
    fireEvent.scroll(scrollRegion, { target: { scrollTop: 120 } })

    const revealButton = await screen.findByRole('button', {
      name: '1 new response',
    })
    expect(screen.queryByText(live.text)).not.toBeInTheDocument()

    await user.click(revealButton)

    expect(await screen.findByText(live.text)).toBeInTheDocument()
    expect(scrollRegion.scrollTop).toBe(0)
    expect(
      screen.queryByRole('button', { name: '1 new response' }),
    ).not.toBeInTheDocument()
  })

  it('automatically reveals buffered feedback after scrolling back to the top', async () => {
    const persisted = feedback('F-persisted', 'Persisted response')
    const live = feedback('F-live', 'Automatically revealed response')
    renderExperience([
      feedbackQueryMock([persisted]),
      subscriptionMock(live, 100),
    ])

    await screen.findByText(persisted.text)
    const scrollRegion = screen.getByRole('region', {
      name: 'Feedback responses',
    })
    fireEvent.scroll(scrollRegion, { target: { scrollTop: 120 } })

    expect(
      await screen.findByRole('button', { name: '1 new response' }),
    ).toBeInTheDocument()
    expect(screen.queryByText(live.text)).not.toBeInTheDocument()

    fireEvent.scroll(scrollRegion, { target: { scrollTop: 0 } })

    expect(await screen.findByText(live.text)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '1 new response' }),
    ).not.toBeInTheDocument()
  })

  it('keeps live feedback outside a non-matching rating view', async () => {
    const persisted = feedback('F-persisted', 'Persisted response', 4)
    const threeStarLive = feedback('F-live', 'Three-star live response', 3)
    const delivered = vi.fn()
    renderExperience([
      feedbackQueryMock([persisted]),
      feedbackQueryMock([], 5),
      subscriptionMock(threeStarLive, 100, delivered),
    ])
    const user = userEvent.setup()

    await screen.findByText(persisted.text)
    await user.click(screen.getByRole('button', { name: '5 stars' }))
    await screen.findByText(
      'No 5-star feedback yet. Try another rating or show all feedback.',
    )
    await waitFor(() => expect(delivered).toHaveBeenCalledOnce())

    expect(screen.queryByText(threeStarLive.text)).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /new response/ }),
    ).not.toBeInTheDocument()
  })

  it('shows a submitted response immediately and deduplicates its subscription echo', async () => {
    const submitted = feedback('F-submitted', 'Submitted live response')
    const delivered = vi.fn()
    renderExperience([
      feedbackQueryMock([]),
      subscriptionMock(submitted, 300, delivered),
      {
        request: {
          query: SubmitFeedbackDocument,
          variables: {
            input: {
              eventId,
              rating: 5,
              text: submitted.text,
            },
          },
        },
        result: {
          data: {
            submitFeedback: {
              feedback: submitted,
              errors: [],
            },
          },
        },
      },
    ])
    const user = userEvent.setup()

    await screen.findByText(
      'No feedback yet. Be the first to share a response.',
    )
    await user.click(screen.getByRole('radio', { name: '5 stars' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Feedback' }),
      submitted.text,
    )
    await user.click(screen.getByRole('button', { name: 'Submit feedback' }))

    expect(await screen.findByText(submitted.text)).toBeInTheDocument()
    await waitFor(() => expect(delivered).toHaveBeenCalledOnce(), {
      timeout: 600,
    })
    expect(screen.getAllByText(submitted.text)).toHaveLength(1)
  })
})
