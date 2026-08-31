import { modelById } from './catalog'
import { displayModel } from './model-name'
import { formatDuration, formatUsd } from './format'
import type { Run } from './types'

/**
 * What actually distinguishes one run from another in a list: how it went.
 * Every run of an experiment uses the same models, so naming them again on
 * each row says nothing.
 */
export function runSummary(run: Run): string {
  const done = run.results.filter((r) => r.status === 'complete')
  const failed = run.results.filter((r) => r.status === 'failed')
  const pending = run.results.filter((r) => r.status === 'running' || r.status === 'queued')

  if (pending.length) {
    const parts = [`${done.length} of ${run.results.length} done`]
    if (failed.length) parts.push(`${failed.length} failed`)
    return parts.join(', ')
  }
  if (failed.length) return `${done.length} complete, ${failed.length} failed`

  const judged = done.filter((r) => r.score !== null)
  if (!judged.length) return `${done.length} complete`
  const best = judged.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a))
  return `Best ${best.score}/5 — ${displayModel(best.modelId)}`
}

export function isRunActive(run: Run): boolean {
  return run.status === 'running' || run.results.some((r) => r.status === 'running' || r.status === 'queued')
}

/**
 * What a finished run cost, in the header slot. Wall clock is the slowest
 * model rather than the sum, because they run in parallel.
 */
export function runTotals(run: Run): string {
  const done = run.results.filter((r) => r.status === 'complete')
  const parts = [`${run.results.length} model${run.results.length === 1 ? '' : 's'}`]

  const priced = done.filter((r) => r.costUsd !== null)
  if (priced.length) {
    const total = priced.reduce((sum, r) => sum + (r.costUsd ?? 0), 0)
    // Say so when only some providers reported spend, rather than implying
    // the total covers every model.
    parts.push(priced.length === done.length ? formatUsd(total) : `${formatUsd(total)} of ${priced.length}`)
  }

  const slowest = done.reduce((max, r) => Math.max(max, r.durationSec), 0)
  if (slowest > 0) parts.push(formatDuration(slowest))

  return parts.join(' \u00b7 ')
}
