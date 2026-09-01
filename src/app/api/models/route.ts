import { NextResponse } from 'next/server'
import { MODELS } from '@/lib/catalog'
import { recentModelIds } from '@/lib/db'
import { PROVIDERS } from '@/lib/providers'
/** What the picker submits. Ad-hoc models use "providerId::providerModel". */
import type { PickerModel } from '@/lib/client'

export const dynamic = 'force-dynamic'

// A provider's catalogue changes rarely; refetching it per keystroke would be
// rude to them and slow for us.
const CACHE_MS = 10 * 60 * 1000
const g = globalThis as unknown as { __pgModels?: { at: number; value: PickerModel[] } }

export async function GET() {
  const cached = g.__pgModels
  if (cached && Date.now() - cached.at < CACHE_MS) {
    return NextResponse.json({ models: cached.value, recent: recentModelIds() })
  }

  const known = new Set(MODELS.map((m) => `${m.providerId}::${m.providerModel}`))
  const extra: PickerModel[] = []
  // Whether a curated model takes a reasoning effort is only knowable from the
  // provider's own listing, so collect that first.
  const reasoningCapable = new Set<string>()

  for (const provider of PROVIDERS) {
    if (!provider.isConfigured() || !provider.listModels) continue
    try {
      for (const m of await provider.listModels()) {
        if (m.reasoning) reasoningCapable.add(`${provider.id}::${m.id}`)
        const id = `${provider.id}::${m.id}`
        if (known.has(id)) continue
        known.add(id)
        extra.push({
          id,
          label: m.label,
          provider: provider.label,
          providerId: provider.id,
          modalities: m.modalities,
          reasoning: Boolean(m.reasoning),
          ...(m.price ? { price: m.price } : {}),
          curated: false,
        })
      }
    } catch {
      // A provider that will not list its models is not a reason to fail the
      // picker; the curated shortlist still works.
    }
  }

  const curated: PickerModel[] = MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    providerId: m.providerId,
    modalities: m.modalities,
    note: m.note,
    reasoning: reasoningCapable.has(`${m.providerId}::${m.providerModel}`),
    ...(m.price ? { price: m.price } : {}),
    curated: true,
  }))

  const models = [...curated, ...extra.sort((a, b) => a.label.localeCompare(b.label))]
  g.__pgModels = { at: Date.now(), value: models }
  // Recency is read fresh: it changes with every run, unlike the catalogue.
  return NextResponse.json({ models, recent: recentModelIds() })
}
