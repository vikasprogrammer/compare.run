export type Modality = 'code' | 'video' | 'content' | 'image'

export type RunStatus = 'complete' | 'running' | 'failed' | 'queued'

export interface ExperimentType {
  id: Modality
  label: string
  blurb: string
}

export interface PromptTemplate {
  id: string
  type: Modality
  title: string
  summary: string
  prompt: string
  tags: string[]
}

export interface Model {
  id: string
  label: string
  /** Who made the model, for display. */
  provider: string
  /** Which integration in the provider registry actually calls it. */
  providerId: string
  /** The identifier that provider expects on the wire. */
  providerModel: string
  modalities: Modality[]
  /** Short note on what this model is usually reached for. */
  note: string
  /** Published USD per million tokens, for an at-a-glance sense of cost. */
  price?: { in: number; out: number }
}

export interface Experiment {
  id: string
  title: string
  type: Modality
  prompt: string
  templateId: string | null
  modelIds: string[]
  createdAt: string
  updatedAt: string
}

export interface Run {
  id: string
  experimentId: string
  seq: number
  label: string
  startedAt: string
  status: RunStatus
  /**
   * What this run was actually given. Snapshotted here rather than read from
   * the experiment, so editing the prompt for a later run can never rewrite
   * what an earlier run claims it ran.
   */
  prompt: string
  modelIds: string[]
  /** What changed relative to the previous run, if anything. */
  note: string | null
  results: Result[]
}

export interface Result {
  modelId: string
  status: RunStatus
  durationSec: number
  costUsd: number | null
  tokensIn: number
  tokensOut: number
  /**
   * 1-5 human score. Always null today: there is no judgement layer yet, so
   * nothing writes this. Kept as the hook the feature will land on.
   */
  score: number | null
  output: Output
  error?: string
}

export type Output = CodeOutput | VideoOutput | ContentOutput | ImageOutput

export interface CodeOutput {
  kind: 'code'
  summary: string
  files: { path: string; language: string; content: string }[]
  tests: { passed: number; total: number } | null
  preview: PreviewSpec | null
}

export type PreviewSpec = SpecPreview | HtmlPreview

/** A hand-authored page description, rendered as a miniature layout. */
export interface SpecPreview {
  kind: 'spec'
  theme: 'light' | 'dark' | 'brand'
  brand: string
  headline: string
  sub: string
  cta: string
  blocks: { title: string; body: string }[]
  layout: 'stacked' | 'split' | 'grid'
}

/** What a model actually produced, rendered in a sandboxed iframe. */
export interface HtmlPreview {
  kind: 'html'
  html: string
  css: string
  js: string
}

export interface VideoOutput {
  kind: 'video'
  summary: string
  /** The generated clip, once a provider that produces one is connected. */
  url?: string
  durationSec: number
  resolution: string
  fps: number
  aspect: '16:9' | '9:16' | '1:1'
  /** Two stops used to draw the poster frame, so nothing is fetched. */
  poster: [string, string]
  shots: { at: number; description: string }[]
  audio: string | null
}

export interface ContentOutput {
  kind: 'content'
  summary: string
  title: string
  deck: string
  sections: { heading: string | null; paragraphs: string[] }[]
  wordCount: number
  readingMinutes: number
  tone: string
}

export interface ImageOutput {
  kind: 'image'
  summary: string
  size: string
  images: { url?: string; gradient?: [string, string, string]; caption: string; seed: string }[]
}

/** Bundled example runs, which inherit their snapshot from the experiment. */
export type SeedRun = Omit<Run, 'prompt' | 'modelIds'>
