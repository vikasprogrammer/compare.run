import { NextResponse } from 'next/server'
import { startRun } from '@/lib/runner'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Starts another run of an experiment. With no overrides it repeats the last
 * run exactly; with them it becomes the "I changed the brief" flow, and the
 * new prompt is recorded on the new run rather than over the old ones.
 */
export async function POST(req: Request) {
  const body = (await req.json()) as {
    experimentId?: string
    prompt?: string
    modelIds?: string[]
    note?: string | null
  }
  if (!body.experimentId) {
    return NextResponse.json({ error: 'experimentId is required.' }, { status: 400 })
  }
  try {
    const runId = startRun(body.experimentId, {
      ...(body.prompt !== undefined ? { prompt: body.prompt } : {}),
      ...(body.modelIds !== undefined ? { modelIds: body.modelIds } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
    })
    return NextResponse.json({ runId })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 })
  }
}
