import { NextResponse } from 'next/server'
import { startExperiment } from '@/lib/runner'
import type { Modality } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function POST(req: Request) {
  const body = (await req.json()) as {
    title?: string
    modality?: Modality
    prompt?: string
    templateId?: string | null
    modelIds?: string[]
  }

  if (!body.prompt?.trim()) {
    return NextResponse.json({ error: 'A prompt is required.' }, { status: 400 })
  }
  if (!body.modality) {
    return NextResponse.json({ error: 'A modality is required.' }, { status: 400 })
  }
  const modelIds = (body.modelIds ?? []).filter(Boolean)
  if (modelIds.length < 1) {
    return NextResponse.json({ error: 'Pick at least one model.' }, { status: 400 })
  }

  try {
    const { experimentId, runId } = startExperiment({
      title: body.title ?? '',
      modality: body.modality,
      prompt: body.prompt,
      templateId: body.templateId ?? null,
      modelIds,
    })
    return NextResponse.json({ experimentId, runId })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
