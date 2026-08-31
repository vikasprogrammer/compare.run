import { getRun } from '@/lib/db'
import { displayModel } from '@/lib/model-name'
import type { Output } from '@/lib/types'

export const dynamic = 'force-dynamic'

/**
 * Serves a single result full size, so any output can be opened in its own tab.
 * Code comes back as the page the model actually wrote; everything else is
 * wrapped in a plain readable document.
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ runId: string; modelId: string }> },
) {
  const { runId, modelId } = await params
  const download = new URL(req.url).searchParams.get('download') === '1'
  const run = getRun(runId)
  if (!run) return new Response('Run not found', { status: 404 })

  const result = run.results.find((r) => r.modelId === decodeURIComponent(modelId))
  if (!result) return new Response('Result not found', { status: 404 })

  const label = displayModel(result.modelId)
  const html = render(result.output, label, result.error)
  const slug = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      ...(download ? { 'content-disposition': `attachment; filename="${slug}.html"` } : {}),
      // Generated code runs here in isolation; keep it off the network.
      // Generated code stays sandboxed; media needs the provider's CDN.
      'content-security-policy':
        "default-src 'none'; img-src data: blob: https:; media-src https: data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:",
    },
  })
}

function render(output: Output, label: string, error?: string): string {
  if (error) return page(label, `<div class="err"><h1>${esc(label)} failed</h1><p>${esc(error)}</p></div>`)

  switch (output.kind) {
    case 'code': {
      const preview = output.preview
      if (preview?.kind === 'html') {
        // The model's own document, with its stylesheet and script inlined.
        const style = preview.css ? `<style>${preview.css}</style>` : ''
        const script = preview.js ? `<script>${preview.js}<\/script>` : ''
        return preview.html.includes('</head>')
          ? preview.html.replace('</head>', `${style}</head>`).replace('</body>', `${script}</body>`)
          : `<!doctype html><meta charset="utf-8">${style}${preview.html}${script}`
      }
      const files = output.files
        .map(
          (f) =>
            `<section><h2>${esc(f.path)}</h2><pre>${esc(f.content)}</pre></section>`,
        )
        .join('')
      return page(label, `<h1>${esc(label)}</h1><p class="sub">${esc(output.summary)}</p>${files}`)
    }

    case 'content': {
      const body = output.sections
        .map(
          (s) =>
            (s.heading ? `<h2>${esc(s.heading)}</h2>` : '') +
            s.paragraphs.map((p) => `<p>${esc(p)}</p>`).join(''),
        )
        .join('')
      return page(
        label,
        `${output.title ? `<h1>${esc(output.title)}</h1>` : ''}${output.deck ? `<p class="deck">${esc(output.deck)}</p>` : ''}${body}
         <p class="sub">${output.wordCount} words &middot; ${esc(label)}</p>`,
      )
    }

    case 'image': {
      const figures = output.images
        .map((img) =>
          img.url
            ? `<figure><img src="${esc(img.url)}" alt="${esc(img.caption)}"><figcaption>${esc(img.caption)}</figcaption></figure>`
            : `<figure class="ph"><figcaption>${esc(img.caption)}</figcaption></figure>`,
        )
        .join('')
      return page(label, `<h1>${esc(label)}</h1><div class="grid">${figures}</div>`)
    }

    case 'video': {
      const shots = output.shots
        .map((s) => `<li><b>0:${String(s.at).padStart(2, '0')}</b> ${esc(s.description)}</li>`)
        .join('')
      const player = output.url
        ? `<video src="${esc(output.url)}" controls autoplay playsinline class="poster"></video>`
        : `<div class="poster" style="background:linear-gradient(140deg, ${esc(output.poster[0])}, ${esc(output.poster[1])})"></div>`
      return page(
        label,
        `<h1>${esc(label)}</h1>
         ${player}
         <p class="sub">${esc(output.resolution)} &middot; ${output.fps} fps &middot; ${esc(output.aspect)}</p>
         <ol>${shots}</ol>`,
      )
    }
  }
}

function page(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; }
  body { margin:0 auto; padding:3rem 1.5rem 6rem; max-width:44rem;
         font:16px/1.65 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size:1.6rem; letter-spacing:-0.02em; margin:0 0 .5rem; }
  h2 { font-size:1rem; letter-spacing:-0.01em; margin:2rem 0 .5rem; }
  .deck { font-size:1.05rem; opacity:.75; margin:0 0 2rem; }
  .sub { font-size:.8rem; opacity:.55; }
  pre { overflow-x:auto; padding:1rem; border-radius:.5rem;
        background:color-mix(in srgb, currentColor 7%, transparent);
        font:12.5px/1.6 ui-monospace, Menlo, monospace; }
  .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(15rem,1fr)); gap:1rem; }
  figure { margin:0; } img { width:100%; border-radius:.5rem; display:block; }
  figcaption { font-size:.78rem; opacity:.6; margin-top:.4rem; }
  .ph { aspect-ratio:1; border:1px dashed currentColor; border-radius:.5rem; opacity:.3; }
  .poster { aspect-ratio:16/9; border-radius:.5rem; margin:1rem 0; width:100%; background:#000; }
  .err { color:#b3311f; } ol { padding-left:1.1rem; } li { margin:.3rem 0; }
</style></head><body>${body}</body></html>`
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
}
