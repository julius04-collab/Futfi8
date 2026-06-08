import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

export function timeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatMatchTime(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return `Today ${format(d, 'HH:mm')}`
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`
  return format(d, 'd MMM HH:mm')
}

export function formatShortDate(date: string | Date): string {
  return format(new Date(date), 'd MMM yyyy')
}
