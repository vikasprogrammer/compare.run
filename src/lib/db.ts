import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { EXAMPLE_EXPERIMENTS, EXAMPLE_RUNS } from './examples'
import type { ContentOutput, Experiment, Modality, Output, Result, Run, RunStatus } from './types'

const DIR = path.join(process.cwd(), '.data')
const DB_PATH = path.join(DIR, 'compare-run.db')
fs.mkdirSync(DIR, { recursive: true })

/**
 * The database was called playground.db before the project was named. Move it
 * rather than start a fresh one, so existing runs survive the rename. SQLite
 * keys its write-ahead log off the main filename, so all three move together.
 */
function renameLegacyDatabase(): void {
  const legacy = path.join(DIR, 'playground.db')
  if (fs.existsSync(DB_PATH) || !fs.existsSync(legacy)) return
  for (const suffix of ['', '-wal', '-shm']) {
    if (fs.existsSync(legacy + suffix)) fs.renameSync(legacy + suffix, DB_PATH + suffix)
  }
}

// Next reloads modules in dev; hold one handle so we don't reopen per request.
const g = globalThis as unknown as { __pgDb?: DatabaseSync }

function open(): DatabaseSync {
  if (g.__pgDb) return g.__pgDb
  renameLegacyDatabase()
  const db = new DatabaseSync(DB_PATH)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, type TEXT NOT NULL, prompt TEXT NOT NULL,
      template_id TEXT, model_ids TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY, experiment_id TEXT NOT NULL, seq INTEGER NOT NULL, label TEXT NOT NULL,
      started_at TEXT NOT NULL, status TEXT NOT NULL, note TEXT,
      prompt TEXT NOT NULL DEFAULT '', model_ids TEXT NOT NULL DEFAULT '[]'
    );
    CREATE TABLE IF NOT EXISTS results (
      run_id TEXT NOT NULL, model_id TEXT NOT NULL, status TEXT NOT NULL,
      duration_sec REAL NOT NULL DEFAULT 0, cost_usd REAL, tokens_in INTEGER NOT NULL DEFAULT 0,
      tokens_out INTEGER NOT NULL DEFAULT 0, score INTEGER, output TEXT NOT NULL, error TEXT,
      PRIMARY KEY (run_id, model_id)
    );
    CREATE INDEX IF NOT EXISTS idx_runs_exp ON runs (experiment_id);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)
  migrate(db)
  g.__pgDb = db
  seed(db)
  repairDuplicatedProse(db)
  clearSeededScores(db)
  return db
}

/** Adds the run snapshot columns to databases created before they existed. */
function migrate(db: DatabaseSync): void {
  const cols = new Set(
    (db.prepare('PRAGMA table_info(runs)').all() as { name: string }[]).map((c) => c.name),
  )
  if (!cols.has('prompt')) {
    db.exec("ALTER TABLE runs ADD COLUMN prompt TEXT NOT NULL DEFAULT ''")
    db.exec("ALTER TABLE runs ADD COLUMN model_ids TEXT NOT NULL DEFAULT '[]'")
    // Backfill from the parent experiment: the best record we have of what
    // those runs were given.
    db.exec(`UPDATE runs SET
      prompt = COALESCE((SELECT prompt FROM experiments e WHERE e.id = runs.experiment_id), ''),
      model_ids = COALESCE((SELECT model_ids FROM experiments e WHERE e.id = runs.experiment_id), '[]')`)
  }
}

/**
 * The bundled examples used to ship with hand-written scores, which rendered as
 * filled dots. Nothing can produce a score yet, so showing them advertised a
 * feature that does not exist.
 */
function clearSeededScores(db: DatabaseSync): void {
  const done = db.prepare("SELECT value FROM meta WHERE key = 'clear_scores_v1'").get()
  if (done) return
  const { changes } = db.prepare('UPDATE results SET score = NULL WHERE score IS NOT NULL').run()
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('clear_scores_v1', ?)").run(String(changes))
}

/**
 * Early versions of the prose parser rendered text twice: it took a
 * single-paragraph answer as the title and then repeated it as the body, and it
 * left the deck paragraph in the body as well. New runs are parsed correctly;
 * this repairs what was already stored rather than leaving old runs misreported.
 */
