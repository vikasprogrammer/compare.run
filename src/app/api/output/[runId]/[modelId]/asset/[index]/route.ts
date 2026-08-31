import { getRun } from '@/lib/db'
import { displayModel } from '@/lib/model-name'

export const dynamic = 'force-dynamic'

/**
 * Streams one image or clip back as a download. Providers hand us either a
 * data URL or a remote one, so both are normalised here rather than relying on
 * the browser's `download` attribute, which remote origins ignore.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ runId: string; modelId: string; index: string }> },
) {
  const { runId, modelId, index } = await params
  const run = getRun(runId)
  if (!run) return new Response('Run not found', { status: 404 })

  const result = run.results.find((r) => r.modelId === decodeURIComponent(modelId))
  if (!result) return new Response('Result not found', { status: 404 })

  const output = result.output
  const i = Number(index)

  let url: string | undefined
  let kind = 'asset'
  if (output.kind === 'image') {
    url = output.images[i]?.url
    kind = 'image'
  } else if (output.kind === 'video') {
    url = output.url
    kind = 'clip'
  }

  if (!url) {
    return new Response(
      `No downloadable ${kind}. This result has no generated file — connect a provider that returns one.`,
      { status: 404 },
    )
  }

  const slug = displayModel(result.modelId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { bytes, contentType } = await load(url)
  const filename = `${slug}-${kind}-${i + 1}.${extensionFor(contentType)}`

  return new Response(new Uint8Array(bytes), {
    headers: {
      'content-type': contentType,
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  })
}

async function load(url: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;,]+)(;base64)?,([\s\S]*)$/)
    if (!match) throw new Error('Malformed data URL')
    const [, contentType, isBase64, payload] = match
    const buffer = isBase64
      ? Buffer.from(payload, 'base64')
      : Buffer.from(decodeURIComponent(payload), 'utf8')
    return { bytes: buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength), contentType }
  }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Upstream returned ${res.status}`)
  return {
    bytes: await res.arrayBuffer(),
    contentType: res.headers.get('content-type') ?? 'application/octet-stream',
  }
}

function extensionFor(contentType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
    'video/mp4': 'mp4', 'video/webm': 'webm',
  }
  return map[contentType.split(';')[0].trim()] ?? 'bin'
}
