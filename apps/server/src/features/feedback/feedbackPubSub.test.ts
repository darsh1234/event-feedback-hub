import { describe, expect, it } from 'vitest'

import type { FeedbackRecord } from './feedbackTypes.js'
import { createFeedbackPubSub } from './feedbackPubSub.js'

const workshopId = 'E-01JGFJJZ000JX0K3SAK84YSW4T'
const webinarId = 'E-01JGFJJZZ832B8E8AQ4P779QN7'

function createFeedback(
  id: string,
  eventId: string,
  text: string,
): FeedbackRecord {
  return {
    id,
    eventId,
    text,
    rating: 5,
    createdAt: '2100-01-01T00:00:00.000Z',
  }
}

describe('feedback publish/subscribe', () => {
  it('fans out feedback to every subscriber for the event', async () => {
    const feedbackPubSub = createFeedbackPubSub()
    const firstSubscription = feedbackPubSub.subscribe(workshopId)
    const secondSubscription = feedbackPubSub.subscribe(workshopId)
    const feedback = createFeedback(
      'F-01Q3E4VKC0067D5MS62GJ7BR6W',
      workshopId,
      'Shared live feedback.',
    )
    const firstResult = firstSubscription.next()
    const secondResult = secondSubscription.next()

    feedbackPubSub.publish(feedback)

    expect(await firstResult).toEqual({ done: false, value: feedback })
    expect(await secondResult).toEqual({ done: false, value: feedback })
    await firstSubscription.return?.()
    await secondSubscription.return?.()
  })

  it('delivers feedback only to subscribers for the matching event', async () => {
    const feedbackPubSub = createFeedbackPubSub()
    const workshopSubscription = feedbackPubSub.subscribe(workshopId)
    const webinarSubscription = feedbackPubSub.subscribe(webinarId)
    const workshopResult = workshopSubscription.next()
    const webinarResult = webinarSubscription.next()
    const workshopFeedback = createFeedback(
      'F-01Q3E4VKC0067D5MS62GJ7BR6W',
      workshopId,
      'Workshop feedback.',
    )
    const webinarFeedback = createFeedback(
      'F-01Q3E4VMBC0671G62H1W1GAMDN',
      webinarId,
      'Webinar feedback.',
    )

    feedbackPubSub.publish(workshopFeedback)
    expect(await workshopResult).toEqual({
      done: false,
      value: workshopFeedback,
    })

    feedbackPubSub.publish(webinarFeedback)
    expect(await webinarResult).toEqual({
      done: false,
      value: webinarFeedback,
    })

    await workshopSubscription.return?.()
    await webinarSubscription.return?.()
  })

  it('queues feedback published before a subscriber requests its next value', async () => {
    const feedbackPubSub = createFeedbackPubSub()
    const subscription = feedbackPubSub.subscribe(workshopId)
    const feedback = createFeedback(
      'F-01Q3E4VKC0067D5MS62GJ7BR6W',
      workshopId,
      'Queued feedback.',
    )

    feedbackPubSub.publish(feedback)

    expect(await subscription.next()).toEqual({ done: false, value: feedback })
    await subscription.return?.()
    expect(await subscription.next()).toEqual({
      done: true,
      value: undefined,
    })
  })
})