function repairDuplicatedProse(db: DatabaseSync): void {
  const done = db.prepare("SELECT value FROM meta WHERE key = 'prose_repair_v1'").get()
  if (done) return

  const rows = db.prepare('SELECT run_id, model_id, output FROM results').all() as Row[]
  const update = db.prepare('UPDATE results SET output = ? WHERE run_id = ? AND model_id = ?')
  let repaired = 0

  for (const row of rows) {
    let output: ContentOutput
    try {
      output = JSON.parse(row.output as string) as ContentOutput
    } catch {
      continue
    }
    if (output?.kind !== 'content' || !Array.isArray(output.sections)) continue

    const sections = output.sections.map((s) => ({ ...s, paragraphs: [...s.paragraphs] }))
    let changed = false

    // The deck was lifted from the body but never removed from it.
    if (output.deck && sections[0]?.paragraphs[0] === output.deck) {
      sections[0].paragraphs.shift()
      changed = true
    }
    // The whole answer was taken as the title and repeated below it.
    if (output.title && sections[0]?.paragraphs[0] === output.title) {
      sections[0].paragraphs.shift()
      changed = true
    }
    if (output.title && output.title.length > 100) {
      output.title = ''
      changed = true
    }
    if (!changed) continue

    if (sections[0] && !sections[0].heading && sections[0].paragraphs.length === 0) sections.shift()
    const count = sections.length || 1
    update.run(
      JSON.stringify({
        ...output,
        sections,
        summary: `${output.wordCount} words across ${count} section${count === 1 ? '' : 's'}.`,
      }),
      row.run_id as string,
      row.model_id as string,
    )
    repaired++
  }

  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('prose_repair_v1', ?)").run(String(repaired))
}

/** The bundled examples become real rows on first boot, so the app is never empty. */
function seed(db: DatabaseSync): void {
  const { c } = db.prepare('SELECT COUNT(*) AS c FROM experiments').get() as { c: number }
  if (c > 0) return

  const insExp = db.prepare(
    'INSERT INTO experiments (id,title,type,prompt,template_id,model_ids,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
  )
  for (const e of EXAMPLE_EXPERIMENTS) {
    insExp.run(e.id, e.title, e.type, e.prompt, e.templateId, JSON.stringify(e.modelIds), e.createdAt, e.updatedAt)
  }
  // Example runs inherit the snapshot from their experiment, the same way the
  // migration backfills older rows.
  const byId = new Map(EXAMPLE_EXPERIMENTS.map((e) => [e.id, e]))
  for (const r of EXAMPLE_RUNS) {
    const parent = byId.get(r.experimentId)
    insertRun(db, { ...r, prompt: parent?.prompt ?? '', modelIds: parent?.modelIds ?? [] })
  }
}

export const db = open()

function insertRun(database: DatabaseSync, run: Run): void {
  database
    .prepare(
      'INSERT OR REPLACE INTO runs (id,experiment_id,seq,label,started_at,status,note,prompt,model_ids) VALUES (?,?,?,?,?,?,?,?,?)',
    )
    .run(
      run.id, run.experimentId, run.seq, run.label, run.startedAt, run.status, run.note,
      run.prompt, JSON.stringify(run.modelIds),
    )
  for (const res of run.results) upsertResult(database, run.id, res)
}

