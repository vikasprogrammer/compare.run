'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlaskConical, Plus, RotateCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ModalityIcon, StatusPill } from '@/components/app/bits'
import { ResultGrid } from '@/components/app/results'
import { QuickRun, type RerunSeed } from '@/components/app/quick-run'
import { Connectors } from '@/components/app/connectors'
import { PromptPanel } from '@/components/app/prompt-panel'
import { createExperiment, fetchRun, fetchState, rerun, type AppState, type LaunchInput } from '@/lib/client'
import { isRunActive, runSummary, runTotals } from '@/lib/summary'
import { formatDateTime, relativeTime } from '@/lib/format'

export default function Page() {
  const [state, setState] = useState<AppState | null>(null)
  const [experimentId, setExperimentId] = useState('')
  const [runId, setRunId] = useState('')
  const [composerOpen, setComposerOpen] = useState(false)
  const [seed, setSeed] = useState<RerunSeed | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const didRestore = useRef(false)

  const load = useCallback(async () => {
    const next = await fetchState()
    setState(next)
    return next
  }, [])

  useEffect(() => {
    load().catch(() => setError('Could not reach the server.'))
  }, [load])

  const experiments = state?.experiments ?? []
  const runs = useMemo(
    () => (state?.runs ?? []).filter((r) => r.experimentId === experimentId).sort((a, b) => b.seq - a.seq),
    [state, experimentId],
  )
  const experiment = experiments.find((e) => e.id === experimentId)
  const run = runs.find((r) => r.id === runId) ?? runs[0]
  const previous = run ? runs.find((r) => r.seq < run.seq) : undefined

  // Settle on a selection once data arrives, honouring a deep link if present.
  useEffect(() => {
    if (!state || didRestore.current) return
    didRestore.current = true
    const p = new URLSearchParams(window.location.search)
    const e = p.get('e')
    const r = p.get('r')
    setExperimentId(state.experiments.some((x) => x.id === e) ? e! : (state.experiments[0]?.id ?? ''))
    if (state.runs.some((x) => x.id === r)) setRunId(r!)
  }, [state])

  useEffect(() => {
    if (!experimentId) return
    if (!runs.some((r) => r.id === runId)) setRunId(runs[0]?.id ?? '')
  }, [runs, runId, experimentId])

  useEffect(() => {
    if (!experimentId || !runId) return
    window.history.replaceState(null, '', `?e=${experimentId}&r=${runId}`)
  }, [experimentId, runId])

  // While anything is in flight, poll that run and fold it back into state.
  const active = run ? isRunActive(run) : false
  useEffect(() => {
    if (!active || !run) return
    const id = setInterval(async () => {
      const fresh = await fetchRun(run.id)
      if (!fresh) return
      setState((prev) =>
        prev ? { ...prev, runs: prev.runs.map((r) => (r.id === fresh.id ? fresh : r)) } : prev,
      )
      if (!isRunActive(fresh)) void load()
    }, 1500)
    return () => clearInterval(id)
  }, [active, run, load])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && /^(INPUT|TEXTAREA)$/.test(el.tagName)) return
      if (e.key === 'n' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setSeed(null)
        setComposerOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const launch = useCallback(
    async (input: LaunchInput) => {
      setBusy(true)
      setError(null)
      try {
        const { experimentId: e, runId: r } = await createExperiment(input)
        const next = await load()
        setExperimentId(next.experiments.some((x) => x.id === e) ? e : (next.experiments[0]?.id ?? ''))
        setRunId(r)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start the experiment')
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  const doRerun = useCallback(
    async (id: string, input: { prompt: string; modelIds: string[] }) => {
      setBusy(true)
      setError(null)
      try {
        const newRunId = await rerun(id, input)
        await load()
        setRunId(newRunId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not start the run')
      } finally {
        setBusy(false)
      }
    },
    [load],
  )

  // "Run again" opens the composer pre-filled, so changing the brief or the
  // line-up is the same gesture as repeating it.
  const openRerun = useCallback(() => {
    if (!experiment || !run) return
    setSeed({
      experimentId: experiment.id,
      title: experiment.title,
      modality: experiment.type,
      prompt: run.prompt || experiment.prompt,
      modelIds: run.modelIds.length ? run.modelIds : experiment.modelIds,
    })
    setComposerOpen(true)
  }, [experiment, run])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex h-11 shrink-0 items-center gap-3 border-b px-3">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold tracking-tight">
          <FlaskConical className="size-4" strokeWidth={1.75} />
          {/* One flex item, or the container's gap splits the wordmark. */}
          <span>
            compare<span className="text-muted-foreground">.run</span>
          </span>
        </span>
        {error && (
          <span className="flex items-center gap-1.5 text-[11.5px] text-destructive">
            <TriangleAlert className="size-3.5" />
            {error}
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <Connectors state={state} />
          <Button
            size="sm"
            className="h-7 gap-1.5 px-2.5 text-[12px]"
            onClick={() => {
              setSeed(null)
              setComposerOpen(true)
            }}
            disabled={busy}
          >
            <Plus className="size-3.5" />
            New
            <kbd className="rounded border border-current/25 px-1 font-mono text-[10px] opacity-60">n</kbd>
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-56 shrink-0 flex-col overflow-hidden border-r">
          <RailHeader>Experiments</RailHeader>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="p-1.5">
              {experiments.map((exp) => {
                const on = exp.id === experimentId
                const live = (state?.runs ?? []).some((r) => r.experimentId === exp.id && isRunActive(r))
                return (
                  <li key={exp.id}>
                    <button
                      onClick={() => setExperimentId(exp.id)}
                      className={cn(
                        'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left transition',
                        on ? 'bg-muted' : 'hover:bg-muted/50',
                      )}
                    >
                      <ModalityIcon
                        type={exp.type}
                        className={cn('mt-0.5 size-3.5 shrink-0', on ? 'text-foreground' : 'text-muted-foreground')}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className={cn('truncate text-[12.5px] leading-tight', on && 'font-medium')}>
                            {exp.title}
                          </span>
                          {live && <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-sky-500" />}
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                          {exp.modelIds.length} model{exp.modelIds.length === 1 ? '' : 's'} &middot;{' '}
                          {relativeTime(exp.updatedAt)}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
              {state && experiments.length === 0 && (
                <li className="px-2 py-6 text-center text-[11.5px] text-muted-foreground">
                  No experiments yet. Press <kbd className="rounded border px-1 font-mono">n</kbd>.
                </li>
              )}
            </ul>
          </ScrollArea>
        </nav>

        <nav className="flex w-52 shrink-0 flex-col overflow-hidden border-r">
          <RailHeader>
            Runs
            <span className="ml-auto font-mono text-[10.5px] font-normal opacity-60">{runs.length}</span>
          </RailHeader>
          <ScrollArea className="min-h-0 flex-1">
            <ul className="p-1.5">
              {runs.map((r) => {
                const on = r.id === run?.id
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setRunId(r.id)}
                      className={cn(
                        'w-full rounded-md px-2 py-1.5 text-left transition',
                        on ? 'bg-muted' : 'hover:bg-muted/50',
                      )}
                    >
                      <span className="flex items-center gap-1.5">
                        <span className={cn('text-[12.5px] leading-tight', on && 'font-medium')}>{r.label}</span>
                        {isRunActive(r) && <StatusPill status="running" className="px-1 py-0 text-[10px]" />}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                        {formatDateTime(r.startedAt)}
                      </span>
                      <span className="mt-0.5 block truncate text-[10.5px] text-muted-foreground">
                        {runSummary(r)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </ScrollArea>
          <div className="border-t p-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-full justify-start gap-1.5 px-2 text-[12px] text-muted-foreground"
              onClick={openRerun}
              disabled={!experiment || busy}
            >
              <RotateCw className={cn('size-3.5', busy && 'animate-spin')} />
              Run again
            </Button>
          </div>
        </nav>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {experiment && run ? (
            <>
              <div className="shrink-0 border-b px-4 py-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-[13px] font-semibold tracking-tight">{experiment.title}</h1>
                  <span className="text-[12px] text-muted-foreground">{run.label}</span>
                  {isRunActive(run) && <StatusPill status="running" />}
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-muted-foreground">
                    {runTotals(run)}
                  </span>
                </div>
                {run.note && (
                  <p className="mt-1.5 text-[11.5px] text-muted-foreground">
                    <span className="font-medium text-foreground">Changed:</span> {run.note}
                  </p>
                )}
                <PromptPanel run={run} previous={previous} />
              </div>
              <ScrollArea className="min-h-0 flex-1">
                <ResultGrid run={run} modality={experiment.type} />
              </ScrollArea>
            </>
          ) : (
            <div className="grid flex-1 place-items-center text-[13px] text-muted-foreground">
              {state ? 'Select an experiment' : 'Loading…'}
            </div>
          )}
        </section>
      </div>

      <QuickRun
        open={composerOpen}
        onOpenChange={setComposerOpen}
        onLaunch={launch}
        onRerun={doRerun}
        seed={seed}
        unsupported={state?.unsupported ?? []}
        providers={state?.providers ?? []}
      />
    </div>
  )
}

function RailHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-8 shrink-0 items-center gap-1.5 border-b px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  )
}

