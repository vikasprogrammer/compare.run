'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Plus, Search, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ModalityIcon } from '@/components/app/bits'
import { EXPERIMENT_TYPES, modelsFor, templatesFor } from '@/lib/catalog'
import { Input } from '@/components/ui/input'
import { displayModel } from '@/lib/model-name'
import type { Catalogue, LaunchInput } from '@/lib/client'

import type { Modality } from '@/lib/types'

/**
 * Everything needed to launch on one screen: what, the words, and who runs it.
 * A three-step wizard is the wrong shape for something you do twenty times a day.
 */
/** Pre-filled state for a re-run: same task, edit whatever you want to change. */
export interface RerunSeed {
  experimentId: string
  title: string
  modality: Modality
  prompt: string
  modelIds: string[]
}

export function QuickRun({
  open,
  onOpenChange,
  onLaunch,
  onRerun,
  seed,
  unsupported,
  catalogue,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onLaunch: (input: LaunchInput) => void
  onRerun: (experimentId: string, input: { prompt: string; modelIds: string[] }) => void
  /** When present, the dialog re-runs this experiment instead of creating one. */
  seed: RerunSeed | null
  /** Modalities no configured provider can serve. */
  unsupported: Modality[]
  /** Prefetched on app load; null until it lands. */
  catalogue: Catalogue | null
}) {
  const [type, setType] = useState<Modality>('code')
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [touched, setTouched] = useState(false)

  const templates = useMemo(() => templatesFor(type), [type])
  const available = useMemo(() => modelsFor(type), [type])

  const [browsing, setBrowsing] = useState(false)
  const [query, setQuery] = useState('')

  const all = catalogue?.models
  // The catalogue carries a proper display name; the wire id is a last resort.
  const labelOf = (id: string) => all?.find((m) => m.id === id)?.label ?? displayModel(id)

  /**
   * The shortlist is the curated set plus anything reached for recently. Going
   * to the full catalogue for a model once should be enough; after that it sits
   * on the picker like any other.
   */
  const shortlist = useMemo(() => {
    const ids = new Set(available.map((m) => m.id))
    const remembered = (catalogue?.recent ?? [])
      .filter((id) => !ids.has(id))
      .map((id) => all?.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m) && m!.modalities.includes(type))
    return [...available, ...remembered]
  }, [available, catalogue, all, type])

  const matches = useMemo(() => {
    if (!all) return []
    const q = query.trim().toLowerCase()
    return all
      .filter((m) => m.modalities.includes(type))
      .filter((m) => !models.includes(m.id))
      .filter((m) => !q || m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q))
      .slice(0, 40)
  }, [all, query, type, models])

  // Switching what you are making invalidates both the words and the line-up.
  // Opening for a re-run carries the previous run in; changing the modality
  // afterwards resets, since nothing from the old task still applies.
  useEffect(() => {
    if (!open) return
    setTouched(false)
    if (seed) {
      setType(seed.modality)
      setPrompt(seed.prompt)
      setTitle(seed.title)
      setModels(seed.modelIds)
    } else {
      setPrompt('')
      setTitle('')
      setModels(modelsFor('code').slice(0, 3).map((m) => m.id))
      setType('code')
    }
  }, [open, seed])

  useEffect(() => {
    if (!touched) return
    setPrompt('')
    setTitle('')
    setModels(modelsFor(type).slice(0, 3).map((m) => m.id))
  }, [type, touched])

  const blocked = unsupported.includes(type)
  const ready = prompt.trim().length > 0 && models.length >= 1 && !blocked

  const launch = () => {
    if (!ready) return
    onOpenChange(false)
    if (seed) {
      onRerun(seed.experimentId, { prompt, modelIds: models })
      return
    }
    onLaunch({
      title: title.trim() || templates.find((t) => t.prompt === prompt)?.title || prompt.slice(0, 48),
      modality: type,
      prompt,
      templateId: templates.find((t) => t.prompt === prompt)?.id ?? null,
      modelIds: models,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) launch()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-sm">{seed ? `Run again — ${seed.title}` : 'New experiment'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* what — fixed on a re-run: an experiment's modality is what it is */}
          {seed ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-2 text-[12px] text-muted-foreground">
              <ModalityIcon type={type} className="size-3.5" />
              <span className="font-medium text-foreground">
                {EXPERIMENT_TYPES.find((t) => t.id === type)?.label}
              </span>
              <span>&mdash; same task, edit the prompt or the line-up below</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {EXPERIMENT_TYPES.map((t) => {
                const on = type === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTouched(true)
                      setType(t.id)
                    }}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-md border px-2 py-2.5 text-[11.5px] font-medium transition',
                      on
                        ? 'border-foreground/25 bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    <ModalityIcon type={t.id} />
                    {t.label.replace(' generation', '').replace(' writing', '')}
                  </button>
                )
              })}
            </div>
          )}

          {/* words */}
          <div className="space-y-1.5">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the task every model will be given…"
              className="min-h-24 text-[13px] leading-relaxed"
              autoFocus
            />
            <div className="flex flex-wrap gap-1">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setPrompt(tpl.prompt)
                    setTitle(tpl.title)
                  }}
                  className="rounded-md border px-2 py-1 text-[11.5px] text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {tpl.title}
                </button>
              ))}
            </div>
          </div>

          {blocked && (
            <p className="rounded-md border border-dashed px-3 py-2.5 text-[11.5px] leading-relaxed text-muted-foreground">
              No configured provider can generate {type}. OpenRouter serves no video models &mdash; adding a
              fal.ai or Replicate provider to <code className="font-mono">src/lib/providers</code> lights this up.
            </p>
          )}

          {/* who */}
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Models
              </span>
              <span className="text-[11px] text-muted-foreground">{models.length} selected</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {models
                .filter((id) => !shortlist.some((m) => m.id === id))
                .map((id) => (
                  <button
                    key={id}
                    onClick={() => setModels((prev) => prev.filter((x) => x !== id))}
                    className="inline-flex items-center gap-1.5 rounded-md border border-foreground/25 bg-muted px-2 py-1 text-[11.5px] text-foreground"
                    title={id}
                  >
                    {labelOf(id)}
                    <X className="size-3 opacity-60" />
                  </button>
                ))}
              {shortlist.map((m) => {
                const on = models.includes(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() =>
                      setModels((prev) => (on ? prev.filter((x) => x !== m.id) : [...prev, m.id]))
                    }
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] transition',
                      on ? 'border-foreground/25 bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60',
                    )}
                  >
                    {m.label}
                    {on && <Check className="size-3" />}
                  </button>
                )
              })}
              <button
                onClick={() => setBrowsing((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-[11.5px] transition',
                  browsing ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Plus className="size-3" />
                More models
              </button>
            </div>

            {browsing && (
              <div className="space-y-1.5 rounded-md border bg-muted/20 p-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={
                      all === undefined || all === null
                        ? 'Loading the provider catalogue…'
                        : `Search ${all.filter((m) => m.modalities.includes(type)).length} models`
                    }
                    className="h-7 pl-7 text-[12px]"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {matches.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setModels((prev) => [...prev, m.id])
                        setQuery('')
                      }}
                      className="flex w-full items-center gap-2 rounded px-1.5 py-1 text-left transition hover:bg-muted"
                    >
                      <span className="min-w-0 flex-1 truncate text-[12px]">{m.label}</span>
                      {m.price && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          ${m.price.in.toFixed(2)}/${m.price.out.toFixed(2)}
                        </span>
                      )}
                      <span className="shrink-0 text-[10px] text-muted-foreground">{m.provider}</span>
                    </button>
                  ))}
                  {all && matches.length === 0 && (
                    <p className="px-1.5 py-2 text-[11.5px] text-muted-foreground">
                      Nothing matches. Any provider model id also works — the
                      picker accepts <code className="font-mono">provider::model-id</code>.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 border-t pt-3">
            <span className="text-[11.5px] text-muted-foreground">
              {blocked
                ? `No provider for ${type}`
                : !ready
                  ? 'Add a prompt and pick a model'
                  : seed
                    ? 'Edit anything — the change is recorded on the new run'
                    : 'Same prompt to every model'}
            </span>
            <Button size="sm" className="ml-auto" disabled={!ready} onClick={launch}>
              <Sparkles className="size-3.5" />
              Run
              <kbd className="ml-1 rounded border border-current/25 px-1 font-mono text-[10px] opacity-60">
                ⌘↵
              </kbd>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
