/**
 * Story-folder reader for the RP Hub Host half.
 *
 * Storage is intentionally dumb: one directory per story, one `story.json` per
 * directory, unknown fields ignored. The reader never writes and never creates
 * the data directory; a missing directory is an empty index, a malformed story
 * is skipped so one bad folder cannot blank the whole panel.
 */
import type { Dirent } from 'node:fs'
import { appendFile, readdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RpStoryDocument, RpStoryMeta, RpStorySummary, RpTurn } from './types.ts'

/** The raw `story.json` fields the hub consumes; every other field is ignored. */
interface RawStoryMeta {
  readonly schemaVersion?: unknown
  readonly title?: unknown
  readonly createdAt?: unknown
  readonly updatedAt?: unknown
  readonly interactionMode?: unknown
  readonly model?: unknown
}

/**
 * List every readable story folder under `dataDir`, newest first.
 * @param dataDir - absolute directory holding one folder per story.
 * @returns summaries of the folders whose `story.json` parsed; a missing
 *   directory yields an empty list.
 */
export async function listStories(dataDir: string): Promise<readonly RpStorySummary[]> {
  const ids = await storyIds(dataDir)
  const summaries: RpStorySummary[] = []
  for (const id of ids) {
    const meta = await readMeta(dataDir, id)
    if (meta === undefined) continue
    summaries.push(meta.updatedAt === undefined
      ? { id: meta.id, title: meta.title }
      : { id: meta.id, title: meta.title, updatedAt: meta.updatedAt })
  }
  return summaries.sort((left, right) =>
    (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')
    || left.title.localeCompare(right.title))
}

/**
 * Read one story folder: normalized metadata, the static system prompt, and
 * every well-formed turn in file order.
 * @param dataDir - the stories root.
 * @param id - validated folder name.
 * @returns the document, or undefined when the folder has no readable metadata.
 */
export async function readStoryDocument(dataDir: string, id: string): Promise<RpStoryDocument | undefined> {
  const meta = await readMeta(dataDir, id)
  if (meta === undefined) return undefined
  const [system, turns] = await Promise.all([
    readSystem(dataDir, id),
    readTurns(dataDir, id),
  ])
  return { meta, system, turns }
}

/**
 * List the directory entries that are candidate story folders.
 * @param dataDir - the stories root.
 * @returns folder names; empty when the root does not exist.
 */
async function storyIds(dataDir: string): Promise<readonly string[]> {
  let entries: Dirent[]
  try {
    entries = await readdir(dataDir, { withFileTypes: true })
  } catch (error: unknown) {
    if (isErrorCode(error, 'ENOENT')) return []
    throw error
  }
  return entries.filter(entry => entry.isDirectory()).map(entry => entry.name)
}

/**
 * Read and normalize one folder's `story.json`.
 * @param dataDir - the stories root.
 * @param id - folder name; authoritative over a stale `story.json` copy.
 * @returns normalized metadata, or undefined when the file is absent or malformed.
 */
async function readMeta(dataDir: string, id: string): Promise<RpStoryMeta | undefined> {
  const raw = await readText(join(dataDir, id, 'story.json'))
  if (raw === undefined) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const meta = parsed as RawStoryMeta
  const title = typeof meta.title === 'string' && meta.title.trim() !== '' ? meta.title : id
  return {
    id,
    title,
    ...typeof meta.schemaVersion === 'number' ? { schemaVersion: meta.schemaVersion } : {},
    ...typeof meta.createdAt === 'string' ? { createdAt: meta.createdAt } : {},
    ...typeof meta.updatedAt === 'string' ? { updatedAt: meta.updatedAt } : {},
    ...typeof meta.interactionMode === 'string' ? { interactionMode: meta.interactionMode } : {},
    ...typeof meta.model === 'string' && meta.model !== '' ? { model: meta.model } : {},
  }
}

/**
 * Read the story's static system prompt verbatim.
 * @param dataDir - the stories root.
 * @param id - story folder.
 * @returns the file text, or an empty string when `system.md` is absent.
 */
async function readSystem(dataDir: string, id: string): Promise<string> {
  return await readText(join(dataDir, id, 'system.md')) ?? ''
}

/**
 * Read and filter `turns.jsonl`: one JSON object per line, malformed lines
 * skipped so one bad turn cannot blank the story.
 * @param dataDir - the stories root.
 * @param id - story folder.
 * @returns well-formed turns in file order.
 */
async function readTurns(dataDir: string, id: string): Promise<readonly RpTurn[]> {
  const text = await readText(join(dataDir, id, 'turns.jsonl'))
  if (text === undefined) return []
  const turns: RpTurn[] = []
  for (const line of text.split(/\r?\n/u)) {
    if (line.trim() === '') continue
    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      continue
    }
    if (typeof parsed !== 'object' || parsed === null) continue
    const record = parsed as Record<string, unknown>
    const role = record.role
    if (role !== 'user' && role !== 'response') continue
    if (typeof record.text !== 'string') continue
    const turnId = typeof record.id === 'string' && record.id !== ''
      ? record.id
      : `t_${String(turns.length + 1).padStart(4, '0')}`
    turns.push(typeof record.ts === 'string'
      ? { id: turnId, role, text: record.text, ts: record.ts }
      : { id: turnId, role, text: record.text })
  }
  return turns
}

