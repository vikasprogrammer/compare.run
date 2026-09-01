import { modelById } from './catalog'

/**
 * A model entry in a run is "<modelId>" or "<modelId>#<effort>". Encoding the
 * effort into the id — rather than storing it beside the list — is what lets
 * the same model appear twice in one run at two different efforts, since a
 * result is keyed by (run, model entry).
 *
 * Model identifiers never contain "#", so the split is unambiguous.
 */
export interface ModelEntry {
  /** The catalogue or ad-hoc model id, without the effort. */
  modelId: string
  effort?: string
}

export function parseEntry(entry: string): ModelEntry {
  const at = entry.lastIndexOf('#')
  if (at === -1) return { modelId: entry }
  return { modelId: entry.slice(0, at), effort: entry.slice(at + 1) || undefined }
}

export function buildEntry(modelId: string, effort?: string | null): string {
  return effort ? `${modelId}#${effort}` : modelId
}

/** "openrouter::anthropic/claude-opus-4.8" -> provider and wire identifier. */
export function parseAdHoc(modelId: string): { providerId: string; providerModel: string } | null {
  const at = modelId.indexOf('::')
  if (at === -1) return null
  const providerId = modelId.slice(0, at)
  const providerModel = modelId.slice(at + 2)
  return providerId && providerModel ? { providerId, providerModel } : null
}

/** A readable name for any entry, curated or ad-hoc, with its effort. */
export function displayEntry(entry: string, labels?: Map<string, string>): string {
  const { modelId, effort } = parseEntry(entry)
  const base =
    labels?.get(modelId) ?? modelById(modelId)?.label ?? parseAdHoc(modelId)?.providerModel ?? modelId
  return effort ? `${base} · ${effort}` : base
}

export function displayEntryProvider(entry: string): string {
  const { modelId } = parseEntry(entry)
  return modelById(modelId)?.provider ?? parseAdHoc(modelId)?.providerId ?? ''
}
