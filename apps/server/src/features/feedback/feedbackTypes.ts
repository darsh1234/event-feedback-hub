/** Persisted shape returned by feedback queries and insertions. */
export interface FeedbackRecord {
  id: string
  eventId: string
  text: string
  rating: number
  createdAt: string
}

/** Complete server-owned record required for a feedback insertion. */
export type CreateFeedbackRecord = FeedbackRecord

/** Persistence-level filters and cursor boundary for a feedback page. */
export interface ListFeedbackRecordsInput {
  eventId: string
  rating?: number
  first: number
  afterId?: string
}

/** Repository page before the service converts its boundary into a cursor. */
export interface FeedbackRecordPage {
  items: FeedbackRecord[]
  hasNextPage: boolean
}