function upsertResult(database: DatabaseSync, runId: string, r: Result): void {
  database
    .prepare(
      `INSERT OR REPLACE INTO results
       (run_id,model_id,status,duration_sec,cost_usd,tokens_in,tokens_out,score,output,error)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
    )
    .run(runId, r.modelId, r.status, r.durationSec, r.costUsd, r.tokensIn, r.tokensOut, r.score, JSON.stringify(r.output), r.error ?? null)
}

type Row = Record<string, unknown>

const toExperiment = (r: Row): Experiment => ({
  id: r.id as string,
  title: r.title as string,
  type: r.type as Modality,
  prompt: r.prompt as string,
  templateId: (r.template_id as string) ?? null,
  modelIds: JSON.parse(r.model_ids as string) as string[],
  createdAt: r.created_at as string,
  updatedAt: r.updated_at as string,
})

const toResult = (r: Row): Result => ({
  modelId: r.model_id as string,
  status: r.status as RunStatus,
  durationSec: Number(r.duration_sec),
  costUsd: r.cost_usd == null ? null : Number(r.cost_usd),
  tokensIn: Number(r.tokens_in),
  tokensOut: Number(r.tokens_out),
  score: r.score == null ? null : Number(r.score),
  output: JSON.parse(r.output as string) as Output,
  ...(r.error ? { error: r.error as string } : {}),
})

function toRun(r: Row): Run {
  const results = (db.prepare('SELECT * FROM results WHERE run_id = ?').all(r.id as string) as Row[]).map(toResult)
  return {
    id: r.id as string,
    experimentId: r.experiment_id as string,
    seq: Number(r.seq),
    label: r.label as string,
    startedAt: r.started_at as string,
    status: r.status as RunStatus,
    prompt: (r.prompt as string) ?? '',
    modelIds: JSON.parse((r.model_ids as string) || '[]') as string[],
    note: (r.note as string) ?? null,
    results,
  }
}

// ---------------------------------------------------------------- queries ---

export function listExperiments(): Experiment[] {
  return (db.prepare('SELECT * FROM experiments ORDER BY updated_at DESC').all() as Row[]).map(toExperiment)
}

export function getExperiment(id: string): Experiment | undefined {
  const r = db.prepare('SELECT * FROM experiments WHERE id = ?').get(id) as Row | undefined
  return r ? toExperiment(r) : undefined
}

export function getRun(id: string): Run | undefined {
  const r = db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as Row | undefined
  return r ? toRun(r) : undefined
}

export function allRuns(): Run[] {
  return (db.prepare('SELECT * FROM runs ORDER BY started_at DESC').all() as Row[]).map(toRun)
}

// ----------------------------------------------------------------- writes ---

export function createExperiment(e: Experiment): void {
  db.prepare(
    'INSERT INTO experiments (id,title,type,prompt,template_id,model_ids,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)',
  ).run(e.id, e.title, e.type, e.prompt, e.templateId, JSON.stringify(e.modelIds), e.createdAt, e.updatedAt)
}

export function createRun(run: Run): void {
  insertRun(db, run)
  db.prepare('UPDATE experiments SET updated_at = ?, prompt = ?, model_ids = ? WHERE id = ?').run(
    run.startedAt, run.prompt, JSON.stringify(run.modelIds), run.experimentId,
  )
}

/** The run before this one, used to describe what changed. */
export function previousRun(experimentId: string, seq: number): Run | undefined {
  const r = db
    .prepare('SELECT * FROM runs WHERE experiment_id = ? AND seq < ? ORDER BY seq DESC LIMIT 1')
    .get(experimentId, seq) as Row | undefined
  return r ? toRun(r) : undefined
}

export function saveResult(runId: string, result: Result): void {
  upsertResult(db, runId, result)
}

export function setRunStatus(runId: string, status: RunStatus): void {
  db.prepare('UPDATE runs SET status = ? WHERE id = ?').run(status, runId)
}

export function nextSeq(experimentId: string): number {
  const r = db.prepare('SELECT MAX(seq) AS m FROM runs WHERE experiment_id = ?').get(experimentId) as { m: number | null }
  return (r.m ?? 0) + 1
}

/** Nothing can still be running after a restart — no process owns it. */
export function reconcile(): void {
  const now = new Date().toISOString()
  db.prepare("UPDATE results SET status='failed', error='Interrupted by a server restart' WHERE status IN ('running','queued')").run()
  db.prepare("UPDATE runs SET status='complete' WHERE status IN ('running','queued')").run()
  void now
}

/**
 * Models used in recent runs that are not in the curated shortlist. Reaching
 * for one from the full catalogue once should be enough — it stays on the
 * picker afterwards rather than making you search for it again.
 */
export function recentModelIds(limit = 12): string[] {
  const rows = db
    .prepare(
      `SELECT results.model_id AS id, MAX(runs.started_at) AS last_used
       FROM results JOIN runs ON runs.id = results.run_id
       GROUP BY results.model_id
       ORDER BY last_used DESC
       LIMIT ?`,
    )
    .all(limit * 3) as Row[]
  return rows.map((r) => r.id as string).slice(0, limit)
}
