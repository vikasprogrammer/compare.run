import type { CodeOutput, ContentOutput, ImageOutput, Output } from '../types'
import type { GenerateRequest, GenerateResult, Provider, ProviderModel } from './types'
import type { Modality } from '../types'

/**
 * Most inference aggregators speak the same OpenAI chat-completions dialect, so
 * a provider is really just a base URL, a key, and a few quirks. Adding Together,
 * Groq or Fireworks is a handful of lines rather than a new adapter.
 */
export interface CompatibleOptions {
  id: string
  label: string
  baseUrl: string
  keyEnvVar: string
  docsUrl: string
  modalities: Modality[]
  /** OpenRouter returns real spend when asked; most others do not. */
  requestUsageAccounting?: boolean
  /** OpenRouter needs an explicit opt-in to return images. */
  supportsImageModality?: boolean
  /** Set when the service exposes GET {baseUrl}/models. */
  listsModels?: boolean
  headers?: Record<string, string>
}

const SYSTEM_CODE = `You are being compared against other models on an identical prompt.
Return ONLY a JSON object, no prose and no code fences, shaped exactly like:
{"summary": "one or two sentences on what you built and any judgement calls",
 "files": [{"path": "index.html", "language": "html", "content": "..."}]}
Write complete, runnable files. Do not truncate or leave placeholder comments.`

const SYSTEM_CONTENT = `You are being compared against other models on an identical prompt.
Respond with the finished piece only - no preamble, no meta-commentary, no markdown fences.
Open with a single title line, then the body in paragraphs separated by blank lines.
Use "## " to start a section heading.`

interface RemoteModel {
  id: string
  name?: string
  architecture?: { output_modalities?: string[] }
  pricing?: { prompt?: string; completion?: string }
}

/**
 * Maps a provider's own listing onto our modalities. Text output covers both
 * code and prose; anything that can emit an image gets the image modality too.
 */
function toProviderModel(m: RemoteModel): ProviderModel {
  const out = m.architecture?.output_modalities ?? ['text']
  const modalities: Modality[] = []
  if (out.includes('text')) modalities.push('code', 'content')
  if (out.includes('image')) modalities.push('image')

  const inPrice = Number(m.pricing?.prompt ?? 0) * 1e6
  const outPrice = Number(m.pricing?.completion ?? 0) * 1e6
  return {
    id: m.id,
    label: m.name ?? m.id,
    modalities,
    ...(inPrice > 0 || outPrice > 0 ? { price: { in: inPrice, out: outPrice } } : {}),
  }
}

interface ChatResponse {
  choices?: {
    message?: { content?: string | null; images?: { image_url?: { url?: string } }[] }
  }[]
  usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number }
  error?: { message?: string; code?: number; metadata?: Record<string, unknown> } | string
  msg?: string
}

/** Upstream capacity problems, not our request. Worth another go. */
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504])
const MAX_ATTEMPTS = 3

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * A comparison is ruined if one model drops out for a reason that had nothing
 * to do with the model, so transient upstream failures get a second and third
 * chance before the result is called a failure.
 */
async function withRetry<T>(label: string, attempt: (n: number) => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let n = 1; n <= MAX_ATTEMPTS; n++) {
    try {
      return await attempt(n)
    } catch (err) {
      lastError = err
      const status = err instanceof TransientError ? err.status : null
      if (status === null || n === MAX_ATTEMPTS) break
      // 0.6s, then 1.8s — enough for a rate limit window to roll over.
      await sleep(600 * 3 ** (n - 1))
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`${label} failed`)
}

