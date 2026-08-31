import type { VideoOutput } from '../types'
import type { GenerateRequest, GenerateResult, Provider } from './types'

const QUEUE = 'https://queue.fal.run'
const POLL_MS = 3000

interface SubmitResponse {
  request_id?: string
  status_url?: string
  response_url?: string
  cancel_url?: string
  detail?: unknown
}

interface StatusResponse {
  status?: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED'
  queue_position?: number
  detail?: unknown
}

/** What the video models hand back. Field names vary a little between them. */
interface VideoResult {
  video?: { url?: string; content_type?: string; file_size?: number }
  videos?: { url?: string }[]
  duration?: number
  seed?: number
  detail?: unknown
}

/**
 * fal.ai — the video provider.
 *
 * Unlike a chat completion this is submit-then-poll: fal enqueues the job and
 * hands back three URLs, so we follow those rather than rebuilding paths, which
 * matters because model ids contain slashes (`fal-ai/kling-video/v2.5-turbo/...`)
 * and the status path uses only the first two segments.
 */
export const fal: Provider = {
  id: 'fal',
  label: 'fal.ai',
  modalities: ['video'],
  keyEnvVar: 'FAL_KEY',
  docsUrl: 'https://fal.ai/dashboard/keys',

  isConfigured() {
    return Boolean(process.env.FAL_KEY)
  },

  async generate(req: GenerateRequest): Promise<GenerateResult> {
    const key = process.env.FAL_KEY
    if (!key) throw new Error('FAL_KEY is not set')
    const headers = { authorization: `Key ${key}`, 'content-type': 'application/json' }

    // --- submit ---
    const submitRes = await fetch(`${QUEUE}/${req.providerModel}`, {
      method: 'POST',
      headers,
      signal: req.signal,
      body: JSON.stringify({ prompt: req.prompt }),
    })
    const submitted = (await submitRes.json()) as SubmitResponse
    if (!submitRes.ok || !submitted.request_id) {
      throw new Error(`fal.ai ${submitRes.status}: ${describe(submitted.detail)}`)
    }

    const statusUrl = submitted.status_url
    const responseUrl = submitted.response_url
    const cancelUrl = submitted.cancel_url
    if (!statusUrl || !responseUrl) throw new Error('fal.ai did not return a status URL')

    // Abandoning the run should stop the job, not just stop us watching it.
    const cancel = () => {
      if (cancelUrl) void fetch(cancelUrl, { method: 'PUT', headers }).catch(() => {})
    }
    req.signal.addEventListener('abort', cancel, { once: true })

    try {
      // --- poll ---
      for (;;) {
        if (req.signal.aborted) throw new Error('Cancelled')
        await sleep(POLL_MS, req.signal)

        const statusRes = await fetch(statusUrl, { headers, signal: req.signal })
        const status = (await statusRes.json()) as StatusResponse
        if (!statusRes.ok) throw new Error(`fal.ai ${statusRes.status}: ${describe(status.detail)}`)
        if (status.status === 'COMPLETED') break
      }

      // --- collect ---
      const resultRes = await fetch(responseUrl, { headers, signal: req.signal })
      const result = (await resultRes.json()) as VideoResult

      // A job can finish "successfully" and still carry a validation error, so
      // the absence of a video is the real success test.
      const url = result.video?.url ?? result.videos?.[0]?.url
      if (!url) throw new Error(`fal.ai returned no video: ${describe(result.detail)}`)

      return {
        output: buildOutput(url, result, req.prompt),
        tokensIn: 0,
        tokensOut: 0,
        // fal prices per second of output and reports no cost on the response.
        // Leaving this null is honest; the UI renders a dash.
        costUsd: null,
      }
    } finally {
      req.signal.removeEventListener('abort', cancel)
    }
  },
}

function buildOutput(url: string, result: VideoResult, prompt: string): VideoOutput {
  const seconds = typeof result.duration === 'number' ? Math.round(result.duration) : 0
  return {
    kind: 'video',
    summary: prompt.length > 140 ? `${prompt.slice(0, 140)}…` : prompt,
    url,
    durationSec: seconds,
    resolution: '—',
    fps: 0,
    aspect: '16:9',
    // Only used as a backdrop when there is no file; a real clip renders itself.
    poster: ['#1b1f26', '#3a424e'],
    shots: [],
    audio: null,
  }
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new Error('Cancelled'))
      },
      { once: true },
    )
  })
}

function describe(detail: unknown): string {
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((d) => {
        const e = d as { loc?: string[]; msg?: string }
        return e.msg ? `${e.msg}${e.loc ? ` (${e.loc.join('.')})` : ''}` : JSON.stringify(d)
      })
      .join('; ')
  }
  return detail ? JSON.stringify(detail) : 'no detail'
}
