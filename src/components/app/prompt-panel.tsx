'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, GitCompare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { diffWords } from '@/lib/diff'
import type { Run } from '@/lib/types'

/** Longer than this and the prompt is collapsed until asked for. */
const COLLAPSE_OVER = 180

export function PromptPanel({ run, previous }: { run: Run; previous?: Run }) {
  const [expanded, setExpanded] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [copied, setCopied] = useState(false)

  const prompt = run.prompt
  const changed = Boolean(previous && previous.prompt.trim() !== prompt.trim())
  const collapsible = prompt.length > COLLAPSE_OVER

  const parts = useMemo(
    () => (showDiff && previous ? diffWords(previous.prompt, prompt) : null),
    [showDiff, previous, prompt],
  )

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-1.5">
      {parts ? (
        <p
          className={cn(
            'text-[12px] leading-relaxed text-muted-foreground',
            !expanded && 'line-clamp-3',
          )}
        >
          {parts.map((part, i) =>
            part.type === 'same' ? (
              <span key={i}>{part.text}</span>
            ) : part.type === 'add' ? (
              <span key={i} className="rounded-[2px] bg-score-good/15 text-score-good">
                {part.text}
              </span>
            ) : (
              <span key={i} className="rounded-[2px] bg-destructive/10 text-destructive line-through">
                {part.text}
              </span>
            ),
          )}
        </p>
      ) : (
        <p
          className={cn(
            'whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground',
            !expanded && 'line-clamp-2',
          )}
        >
          {prompt}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-3">
        {(collapsible || parts) && (
          <Control onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? 'Less' : 'More'}
          </Control>
        )}

        <Control onClick={copy}>
          {copied ? <Check className="size-3 text-score-good" /> : <Copy className="size-3" />}
          {copied ? 'Copied' : 'Copy prompt'}
        </Control>

        {changed && previous && (
          <Control onClick={() => setShowDiff((v) => !v)} active={showDiff}>
            <GitCompare className="size-3" />
            {showDiff ? 'Hide diff' : `Diff vs ${previous.label}`}
          </Control>
        )}

        {showDiff && (
          <span className="text-[10.5px] text-muted-foreground/70">
            <span className="text-score-good">added</span> ·{' '}
            <span className="text-destructive line-through">removed</span>
          </span>
        )}
      </div>
    </div>
  )
}

function Control({
  onClick,
  active,
  children,
}: {
  onClick: () => void
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 text-[11px] transition',
        active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}