class TransientError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export function createCompatibleProvider(opts: CompatibleOptions): Provider {
  return {
    id: opts.id,
    label: opts.label,
    modalities: opts.modalities,
    keyEnvVar: opts.keyEnvVar,
    docsUrl: opts.docsUrl,

    isConfigured() {
      return Boolean(process.env[opts.keyEnvVar])
    },

    ...(opts.listsModels
      ? {
          async listModels(): Promise<ProviderModel[]> {
            const key = process.env[opts.keyEnvVar]
            if (!key) return []
            const res = await fetch(`${opts.baseUrl}/models`, {
              headers: { authorization: `Bearer ${key}`, ...opts.headers },
            })
            if (!res.ok) return []
            const body = (await res.json()) as { data?: RemoteModel[] }
            return (body.data ?? []).map(toProviderModel).filter((m) => m.modalities.length > 0)
          },
        }
      : {}),

    async generate(req: GenerateRequest): Promise<GenerateResult> {
      const key = process.env[opts.keyEnvVar]
      if (!key) throw new Error(`${opts.keyEnvVar} is not set`)

      const isImage = req.modality === 'image'
      const system = req.modality === 'code' ? SYSTEM_CODE : SYSTEM_CONTENT

      const body: Record<string, unknown> = {
        model: req.providerModel,
        messages: isImage
          ? [{ role: 'user', content: req.prompt }]
          : [
              { role: 'system', content: system },
              { role: 'user', content: req.prompt },
            ],
      }
      if (opts.requestUsageAccounting) body.usage = { include: true }
      if (isImage && opts.supportsImageModality) body.modalities = ['image', 'text']
      if (req.modality === 'code') body.response_format = { type: 'json_object' }

      const json = await withRetry(opts.label, async () => {
        const res = await fetch(`${opts.baseUrl}/chat/completions`, {
          method: 'POST',
          signal: req.signal,
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
            ...opts.headers,
          },
          body: JSON.stringify(body),
        })

        const raw = await res.text()
        let parsed: ChatResponse
        try {
          parsed = JSON.parse(raw) as ChatResponse
        } catch {
          const message = `${opts.label} returned ${res.status}: ${raw.slice(0, 200)}`
          throw RETRYABLE.has(res.status) ? new TransientError(message, res.status) : new Error(message)
        }

        const err = typeof parsed.error === 'string' ? { message: parsed.error } : parsed.error
        const errText = err?.message ?? (res.ok ? null : parsed.msg)
        if (!res.ok || errText) {
          // OpenRouter hides the real cause in metadata; surfacing it is the
          // difference between "Provider returned error" and a fixable message.
          const meta = err?.metadata ?? {}
          const upstream =
            (typeof meta.raw === 'string' && meta.raw.slice(0, 200)) ||
            (typeof meta.provider_name === 'string' ? `upstream ${meta.provider_name}` : '')
          const status = err?.code ?? res.status
          const message = [`${opts.label} ${status}`, errText, upstream].filter(Boolean).join(' — ')
          throw RETRYABLE.has(Number(status)) ? new TransientError(message, Number(status)) : new Error(message)
        }
        return parsed
      })

      const message = json.choices?.[0]?.message
      const text = message?.content ?? ''
      const usage = json.usage ?? {}

      let output: Output
      if (isImage) output = toImageOutput(text, message?.images ?? [])
      else if (req.modality === 'code') output = toCodeOutput(text)
      else output = toContentOutput(text)

      return {
        output,
        tokensIn: usage.prompt_tokens ?? 0,
        tokensOut: usage.completion_tokens ?? 0,
        costUsd: typeof usage.cost === 'number' ? usage.cost : null,
      }
    },
  }
}

// ---------------------------------------------------------------- parsing ---

