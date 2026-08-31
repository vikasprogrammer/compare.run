'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Copy, GitCompare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { diffWords } from '@/lib/diff'
import type { Run } from '@/lib/types'

export function PromptPanel({ run, previous }: { run: Run; previous?: Run }) {
  const [expanded, setExpanded] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const [copied, setCopied] = useState(false)
  const [overflows, setOverflows] = useState(false)
  const bodyRef = useRef<HTMLParagraphElement>(null)

  const prompt = run.prompt
  const changed = Boolean(previous && previous.prompt.trim() !== prompt.trim())

  // Selecting a different run starts fresh rather than inheriting the last
  // one's expanded state.
  useEffect(() => {
    setExpanded(false)
    setShowDiff(false)
  }, [run.id])

  /**
   * Whether the clamp is actually hiding anything, measured rather than
   * guessed from a character count — the same prompt wraps differently at
   * different widths, so a threshold shows "More" when there is no more.
   */
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (!el || expanded) return
    const measure = () => setOverflows(el.scrollHeight - el.clientHeight > 1)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [prompt, expanded, showDiff])

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
          ref={bodyRef}
          className={cn(
            'text-[12px] leading-relaxed text-muted-foreground',
            !expanded && 'line-clamp-3',
          )}
        >
          {parts.map((part, i) =>
            part.type === 'same' ? (
              <span key={i}>{part.text}</span>
            ) : part.type === 'add' ? (
              <span key={i} className="rounded-[2px] bg-positive/15 text-positive">
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
          ref={bodyRef}
          className={cn(
            'whitespace-pre-wrap text-[12px] leading-relaxed text-muted-foreground',
            !expanded && 'line-clamp-2',
          )}
        >
          {prompt}
        </p>
      )}

      <div className="mt-1 flex flex-wrap items-center gap-3">
        {(overflows || expanded) && (
          <Control onClick={() => setExpanded((v) => !v)}>
            {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
            {expanded ? 'Less' : 'More'}
          </Control>
        )}

        <Control onClick={copy}>
          {copied ? <Check className="size-3 text-positive" /> : <Copy className="size-3" />}
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
            <span className="text-positive">added</span> ·{' '}
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
