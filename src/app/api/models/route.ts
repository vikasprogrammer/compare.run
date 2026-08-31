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

  const curated: PickerModel[] = MODELS.map((m) => ({
    id: m.id,
    label: m.label,
    provider: m.provider,
    providerId: m.providerId,
    modalities: m.modalities,
    note: m.note,
    ...(m.price ? { price: m.price } : {}),
    curated: true,
  }))

  const known = new Set(MODELS.map((m) => `${m.providerId}::${m.providerModel}`))
  const extra: PickerModel[] = []

  for (const provider of PROVIDERS) {
    if (!provider.isConfigured() || !provider.listModels) continue
    try {
      for (const m of await provider.listModels()) {
        const id = `${provider.id}::${m.id}`
        if (known.has(id)) continue
        known.add(id)
        extra.push({
          id,
          label: m.label,
          provider: provider.label,
          providerId: provider.id,
          modalities: m.modalities,
          ...(m.price ? { price: m.price } : {}),
          curated: false,
        })
      }
    } catch {
      // A provider that will not list its models is not a reason to fail the
      // picker; the curated shortlist still works.
    }
  }

  const models = [...curated, ...extra.sort((a, b) => a.label.localeCompare(b.label))]
  g.__pgModels = { at: Date.now(), value: models }
  // Recency is read fresh: it changes with every run, unlike the catalogue.
  return NextResponse.json({ models, recent: recentModelIds() })
}
