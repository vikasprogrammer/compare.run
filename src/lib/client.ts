import type { Experiment, Modality, Run } from './types'

export interface ProviderStatus {
  id: string
  label: string
  modalities: Modality[]
  configured: boolean
  keyEnvVar: string
  docsUrl: string
}

export interface AppState {
  experiments: Experiment[]
  runs: Run[]
  providers: ProviderStatus[]
  /** Modalities no configured provider can serve. */
  unsupported: Modality[]
}

export async function fetchState(): Promise<AppState> {
  const res = await fetch('/api/state', { cache: 'no-store' })
  if (!res.ok) throw new Error('Could not load state')
  return (await res.json()) as AppState
}

export interface PickerModel {
  id: string
  label: string
  provider: string
  providerId: string
  modalities: Modality[]
  note?: string
  price?: { in: number; out: number }
  curated: boolean
}

export async function fetchModels(): Promise<PickerModel[]> {
  const res = await fetch('/api/models', { cache: 'no-store' })
  if (!res.ok) return []
  return ((await res.json()) as { models: PickerModel[] }).models
}

export async function fetchRun(id: string): Promise<Run | null> {
  const res = await fetch(`/api/runs/${id}`, { cache: 'no-store' })
  if (!res.ok) return null
  return ((await res.json()) as { run: Run }).run
}

export interface LaunchInput {
  title: string
  modality: Modality
  prompt: string
  templateId: string | null
  modelIds: string[]
}

export async function createExperiment(input: LaunchInput): Promise<{ experimentId: string; runId: string }> {
  const res = await fetch('/api/experiments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Could not start the experiment')
  return json as { experimentId: string; runId: string }
}

export interface RerunInput {
  prompt?: string
  modelIds?: string[]
  note?: string | null
}

export async function rerun(experimentId: string, input: RerunInput = {}): Promise<string> {
  const res = await fetch('/api/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ experimentId, ...input }),
  })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error ?? 'Could not start the run')
  return (json as { runId: string }).runId
}
