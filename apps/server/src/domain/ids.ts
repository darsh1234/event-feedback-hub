import { isValid, monotonicFactory } from 'ulid'

const generateMonotonicUlid = monotonicFactory()

function createId(prefix: 'E' | 'F', seedTime?: number): string {
  return `${prefix}-${generateMonotonicUlid(seedTime)}`
}

function isPrefixedUlid(value: string, prefix: 'E' | 'F'): boolean {
  return value.startsWith(`${prefix}-`) && isValid(value.slice(2))
}

export function createEventId(seedTime?: number): string {
  return createId('E', seedTime)
}

export function createFeedbackId(seedTime?: number): string {
  return createId('F', seedTime)
}

export function isEventId(value: string): boolean {
  return isPrefixedUlid(value, 'E')
}

export function isFeedbackId(value: string): boolean {
  return isPrefixedUlid(value, 'F')
}
