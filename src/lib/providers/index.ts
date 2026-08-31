import { createCompatibleProvider } from './openai-compatible'
import type { Provider } from './types'
import type { Modality } from '../types'

/**
 * The provider registry.
 *
 * To add an integration, push a Provider onto this array. If the service speaks
 * the OpenAI chat-completions dialect (most aggregators do — Together, Groq,
 * Fireworks, AtlasCloud), `createCompatibleProvider` gets you there in a few
 * lines. Anything else — a video house like fal.ai or Replicate, or a native
 * SDK — implements the four-member `Provider` interface directly. Nothing else
 * in the app needs to change; see PROVIDERS.md.
 */
export const PROVIDERS: Provider[] = [
  createCompatibleProvider({
    id: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyEnvVar: 'OPENROUTER_API_KEY',
    docsUrl: 'https://openrouter.ai/keys',
    modalities: ['code', 'content', 'image'],
    requestUsageAccounting: true,
    supportsImageModality: true,
    // OpenRouter shows these on its public app rankings and in your usage
    // dashboard; APP_URL lets a deployment identify itself as the real site.
    headers: {
      'HTTP-Referer': process.env.APP_URL ?? 'https://compare.run',
      'X-Title': 'compare.run',
    },
  }),
]

/** Configured providers that can produce this kind of work. */
export function providersFor(modality: Modality): Provider[] {
  return PROVIDERS.filter((p) => p.modalities.includes(modality) && p.isConfigured())
}

export interface ProviderStatus {
  id: string
  label: string
  modalities: Modality[]
  configured: boolean
  keyEnvVar: string
  docsUrl: string
}

export function providerStatuses(): ProviderStatus[] {
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    modalities: p.modalities,
    configured: p.isConfigured(),
    keyEnvVar: p.keyEnvVar,
    docsUrl: p.docsUrl,
  }))
}

/** Modalities no configured provider can serve, so the UI can say why. */
export function unsupportedModalities(): Modality[] {
  const all: Modality[] = ['code', 'content', 'video', 'image']
  return all.filter((m) => providersFor(m).length === 0)
}

export type { Provider } from './types'
