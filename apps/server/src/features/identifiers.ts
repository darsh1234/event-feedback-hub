import { isValid, monotonicFactory } from 'ulid'

const generateMonotonicUlid = monotonicFactory()

function createId(prefix: 'E' | 'F', seedTime?: number): string {
  return `${prefix}-${generateMonotonicUlid(seedTime)}`
}

function isPrefixedUlid(value: string, prefix: 'E' | 'F'): boolean {
  return value.startsWith(`${prefix}-`) && isValid(value.slice(2))
}

/** Generates an event ID whose prefix makes its feature visible in logs. */
export function createEventId(seedTime?: number): string {
  return createId('E', seedTime)
}

/** Generates a time-sortable feedback ID using the shared monotonic factory. */
export function createFeedbackId(seedTime?: number): string {
  return createId('F', seedTime)
}

/** Checks both the event prefix and the embedded ULID structure. */
export function isEventId(value: string): boolean {
  return isPrefixedUlid(value, 'E')
}

/** Checks both the feedback prefix and the embedded ULID structure. */
export function isFeedbackId(value: string): boolean {
  return isPrefixedUlid(value, 'F')
}
