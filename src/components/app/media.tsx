'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Expand, Pause, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ImageOutput, VideoOutput } from '@/lib/types'

// ---------------------------------------------------------------- player ----

/**
 * There is no file behind a generated clip yet, so playback is a clock: the
 * scrubber fills in real seconds and the shot list follows the playhead.
 * Driven by rAF off performance.now() so it never drifts.
 */
function useClipPlayer(durationSec: number) {
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  // The ref is the playhead of record; state exists only to paint it. Both are
  // written from effects and handlers, never during render.
  const tRef = useRef(0)

  useEffect(() => {
    if (!playing) return
    let frame = 0
    const startedAt = performance.now()
    const from = tRef.current
    const step = (now: number) => {
      const next = from + (now - startedAt) / 1000
      if (next >= durationSec) {
        tRef.current = durationSec
        setT(durationSec)
        setPlaying(false)
        return
      }
      tRef.current = next
      setT(next)
      frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [playing, durationSec])

  const toggle = useCallback(() => {
    if (tRef.current >= durationSec) {
      tRef.current = 0
      setT(0)
    }
    setPlaying((p) => !p)
  }, [durationSec])

  const start = useCallback(() => {
    tRef.current = 0
    setT(0)
    setPlaying(true)
  }, [])

  return { t, playing, toggle, start, pct: durationSec ? (t / durationSec) * 100 : 0 }
}

const stamp = (s: number) => `0:${String(Math.floor(s)).padStart(2, '0')}`

function Scrubber({ t, duration, pct }: { t: number; duration: number; pct: number }) {
  return (
    <span className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/60 to-transparent px-2.5 pb-1.5 pt-5">
      <span className="font-mono text-[10px] tabular-nums text-white/90">{stamp(t)}</span>
      <span className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
        <span className="block h-full rounded-full bg-white/90" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[10px] tabular-nums text-white/90">{stamp(duration)}</span>
    </span>
  )
}

// ----------------------------------------------------------------- video ----

export function VideoView({
  output,
  label,
  assetBase,
}: {
  output: VideoOutput
  label: string
  assetBase: string
}) {
  const [open, setOpen] = useState(false)
  const clip = output.url
  // A hand-written example has a shot list but no file; a failed run has neither.
  const empty = !clip && output.shots.length === 0

  return (
    <div className="space-y-2">
      {clip ? (
        <div className="group relative">
          {/* A real file gets a real player — the synthetic scrubber below is
              only for the bundled examples, which have no video behind them. */}
          <video
            src={clip}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full rounded-md border bg-black"
          />
          <button
            onClick={() => setOpen(true)}
            aria-label={`Open ${label} full size`}
            className="absolute right-1.5 top-1.5 rounded bg-black/45 p-1 opacity-0 backdrop-blur-sm transition group-hover:opacity-100"
          >
            <Expand className="size-3 text-white" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => !empty && setOpen(true)}
          disabled={empty}
          className="group relative block aspect-video w-full overflow-hidden rounded-md border disabled:cursor-not-allowed"
          aria-label={empty ? 'No clip' : `Open ${label} clip`}
        >
          <span
            className="absolute inset-0"
            style={{ background: `linear-gradient(140deg, ${output.poster[0]}, ${output.poster[1]})` }}
          />
          {empty ? (
            <span className="relative grid h-full place-items-center text-[11px] text-white/70">
              No clip produced
            </span>
          ) : (
            <>
              <span className="relative grid h-full place-items-center">
                <span className="grid size-10 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm transition group-hover:scale-105 group-hover:bg-white/25">
                  <Play className="size-4 translate-x-px fill-white text-white" />
                </span>
              </span>
              <Scrubber t={0} duration={output.durationSec} pct={0} />
            </>
          )}
        </button>
      )}

      <div className="flex flex-wrap items-center gap-1">
        {output.resolution !== '—' && <Chip>{output.resolution}</Chip>}
        {output.fps > 0 && <Chip>{output.fps} fps</Chip>}
        <Chip>{output.aspect}</Chip>
        <DownloadLink href={`${assetBase}/0`} available={Boolean(clip)} what="clip" className="ml-auto" />
      </div>

      {output.shots.length > 0 && (
        <ol className="space-y-0.5">
          {output.shots.map((shot) => (
            <li key={shot.at} className="flex gap-2 px-1.5 py-1 text-[11.5px] leading-snug text-muted-foreground">
              <span className="shrink-0 font-mono text-[10.5px] tabular-nums opacity-70">{stamp(shot.at)}</span>
              <span>{shot.description}</span>
            </li>
          ))}
        </ol>
      )}

      <VideoLightbox open={open} onOpenChange={setOpen} output={output} label={label} assetBase={assetBase} />
    </div>
  )
}

function VideoLightbox({
  open,
  onOpenChange,
  output,
  label,
  assetBase,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  output: VideoOutput
  label: string
  assetBase: string
}) {
  const { t, playing, toggle, start, pct } = useClipPlayer(output.durationSec)

  // Opening the overlay is the play gesture; it should not need a second click.
  useEffect(() => {
    if (open && !output.url) start()
  }, [open, start, output.url])

  const current = [...output.shots].reverse().find((s) => s.at <= t) ?? output.shots[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-sm">{label}</DialogTitle>
        </DialogHeader>

        {output.url ? (
          <video
            src={output.url}
            controls
            autoPlay
            playsInline
            className="aspect-video w-full rounded-lg border bg-black"
          />
        ) : (
        <button
          onClick={toggle}
          className="group relative block aspect-video w-full overflow-hidden rounded-lg border"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          <span
            className="absolute inset-0 will-change-transform"
            style={{
              background: `linear-gradient(140deg, ${output.poster[0]}, ${output.poster[1]})`,
              transform: `scale(${1 + (pct / 100) * 0.08})`,
            }}
          />
          <span
            className={cn(
              'relative grid h-full place-items-center transition-opacity',
              playing && 'opacity-0 group-hover:opacity-100',
            )}
          >
            <span className="grid size-14 place-items-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
              {playing ? (
                <Pause className="size-5 fill-white text-white" />
              ) : (
                <Play className="size-5 translate-x-px fill-white text-white" />
              )}
            </span>
          </span>
          <Scrubber t={t} duration={output.durationSec} pct={pct} />
        </button>
        )}

        <div className="flex flex-wrap gap-1.5">
          {output.fps > 0 && <Chip>{output.fps} fps</Chip>}
          <Chip>{output.aspect}</Chip>
          {output.resolution !== '—' && <Chip>{output.resolution}</Chip>}
          {output.audio && <Chip>{output.audio}</Chip>}
          <DownloadLink href={`${assetBase}/0`} available={Boolean(output.url)} what="clip" className="ml-auto" />
        </div>

        <ol className="space-y-0.5">
          {output.shots.map((shot) => (
            <li
              key={shot.at}
              className={cn(
                'flex gap-3 rounded px-2 py-1.5 text-[13px] leading-snug transition-colors',
                shot === current ? 'bg-muted text-foreground' : 'text-muted-foreground',
              )}
            >
              <span className="shrink-0 font-mono text-[11px] tabular-nums opacity-70">{stamp(shot.at)}</span>
              <span>{shot.description}</span>
            </li>
          ))}
        </ol>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------- image ----

export function ImageView({
  output,
  label,
  assetBase,
}: {
  output: ImageOutput
  label: string
  assetBase: string
}) {
  const [index, setIndex] = useState<number | null>(null)
  // Only a caption that reports a defect is a defect. Real provider captions
  // are just "Variation 1", and marking those red cries wolf.
  const flagged = (c: string) => /misspelled|uneven|reversed|illegible/i.test(c)

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {output.images.map((img, i) => (
        <figure key={img.seed} className="space-y-1">
          <button
            onClick={() => setIndex(i)}
            className="group relative block w-full overflow-hidden rounded-md border"
            aria-label={`Open ${img.caption}`}
          >
            {img.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img.url} alt={img.caption} className="aspect-square w-full object-cover" />
            ) : (
              <span
                className="flex aspect-square items-center justify-center"
                style={{
                  background: img.gradient
                    ? `linear-gradient(150deg, ${img.gradient[0]}, ${img.gradient[1]} 55%, ${img.gradient[2]})`
                    : undefined,
                }}
              >
                <span className="flex h-[56%] w-[62%] items-center justify-center rounded-[2px] bg-white/95 shadow-[0_8px_18px_-10px_rgba(0,0,0,.6)]">
                  <span className="font-sans text-[8px] font-semibold tracking-[0.16em] text-neutral-800">
                    {img.caption.split(' — ')[0]}
                  </span>
                </span>
              </span>
            )}
            <span className="absolute right-1 top-1 rounded bg-black/40 p-1 opacity-0 backdrop-blur-sm transition group-hover:opacity-100">
              <Expand className="size-3 text-white" />
            </span>
          </button>
          <figcaption
            className={cn('truncate text-[10px]', flagged(img.caption) ? 'text-destructive' : 'text-muted-foreground')}
            title={img.caption}
          >
            {img.caption.split(' — ')[1] ?? img.caption}
          </figcaption>
        </figure>
      ))}

      <ImageLightbox
        output={output}
        label={label}
        assetBase={assetBase}
        index={index}
        onIndex={setIndex}
        onClose={() => setIndex(null)}
      />
    </div>
  )
}

