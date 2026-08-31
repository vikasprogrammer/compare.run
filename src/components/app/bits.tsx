import { Clapperboard, Code2, Image as ImageIcon, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { Modality, RunStatus } from '@/lib/types'

const ICONS = { code: Code2, content: PenLine, video: Clapperboard, image: ImageIcon }

export function ModalityIcon({ type, className }: { type: Modality; className?: string }) {
  const Icon = ICONS[type]
  return <Icon className={cn('size-4', className)} strokeWidth={1.75} />
}

const STATUS: Record<RunStatus, { label: string; className: string }> = {
  complete: { label: 'Complete', className: 'border-positive/30 bg-positive/10 text-positive' },
  running: { label: 'Running', className: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400' },
  failed: { label: 'Failed', className: 'border-destructive/30 bg-destructive/10 text-destructive' },
  queued: { label: 'Queued', className: 'border-border bg-muted text-muted-foreground' },
}

export function StatusPill({ status, className }: { status: RunStatus; className?: string }) {
  const s = STATUS[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium',
        s.className,
        className,
      )}
    >
      {status === 'running' && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
      {s.label}
    </span>
  )
}

export function Prompt({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-relaxed text-muted-foreground">
      {children}
    </p>
  )
}

export { Badge }
