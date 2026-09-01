import type { Modality, Output } from '../types'

export interface GenerateRequest {
  modelId: string
  /** The provider-native model identifier, e.g. "anthropic/claude-opus-4.8". */
  providerModel: string
  modality: Modality
  prompt: string
  /** Reasoning effort, when the caller asked for one and the model takes it. */
  effort?: string
  signal: AbortSignal
}

export interface GenerateResult {
  output: Output
  tokensIn: number
  tokensOut: number
  /** Null when the provider does not report spend for this call. */
  costUsd: number | null
}

/**
 * The seam that keeps the product independent of any one vendor — and the same
 * seam that later lets a hosted plan swap the user's key for ours without the
 * rest of the app knowing.
 */
export interface Provider {
  id: string
  label: string
  /** What this provider can actually produce. */
  modalities: Modality[]
  /** How a user turns it on. */
  keyEnvVar: string
  docsUrl: string
  isConfigured(): boolean
  generate(req: GenerateRequest): Promise<GenerateResult>
  /**
   * Every model this provider can reach, if it publishes a list. Lets the
   * picker offer the long tail without anyone editing the curated catalogue.
   * Providers with no list endpoint (fal.ai) simply omit this, and the picker
   * falls back to accepting a raw model id.
   */
  listModels?(): Promise<ProviderModel[]>
}

export interface ProviderModel {
  /** The identifier this provider expects on the wire. */
  id: string
  label: string
  modalities: Modality[]
  /** Whether the model accepts a reasoning effort. */
  reasoning?: boolean
  /** USD per million tokens, when the provider publishes it. */
  price?: { in: number; out: number }
}