/**
 * Append one turn to a story and stamp `story.json`'s `updatedAt`.
 *
 * The line append is the durable step; the metadata stamp follows it and is
 * best-effort (the turn is already safe if the stamp fails). Single-writer for
 * now: one browser panel composes a story.
 * @param dataDir - the stories root.
 * @param id - validated story folder.
 * @param role - canon turn role.
 * @param text - verbatim turn text.
 * @returns the appended turn, or undefined when the folder has no readable metadata.
 */
export async function appendStoryTurn(
  dataDir: string,
  id: string,
  role: RpTurn['role'],
  text: string,
): Promise<RpTurn | undefined> {
  if (await readMeta(dataDir, id) === undefined) return undefined
  const turns = await readTurns(dataDir, id)
  const turn: RpTurn = {
    id: nextTurnId(turns),
    role,
    text,
    ts: new Date().toISOString(),
  }
  await appendFile(join(dataDir, id, 'turns.jsonl'), `${JSON.stringify(turn)}\n`, 'utf8')
  await stampUpdatedAt(dataDir, id, turn.ts ?? new Date().toISOString())
  return turn
}

/**
 * Compute the next sequential turn id from the ids already on disk.
 * @param turns - existing turns.
 * @returns `t_<n+1>` zero-padded to four digits.
 */
function nextTurnId(turns: readonly RpTurn[]): string {
  let max = 0
  for (const turn of turns) {
    const match = /^t_(\d+)$/u.exec(turn.id)
    if (match?.[1] !== undefined) max = Math.max(max, Number(match[1]))
  }
  return `t_${String(max + 1).padStart(4, '0')}`
}

/**
 * Rewrite `story.json`'s `updatedAt` while preserving every other field.
 * @param dataDir - the stories root.
 * @param id - story folder.
 * @param iso - timestamp to record.
 * @returns completion after the atomic replacement.
 */
async function stampUpdatedAt(dataDir: string, id: string, iso: string): Promise<void> {
  const path = join(dataDir, id, 'story.json')
  const raw = await readText(path)
  if (raw === undefined) return
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return
  }
  if (typeof parsed !== 'object' || parsed === null) return
  const next = { ...(parsed as Record<string, unknown>), updatedAt: iso }
  const temporary = `${path}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, `${JSON.stringify(next, null, 2)}\n`, 'utf8')
  await rename(temporary, path)
}

/**
 * Read a UTF-8 file, treating an absent file as absent rather than an error.
 * @param path - absolute path to read.
 * @returns the text, or undefined when the file does not exist.
 */
async function readText(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch (error: unknown) {
    if (isErrorCode(error, 'ENOENT')) return undefined
    throw error
  }
}

/**
 * Whether an unknown thrown value carries one Node error code.
 * @param error - value caught around a filesystem call.
 * @param code - Node error code to match.
 * @returns true when the error carries that code.
 */
function isErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error
    && (error as { readonly code?: unknown }).code === code
}
