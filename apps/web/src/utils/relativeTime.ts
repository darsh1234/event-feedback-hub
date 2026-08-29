const minuteInMilliseconds = 60_000
const hourInMilliseconds = 60 * minuteInMilliseconds
const dayInMilliseconds = 24 * hourInMilliseconds

function formatUnit(value: number, unit: string) {
  return `${value.toLocaleString()} ${unit}${value === 1 ? '' : 's'} ago`
}

export function formatRelativeTime(createdAt: string, now = Date.now()) {
  const createdAtTime = Date.parse(createdAt)

  if (!Number.isFinite(createdAtTime)) {
    return 'Unknown time'
  }

  const elapsed = Math.max(0, now - createdAtTime)

  if (elapsed < minuteInMilliseconds) {
    return 'Just now'
  }

  if (elapsed < hourInMilliseconds) {
    return formatUnit(Math.floor(elapsed / minuteInMilliseconds), 'minute')
  }

  if (elapsed < dayInMilliseconds) {
    return formatUnit(Math.floor(elapsed / hourInMilliseconds), 'hour')
  }

  const days = Math.floor(elapsed / dayInMilliseconds)

  if (days < 30) {
    return formatUnit(days, 'day')
  }

  if (days < 365) {
    return formatUnit(Math.floor(days / 30), 'month')
  }

  return formatUnit(Math.floor(days / 365), 'year')
}

export function formatAbsoluteTime(createdAt: string) {
  const date = new Date(createdAt)

  return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString()
}
