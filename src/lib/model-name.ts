import { modelById } from './catalog'

/**
 * A readable name for any model id, curated or ad-hoc. Ad-hoc ids arrive as
 * "providerId::providerModel"; the wire identifier is the only name we have.
 */
export function displayModel(modelId: string): string {
  const known = modelById(modelId)
  if (known) return known.label
  const at = modelId.indexOf('::')
  return at === -1 ? modelId : modelId.slice(at + 2)
}

export function displayProvider(modelId: string): string {
  const known = modelById(modelId)
  if (known) return known.provider
  const at = modelId.indexOf('::')
  return at === -1 ? '' : modelId.slice(0, at)
}
