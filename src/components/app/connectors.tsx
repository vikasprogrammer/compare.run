'use client'

import { ChevronDown, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ModalityIcon } from '@/components/app/bits'
import { EXPERIMENT_TYPES } from '@/lib/catalog'
import type { AppState } from '@/lib/client'
import type { Modality } from '@/lib/types'

const ALL: Modality[] = ['code', 'content', 'image', 'video']

/**
 * Read-only by design. Keys live in .env.local, which is the honest place for
 * them in a local tool — a browser form writing that file is a footgun the
 * moment the port is exposed. This panel says what is connected, what each
 * connection unlocks, and exactly what to set to add another.
 */
export function Connectors({ state }: { state: AppState | null }) {
  if (!state) return null

  const providers = state.providers
  const ready = providers.filter((p) => p.configured)
  const label = ready.length ? `${ready.map((p) => p.label).join(', ')} connected` : 'No provider connected'

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[11px] text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <span
            className={cn('size-1.5 rounded-full', ready.length ? 'bg-positive' : 'bg-muted-foreground/50')}
          />
          {label}
          <ChevronDown className="size-3 opacity-60" />
        </button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-3 py-2.5">
          <h2 className="text-[12.5px] font-semibold">Connections</h2>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            One key per provider. Models come from whichever are connected.
          </p>
        </div>

        <ul className="divide-y">
          {providers.map((p) => (
            <li key={p.id} className="px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'size-1.5 shrink-0 rounded-full',
                    p.configured ? 'bg-positive' : 'bg-muted-foreground/40',
                  )}
                />
                <span className="text-[12.5px] font-medium">{p.label}</span>
                <span
                  className={cn(
                    'ml-auto text-[10.5px]',
                    p.configured ? 'text-positive' : 'text-muted-foreground',
                  )}
                >
                  {p.configured ? 'Connected' : 'Not connected'}
                </span>
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1">
                {p.modalities.map((mod) => (
                  <span
                    key={mod}
                    className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <ModalityIcon type={mod} className="size-2.5" />
                    {mod}
                  </span>
                ))}
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10.5px] text-muted-foreground">
                  {p.keyEnvVar}
                </code>
                <a
                  href={p.docsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground underline decoration-dotted underline-offset-2 transition hover:text-foreground"
                >
                  Get a key
                  <ExternalLink className="size-2.5" />
                </a>
              </div>
            </li>
          ))}
        </ul>

        {state.unsupported.length > 0 && (
          <div className="border-t px-3 py-2.5">
            <h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Not covered
            </h3>
            <ul className="mt-1.5 space-y-1">
              {ALL.filter((mod) => state.unsupported.includes(mod)).map((mod) => (
                <li key={mod} className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                  <ModalityIcon type={mod} className="size-3 opacity-60" />
                  <span className="font-medium text-foreground">
                    {EXPERIMENT_TYPES.find((t) => t.id === mod)?.label ?? mod}
                  </span>
                  <span className="opacity-70">&mdash; no connected provider serves it</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[10.5px] leading-relaxed text-muted-foreground">
              A provider is one file in <code className="font-mono">src/lib/providers</code>. See{' '}
              <code className="font-mono">PROVIDERS.md</code>.
            </p>
          </div>
        )}

        <p className="border-t px-3 py-2 text-[10.5px] leading-relaxed text-muted-foreground">
          Keys are read from <code className="font-mono">.env.local</code> at startup. Add one and restart
          the server to connect it.
        </p>
      </PopoverContent>
    </Popover>
  )
}
