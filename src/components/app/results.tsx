'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, Check, Download, ExternalLink, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { ImageView, VideoView } from '@/components/app/media'
import { ScoreDots, StatusPill } from '@/components/app/bits'
import { modelById } from '@/lib/catalog'
import { displayModel, displayProvider } from '@/lib/model-name'
import { formatDuration, formatUsd } from '@/lib/format'
import type { CodeOutput, ContentOutput, HtmlPreview, Modality, Output, PreviewSpec, Result, Run, SpecPreview } from '@/lib/types'

export function ResultGrid({ run, modality }: { run: Run; modality: Modality }) {
  return (
    <div className="grid gap-3 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
      {run.results.map((result) => (
        <ResultCard
          key={result.modelId}
          result={result}
          runId={run.id}
          modality={modality}
          startedAt={run.startedAt}
        />
      ))}
    </div>
  )
}

function ResultCard({
  result,
  runId,
  modality,
  startedAt,
}: {
  result: Result
  runId: string
  modality: Modality
  startedAt: string
}) {
  const model = modelById(result.modelId)
  const pending = result.status === 'queued' || result.status === 'running'
  return (
    <article className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <header className="flex items-center gap-2 border-b px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-medium leading-tight" title={result.modelId}>
            {displayModel(result.modelId)}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{displayProvider(result.modelId)}</div>
        </div>
        {result.status === 'complete' ? (
          <ScoreDots score={result.score} />
        ) : (
          <StatusPill status={result.status} />
        )}
      </header>

      <div className="flex items-center gap-3 border-b bg-muted/25 px-3 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground">
        {pending ? <Elapsed since={startedAt} /> : <span>{formatDuration(result.durationSec)}</span>}
        <span className={cn(result.costUsd === null && 'opacity-50')}>{formatUsd(result.costUsd)}</span>
        {result.tokensIn > 0 && (
          <span>{Math.round((result.tokensIn + result.tokensOut) / 1000)}k tok</span>
        )}
        {result.status === 'complete' && (
          <span className="ml-auto flex items-center gap-2">
            <a
              href={`/api/output/${runId}/${encodeURIComponent(result.modelId)}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 underline decoration-dotted underline-offset-2 transition hover:text-foreground"
              title="Open this output full size in a new tab"
            >
              Open
              <ExternalLink className="size-3" />
            </a>
            {modality !== 'image' && modality !== 'video' && (
              <a
                href={`/api/output/${runId}/${encodeURIComponent(result.modelId)}?download=1`}
                className="inline-flex items-center transition hover:text-foreground"
                title="Download as an HTML file"
              >
                <Download className="size-3" />
              </a>
            )}
          </span>
        )}
      </div>

      <div className="flex-1 p-3">
        {pending ? (
          <PendingOutput modality={modality} status={result.status} />
        ) : result.error ? (
          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2.5">
            <AlertTriangle className="mt-px size-3.5 shrink-0 text-destructive" />
            <p className="text-[12px] leading-relaxed text-destructive">{result.error}</p>
          </div>
        ) : (
          <OutputView
            output={result.output}
            label={displayModel(result.modelId)}
            assetBase={`/api/output/${runId}/${encodeURIComponent(result.modelId)}/asset`}
          />
        )}
      </div>

      {!pending && result.output.summary && (
        <p className="border-t px-3 py-2 text-[12px] leading-relaxed text-muted-foreground">
          {result.output.summary}
        </p>
      )}
    </article>
  )
}

/** Counts up from the run's start so a slow model still looks alive. */
function Elapsed({ since }: { since: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const seconds = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000))
  return <span className="text-foreground">{formatDuration(seconds)}</span>
}

/**
 * A placeholder shaped like the output that is coming, so the grid keeps its
 * layout and the wait reads as progress rather than emptiness.
 */
function PendingOutput({ modality, status }: { modality: Modality; status: Result['status'] }) {
  const queued = status === 'queued'
  const note = queued ? 'Queued' : 'Generating'

  return (
    <div className="space-y-2" aria-busy={!queued} aria-live="polite">
      {modality === 'content' ? (
        <div className="space-y-2 rounded-md border bg-muted/20 p-2.5">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-4/5" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-2 w-3/5" />
        </div>
      ) : modality === 'image' ? (
        <div className="grid grid-cols-2 gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="aspect-square rounded-md" />
          ))}
        </div>
      ) : (
        <Skeleton className="aspect-video w-full rounded-md" />
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {!queued && (
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-sky-500/70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-sky-500" />
          </span>
        )}
        <span className={cn(queued && 'opacity-60')}>{note}</span>
        {!queued && <span className="opacity-50">&mdash; nothing to show until the model answers</span>}
      </div>
    </div>
  )
}

function OutputView({ output, label, assetBase }: { output: Output; label: string; assetBase: string }) {
  switch (output.kind) {
    case 'code':
      return <CodeView output={output} />
    case 'content':
      return <ContentView output={output} />
    case 'video':
      return <VideoView output={output} label={label} assetBase={assetBase} />
    case 'image':
      return <ImageView output={output} label={label} assetBase={assetBase} />
  }
}

// ----------------------------------------------------------------- code ----

function CodeView({ output }: { output: CodeOutput }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-2">
      {output.preview ? (
        <MiniPreview spec={output.preview} />
      ) : (
        <pre className="max-h-32 overflow-hidden rounded-md border bg-muted/30 p-2 font-mono text-[10.5px] leading-relaxed text-muted-foreground">
          <code>{output.files[0]?.content.split('\n').slice(0, 8).join('\n')}</code>
        </pre>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          {output.files.length} file{output.files.length === 1 ? '' : 's'}
        </button>
        {output.tests && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10.5px]',
              output.tests.passed === output.tests.total
                ? 'border-score-good/30 bg-score-good/10 text-score-good'
                : 'border-destructive/30 bg-destructive/10 text-destructive',
            )}
          >
            {output.tests.passed === output.tests.total ? <Check className="size-3" /> : <X className="size-3" />}
            {output.tests.passed}/{output.tests.total} tests
          </span>
        )}
      </div>

      <FileDialog open={open} onOpenChange={setOpen} output={output} />
    </div>
  )
}

function FileDialog({
  open,
  onOpenChange,
  output,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  output: CodeOutput
}) {
  const [path, setPath] = useState(output.files[0]?.path ?? '')
  const active = output.files.find((f) => f.path === path) ?? output.files[0]
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm">Files produced</DialogTitle>
        </DialogHeader>
        <div className="flex flex-wrap gap-1">
          {output.files.map((f) => (
            <button
              key={f.path}
              onClick={() => setPath(f.path)}
              className={cn(
                'rounded-md border px-2 py-1 font-mono text-[11px] transition',
                f.path === active?.path
                  ? 'border-foreground/20 bg-muted text-foreground'
                  : 'border-transparent text-muted-foreground hover:bg-muted/60',
              )}
            >
              {f.path}
            </button>
          ))}
        </div>
        <ScrollArea className="h-[420px] rounded-md border bg-muted/30">
          <pre className="p-3 font-mono text-[11.5px] leading-relaxed">
            <code>{active?.content}</code>
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function MiniPreview({ spec }: { spec: PreviewSpec }) {
  if (spec.kind === 'html') return <HtmlPreviewFrame spec={spec} />
  return <SpecPreviewFrame spec={spec} />
}

/**
 * The model's own markup, with its CSS and JS inlined. `sandbox` without
 * allow-same-origin keeps generated script away from the app's origin.
 */
function HtmlPreviewFrame({ spec }: { spec: HtmlPreview }) {
  const doc = useMemo(() => {
    const style = spec.css ? `<style>${spec.css}</style>` : ''
    const script = spec.js ? `<script>${spec.js}<\/script>` : ''
    return spec.html.includes('</head>')
      ? spec.html.replace('</head>', `${style}</head>`).replace('</body>', `${script}</body>`)
      : `<!doctype html><html><head><meta charset="utf-8">${style}</head><body>${spec.html}${script}</body></html>`
  }, [spec])

  return (
    <div className="relative aspect-video overflow-hidden rounded-md border bg-white">
      <iframe
        title="Generated page"
        srcDoc={doc}
        sandbox="allow-scripts"
        className="absolute left-0 top-0 origin-top-left border-0"
        style={{ width: '333%', height: '333%', transform: 'scale(0.3)' }}
      />
    </div>
  )
}

function SpecPreviewFrame({ spec }: { spec: SpecPreview }) {
  const brand = spec.theme === 'brand' ? '#1d4ed8' : '#111418'
  return (
    <div className="relative aspect-video overflow-hidden rounded-md border bg-white">
      <div className="absolute inset-0 origin-top-left scale-[0.3]" style={{ width: '333%', height: '333%' }}>
        <div className="flex h-full flex-col bg-white font-sans text-[#12161c]">
          <div className="flex items-center gap-4 border-b border-[#eef1f4] px-10 py-5">
            <span className="text-xl font-bold tracking-tight" style={{ color: spec.theme === 'brand' ? brand : '#12161c' }}>
              {spec.brand}
            </span>
            <span className="text-sm text-[#6c7480]">Features</span>
            <span className="ml-auto rounded-md px-4 py-2 text-sm text-white" style={{ background: brand }}>
              {spec.cta}
            </span>
          </div>
          <div className="px-10 pb-6 pt-10">
            <h3
              className="mb-3 max-w-[15ch] text-[42px] font-bold leading-[1.05] tracking-[-0.035em]"
              style={spec.theme === 'brand' ? { fontFamily: 'Georgia, serif', letterSpacing: '-0.02em' } : undefined}
            >
              {spec.headline}
            </h3>
            <p className="mb-5 max-w-[44ch] text-[16px] leading-relaxed text-[#5b636f]">{spec.sub}</p>
            <span className="inline-block rounded-lg px-6 py-3 text-[15px] text-white" style={{ background: brand }}>
              {spec.cta}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-6 px-10">
            {spec.blocks.map((b) => (
              <div key={b.title}>
                <div className="mb-2 size-7 rounded-lg" style={{ background: `${brand}1a` }} />
                <h4 className="mb-1 text-[16px] font-semibold tracking-tight">{b.title}</h4>
                <p className="text-[13.5px] leading-relaxed text-[#6c7480]">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------------- content ----

function ContentView({ output }: { output: ContentOutput }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <Chip>{output.wordCount} words</Chip>
        <Chip>{output.tone}</Chip>
      </div>
      <ScrollArea className="h-44 rounded-md border bg-muted/20">
        <div className="space-y-2 p-2.5">
          <h4 className="text-[13px] font-semibold leading-snug tracking-tight">{output.title}</h4>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">{output.deck}</p>
          {output.sections.map((s, i) => (
            <div key={i} className="space-y-1">
              {s.heading && <h5 className="text-[11.5px] font-semibold">{s.heading}</h5>}
              {s.paragraphs.map((p, j) => (
                <p key={j} className="text-[11.5px] leading-relaxed text-muted-foreground">{p}</p>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="rounded px-1.5 py-0 font-mono text-[10.5px] font-normal">
      {children}
    </Badge>
  )
}
