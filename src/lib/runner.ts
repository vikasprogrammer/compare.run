import crypto from 'node:crypto'
import { createExperiment, createRun, getExperiment, nextSeq, previousRun, saveResult, setRunStatus } from './db'
import { modelById } from './catalog'
import { providersFor } from './providers'
import type { Experiment, Modality, Result, Run } from './types'

const id = (p: string) => `${p}_${crypto.randomBytes(6).toString('hex')}`

/** A result placeholder so the grid can show every model from the first paint. */
function queued(modelId: string): Result {
  return {
    modelId,
    status: 'queued',
    durationSec: 0,
    costUsd: null,
    tokensIn: 0,
    tokensOut: 0,
    score: null,
    output: { kind: 'content', summary: '', title: '', deck: '', sections: [], wordCount: 0, readingMinutes: 0, tone: '' },
  }
}

export function startExperiment(input: {
  title: string
  modality: Modality
  prompt: string
  templateId: string | null
  modelIds: string[]
}): { experimentId: string; runId: string } {
  const now = new Date().toISOString()
  const experiment: Experiment = {
    id: id('exp'),
    title: input.title.trim() || 'Untitled experiment',
    type: input.modality,
    prompt: input.prompt,
    templateId: input.templateId,
    modelIds: input.modelIds,
    createdAt: now,
    updatedAt: now,
  }
  createExperiment(experiment)
  const runId = startRun(experiment.id, { prompt: input.prompt, modelIds: input.modelIds, note: null })
  return { experimentId: experiment.id, runId }
}

export interface RunOverrides {
  prompt?: string
  modelIds?: string[]
  note?: string | null
}

/**
 * Runs a prompt against every selected model in parallel. Overrides let a
 * re-run change the prompt or the line-up; whatever it ends up with is stored
 * on the run, so earlier runs keep reporting what they were actually given.
 */
export function startRun(experimentId: string, overrides: RunOverrides = {}): string {
  const experiment = getExperiment(experimentId)
  if (!experiment) throw new Error('Experiment not found')

  const seq = nextSeq(experimentId)
  const previous = previousRun(experimentId, seq)

  const prompt = (overrides.prompt ?? previous?.prompt ?? experiment.prompt).trim()
  const modelIds = overrides.modelIds?.length
    ? overrides.modelIds
    : (previous?.modelIds?.length ? previous.modelIds : experiment.modelIds)

  if (!prompt) throw new Error('A prompt is required')
  if (!modelIds.length) throw new Error('Pick at least one model')

  const run: Run = {
    id: id('run'),
    experimentId,
    seq,
    label: `Run ${seq}`,
    startedAt: new Date().toISOString(),
    status: 'running',
    prompt,
    modelIds,
    note: overrides.note ?? describeChange(previous, prompt, modelIds),
    results: modelIds.map(queued),
  }
  createRun(run)

  // Fire and forget: the client polls the run while these land.
  void Promise.all(modelIds.map((m) => execute(run.id, run, m))).then(() => {
    setRunStatus(run.id, 'complete')
  })

  return run.id
}

/**
 * Describes a re-run by diffing it against the previous one, so the runs rail
 * explains itself instead of relying on someone writing a note by hand.
 */
function describeChange(previous: Run | undefined, prompt: string, modelIds: string[]): string | null {
  if (!previous) return null

  const parts: string[] = []
  if (previous.prompt.trim() !== prompt) parts.push('prompt edited')

  const before = new Set(previous.modelIds)
  const after = new Set(modelIds)
  const added = modelIds.filter((m) => !before.has(m)).map((m) => modelById(m)?.label ?? m)
  const removed = previous.modelIds.filter((m) => !after.has(m)).map((m) => modelById(m)?.label ?? m)
  if (added.length) parts.push(`added ${added.join(', ')}`)
  if (removed.length) parts.push(`removed ${removed.join(', ')}`)

  return parts.length ? parts.join(' \u00b7 ') : 'Repeat of the previous run, unchanged'
}

async function execute(runId: string, run: Run, modelId: string): Promise<void> {
  const started = Date.now()
  const model = modelById(modelId)
  const base = queued(modelId)

  const fail = (message: string) => {
    saveResult(runId, {
      ...base,
      status: 'failed',
      durationSec: (Date.now() - started) / 1000,
      error: message,
      output: { ...base.output, summary: 'No output produced.' },
    })
  }

  if (!model) return fail(`Unknown model "${modelId}"`)

  const experiment = getExperiment(run.experimentId)
  if (!experiment) return fail('Experiment disappeared mid-run')

  const provider = providersFor(experiment.type).find((p) => p.id === model.providerId)
  if (!provider) {
    return fail(
      `No configured provider can run ${model.label}. Set ${model.providerId.toUpperCase()}_API_KEY and restart.`,
    )
  }

  saveResult(runId, { ...base, status: 'running' })

  try {
    const result = await provider.generate({
      modelId,
      providerModel: model.providerModel,
      modality: experiment.type,
      prompt: run.prompt,
      signal: AbortSignal.timeout(1000 * 60 * 5),
    })
    saveResult(runId, {
      ...base,
      status: 'complete',
      durationSec: (Date.now() - started) / 1000,
      costUsd: result.costUsd,
      tokensIn: result.tokensIn,
      tokensOut: result.tokensOut,
      output: result.output,
    })
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