/** Models wrap JSON in prose or fences despite being told not to. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end <= start) return null
    try {
      return JSON.parse(candidate.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

function toCodeOutput(text: string): CodeOutput {
  const parsed = extractJson(text) as
    | { summary?: string; files?: { path?: string; language?: string; content?: string }[] }
    | null

  const files = (parsed?.files ?? [])
    .filter((f) => f?.path && typeof f.content === 'string')
    .map((f) => ({
      path: String(f.path),
      language: String(f.language ?? guessLanguage(String(f.path))),
      content: String(f.content),
    }))

  // If the model ignored the contract, keep what it said rather than lose it.
  if (files.length === 0) {
    return {
      kind: 'code',
      summary: parsed?.summary ?? 'Returned prose instead of the requested file structure.',
      files: [{ path: 'response.md', language: 'markdown', content: text }],
      tests: null,
      preview: null,
    }
  }

  return {
    kind: 'code',
    summary: parsed?.summary ?? `Produced ${files.length} file${files.length === 1 ? '' : 's'}.`,
    files,
    tests: null,
    preview: buildPreview(files),
  }
}

/** Inlines the model's own CSS and JS so the preview needs no file server. */
function buildPreview(files: { path: string; content: string }[]): CodeOutput['preview'] {
  const html = files.find((f) => /\.html?$/i.test(f.path))
  if (!html) return null
  const css = files.filter((f) => /\.css$/i.test(f.path)).map((f) => f.content).join('\n')
  const js = files.filter((f) => /\.m?js$/i.test(f.path)).map((f) => f.content).join('\n')
  return { kind: 'html', html: html.content, css, js }
}

function guessLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  return (
    {
      html: 'html', css: 'css', js: 'javascript', mjs: 'javascript', ts: 'typescript',
      tsx: 'tsx', py: 'python', json: 'json', md: 'markdown', sh: 'bash',
    }[ext] ?? 'text'
  )
}

function toContentOutput(text: string): ContentOutput {
  const clean = text.replace(/^```[\w]*\n?/, '').replace(/```$/, '').trim()
  const lines = clean.split('\n')
  const firstLine = (lines[0] ?? '').replace(/^#+\s*/, '').trim()
  const rest = lines.slice(1).join('\n').trim()

  // Only treat the opening line as a title when it reads like one: short, and
  // with a body after it. A model that answers in a single paragraph has no
  // title, and taking its whole answer as one renders the text twice.
  const isTitle = firstLine.length > 0 && firstLine.length <= 100 && rest.length > 0
  const title = isTitle ? firstLine : ''
  const body = isTitle ? rest : clean

  const sections: ContentOutput['sections'] = []
  let heading: string | null = null
  let paragraphs: string[] = []
  const flush = () => {
    if (heading || paragraphs.length) sections.push({ heading, paragraphs })
    paragraphs = []
  }

  for (const block of body.split(/\n{2,}/)) {
    const b = block.trim()
    if (!b) continue
    if (/^#{2,}\s/.test(b)) {
      flush()
      heading = b.replace(/^#+\s*/, '')
    } else {
      paragraphs.push(b.replace(/\n/g, ' '))
    }
  }
  flush()

  const words = clean.split(/\s+/).filter(Boolean).length

  // The opening paragraph becomes the deck, so it must always be lifted out of
  // the body — otherwise a single-paragraph piece renders twice.
  const deck = sections[0]?.paragraphs[0] ?? ''
  if (sections[0]) {
    sections[0] = { ...sections[0], paragraphs: sections[0].paragraphs.slice(1) }
    if (!sections[0].heading && sections[0].paragraphs.length === 0) sections.shift()
  }

  const count = sections.length || 1
  return {
    kind: 'content',
    summary: `${words} words across ${count} section${count === 1 ? '' : 's'}.`,
    title,
    deck,
    sections: sections.length ? sections : [{ heading: null, paragraphs: [clean] }],
    wordCount: words,
    readingMinutes: Math.max(1, Math.round(words / 220)),
    tone: '—',
  }
}

function toImageOutput(text: string, images: { image_url?: { url?: string } }[]): ImageOutput {
  const urls = images.map((i) => i.image_url?.url).filter((u): u is string => Boolean(u))
  return {
    kind: 'image',
    summary: urls.length
      ? `Returned ${urls.length} image${urls.length === 1 ? '' : 's'}.`
      : text.trim() || 'The model returned no image.',
    size: '—',
    images: urls.map((url, i) => ({ url, caption: `Variation ${i + 1}`, seed: String(i) })),
  }
}
