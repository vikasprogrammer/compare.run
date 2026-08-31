'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ModalityIcon } from '@/components/app/bits'
import { EXPERIMENT_TYPES, modelsFor, templatesFor } from '@/lib/catalog'
import type { LaunchInput, ProviderStatus } from '@/lib/client'
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
  providers,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onLaunch: (input: LaunchInput) => void
  onRerun: (experimentId: string, input: { prompt: string; modelIds: string[] }) => void
  /** When present, the dialog re-runs this experiment instead of creating one. */
  seed: RerunSeed | null
  /** Modalities no configured provider can serve. */
  unsupported: Modality[]
  providers: ProviderStatus[]
}) {
  const [type, setType] = useState<Modality>('code')
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [models, setModels] = useState<string[]>([])
  const [touched, setTouched] = useState(false)

  const templates = useMemo(() => templatesFor(type), [type])
  const available = useMemo(() => modelsFor(type), [type])

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
          {/* what */}
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
              {available.map((m) => {
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
            </div>
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
