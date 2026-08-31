import type { Modality, Output } from '../types'

export interface GenerateRequest {
  modelId: string
  /** The provider-native model identifier, e.g. "anthropic/claude-opus-4.8". */
  providerModel: string
  modality: Modality
  prompt: string
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
}
