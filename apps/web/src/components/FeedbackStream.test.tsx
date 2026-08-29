import type { MockedResponse } from '@apollo/client/testing'
import { MockedProvider } from '@apollo/client/testing/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { createApolloCache } from '../apollo/client'
import {
  FeedbackDocument,
  type FeedbackQuery,
  type FeedbackQueryVariables,
} from '../graphql/generated/graphql'
import { FeedbackStream } from './FeedbackStream'

type FeedbackItem = FeedbackQuery['feedback']['items'][number]

const eventId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'

function feedbackItem(id: string, text: string, rating: number): FeedbackItem {
  return {
    __typename: 'Feedback',
    id,
    event: {
      __typename: 'Event',
      id: eventId,
      name: 'Document Intelligence Workshop',
    },
    text,
    rating,
    createdAt: '2026-08-29T19:55:00.000Z',
  }
}

function feedbackMock({
  variables,
  items,
  endCursor = null,
  hasNextPage = false,
  delay,
  error,
}: {
  variables: FeedbackQueryVariables
  items?: FeedbackItem[]
  endCursor?: string | null
  hasNextPage?: boolean
  delay?: number
  error?: Error
}): MockedResponse<FeedbackQuery, FeedbackQueryVariables> {
  const request = {
    query: FeedbackDocument,
    variables,
  }

  if (error !== undefined) {
    return { error, request }
  }

  const data: FeedbackQuery = {
    feedback: {
      __typename: 'FeedbackConnection',
      items: items ?? [],
      pageInfo: {
        __typename: 'PageInfo',
        endCursor,
        hasNextPage,
      },
    },
  }

  return {
    ...(delay === undefined ? {} : { delay }),
    request: {
      query: FeedbackDocument,
      variables,
    },
    result: { data },
  }
}

function renderStream(
  mocks: MockedResponse<FeedbackQuery, FeedbackQueryVariables>[],
) {
  render(
    <MockedProvider cache={createApolloCache()} mocks={mocks}>
      <FeedbackStream eventId={eventId} />
    </MockedProvider>,
  )
}

describe('FeedbackStream', () => {
  it('shows an initial loading state and then renders persisted feedback', async () => {
    const newest = feedbackItem('F-newest', 'Newest persisted feedback', 5)
    const older = feedbackItem('F-older', 'Older persisted feedback', 3)
    renderStream([
      feedbackMock({
        variables: { eventId, first: 20 },
        items: [newest, older],
        delay: 50,
      }),
    ])

    expect(screen.getByText('Loading feedback…')).toBeInTheDocument()
    expect(await screen.findByText(newest.text)).toBeInTheDocument()
    expect(screen.getByText(older.text)).toBeInTheDocument()
    expect(
      screen.getAllByRole('article').map(({ textContent }) => textContent),
    ).toEqual([
      expect.stringContaining(newest.text),
      expect.stringContaining(older.text),
    ])
    const timestamp = document.querySelector('time')
    expect(timestamp).toHaveAttribute('datetime', newest.createdAt)
    expect(timestamp).toHaveAttribute('title')
  })

  it('renders an empty event state', async () => {
    renderStream([
      feedbackMock({ variables: { eventId, first: 20 }, items: [] }),
    ])

    expect(
      await screen.findByText(
        'No feedback yet. Be the first to share a response.',
      ),
    ).toBeInTheDocument()
  })

  it('keeps rating filters isolated and clears a filtered empty state', async () => {
    const threeStar = feedbackItem('F-three', 'Three-star response', 3)
    const variables = { eventId, first: 20 }
    const user = userEvent.setup()
    renderStream([
      feedbackMock({ variables, items: [threeStar] }),
      feedbackMock({ variables: { ...variables, rating: 5 }, items: [] }),
      feedbackMock({ variables, items: [threeStar] }),
    ])
    expect(await screen.findByText(threeStar.text)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '5 stars' }))

    expect(
      await screen.findByText(
        'No 5-star feedback yet. Try another rating or show all feedback.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(threeStar.text)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Show all feedback' }))

    expect(await screen.findByText(threeStar.text)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('appends older feedback without duplicating an existing item', async () => {
    const newest = feedbackItem('F-newest', 'Newest response', 5)
    const boundary = feedbackItem('F-boundary', 'Boundary response', 4)
    const oldest = feedbackItem('F-oldest', 'Oldest response', 3)
    const user = userEvent.setup()
    renderStream([
      feedbackMock({
        variables: { eventId, first: 20 },
        items: [newest, boundary],
        endCursor: 'cursor-boundary',
        hasNextPage: true,
      }),
      feedbackMock({
        variables: { eventId, first: 20, after: 'cursor-boundary' },
        items: [boundary, oldest],
        endCursor: 'cursor-oldest',
      }),
    ])
    await screen.findByText(boundary.text)

    await user.click(
      screen.getByRole('button', { name: 'Load older feedback' }),
    )

    expect(await screen.findByText(oldest.text)).toBeInTheDocument()
    expect(screen.getAllByText(boundary.text)).toHaveLength(1)
    expect(
      screen.queryByRole('button', { name: 'Load older feedback' }),
    ).not.toBeInTheDocument()
  })

  it('retains feedback after pagination failure and retries the same cursor', async () => {
    const newest = feedbackItem('F-newest', 'Still-visible response', 5)
    const oldest = feedbackItem('F-oldest', 'Recovered older response', 2)
    const initialVariables = { eventId, first: 20 }
    const pageVariables = { ...initialVariables, after: 'cursor-newest' }
    const user = userEvent.setup()
    renderStream([
      feedbackMock({
        variables: initialVariables,
        items: [newest],
        endCursor: 'cursor-newest',
        hasNextPage: true,
      }),
      feedbackMock({
        variables: pageVariables,
        error: new Error('Pagination unavailable'),
      }),
      feedbackMock({
        variables: pageVariables,
        items: [oldest],
        endCursor: 'cursor-oldest',
      }),
    ])
    expect(await screen.findByText(newest.text)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Load older feedback' }),
    )

    expect(
      await screen.findByText(
        "We couldn't load older feedback. Your current feedback is still here.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(newest.text)).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', {
        name: 'Retry loading older feedback',
      }),
    )

    expect(await screen.findByText(oldest.text)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers a retry after the initial request fails', async () => {
    const recovered = feedbackItem('F-recovered', 'Recovered response', 4)
    const variables = { eventId, first: 20 }
    const user = userEvent.setup()
    renderStream([
      feedbackMock({
        variables,
        error: new Error('Feedback unavailable'),
      }),
      feedbackMock({ variables, items: [recovered] }),
    ])

    expect(
      await screen.findByText("We couldn't load feedback for this event."),
    ).toBeInTheDocument()
    expect(screen.queryByText('Loading feedback…')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry' }))

    expect(await screen.findByText(recovered.text)).toBeInTheDocument()
    await waitFor(() =>
      expect(
        screen.queryByText("We couldn't load feedback for this event."),
      ).not.toBeInTheDocument(),
    )
  })
})
