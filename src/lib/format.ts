export function formatDuration(sec: number): string {
  // Real timings arrive as floats; never show the reader 29.543000000000006.
  const total = Math.max(0, Math.round(sec))
  if (total < 60) return `${total}s`
  const m = Math.floor(total / 60)
  return `${m}m ${String(total % 60).padStart(2, '0')}s`
}

export function formatUsd(usd: number | null): string {
  if (usd === null) return '—'
  if (usd === 0) return '$0.00'
  return usd < 0.01 ? `$${usd.toFixed(4)}` : `$${usd.toFixed(2)}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  const days = Math.floor((Date.parse('2026-08-27T12:00:00Z') - then) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 30) return `${days} days ago`
  return formatDate(iso)
}