function ImageLightbox({
  output,
  label,
  assetBase,
  index,
  onIndex,
  onClose,
}: {
  output: ImageOutput
  label: string
  assetBase: string
  index: number | null
  onIndex: (i: number) => void
  onClose: () => void
}) {
  const count = output.images.length
  const open = index !== null
  const img = index === null ? null : output.images[index]

  const step = useCallback(
    (delta: number) => {
      if (index === null) return
      onIndex((index + delta + count) % count)
    },
    [index, count, onIndex],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1)
      if (e.key === 'ArrowRight') step(1)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, step])

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-sm">
            {label}
            {index !== null && (
              <span className="ml-2 font-mono text-[11px] font-normal text-muted-foreground">
                {index + 1} / {count}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="relative">
          {img?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img.url} alt={img.caption} className="max-h-[65vh] w-full rounded-lg border object-contain" />
          ) : (
            <div
              className="flex aspect-square max-h-[65vh] items-center justify-center rounded-lg border"
              style={{
                background: img?.gradient
                  ? `linear-gradient(150deg, ${img.gradient[0]}, ${img.gradient[1]} 55%, ${img.gradient[2]})`
                  : undefined,
              }}
            >
              <div className="flex h-[56%] w-[62%] items-center justify-center rounded bg-white/95 shadow-2xl">
                <span className="font-sans text-lg font-semibold tracking-[0.18em] text-neutral-800">
                  {img?.caption.split(' — ')[0]}
                </span>
              </div>
            </div>
          )}

          {count > 1 && (
            <>
              <NavButton side="left" onClick={() => step(-1)} />
              <NavButton side="right" onClick={() => step(1)} />
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-[12px] text-muted-foreground">{img?.caption}</p>
          <DownloadLink
            href={`${assetBase}/${index ?? 0}`}
            available={Boolean(img?.url)}
            what="image"
            className="ml-auto"
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function NavButton({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  const Icon = side === 'left' ? ChevronLeft : ChevronRight
  return (
    <button
      onClick={onClick}
      aria-label={side === 'left' ? 'Previous' : 'Next'}
      className={cn(
        'absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full border bg-background/80 backdrop-blur transition hover:bg-background',
        side === 'left' ? 'left-2' : 'right-2',
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}

/**
 * Only offers a file when one exists. A demo placeholder or an unconnected
 * video provider has nothing to hand over, and a button that downloads an
 * error is worse than one that explains itself.
 */
function DownloadLink({
  href,
  available,
  what,
  className,
}: {
  href: string
  available: boolean
  what: string
  className?: string
}) {
  if (!available) {
    return (
      <span
        className={cn('inline-flex items-center gap-1 text-[10.5px] text-muted-foreground/50', className)}
        title={`No ${what} file to download — this result has no generated asset`}
      >
        <Download className="size-3" />
      </span>
    )
  }
  return (
    <a
      href={href}
      className={cn(
        'inline-flex items-center gap-1 text-[10.5px] text-muted-foreground underline decoration-dotted underline-offset-2 transition hover:text-foreground',
        className,
      )}
      title={`Download this ${what}`}
    >
      <Download className="size-3" />
      Download
    </a>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <Badge variant="secondary" className="rounded px-1.5 py-0 font-mono text-[10.5px] font-normal">
      {children}
    </Badge>
  )
}
