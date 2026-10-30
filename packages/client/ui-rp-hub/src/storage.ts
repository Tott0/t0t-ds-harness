/**
 * Story-folder reader for the RP Hub Host half.
 *
 * Storage is intentionally dumb: one directory per story, one `story.json` per
 * directory, unknown fields ignored. The reader never writes and never creates
 * the data directory; a missing directory is an empty index, a malformed story
 * is skipped so one bad folder cannot blank the whole panel.
 */
import type { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { RpStorySummary } from './types.ts'

/** The subset of `story.json` the index reads; every other field is ignored. */
interface StoryMeta {
  readonly title?: unknown
  readonly updatedAt?: unknown
}

/**
 * List every readable story folder under `dataDir`, newest first.
 * @param dataDir - absolute directory holding one folder per story.
 * @returns summaries of the folders whose `story.json` parsed; a missing
 *   directory yields an empty list.
 */
export async function listStories(dataDir: string): Promise<readonly RpStorySummary[]> {
  let entries: Dirent[]
  try {
    entries = await readdir(dataDir, { withFileTypes: true })
  } catch (error: unknown) {
    if (isErrorCode(error, 'ENOENT')) return []
    throw error
  }
  const summaries: RpStorySummary[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const summary = await readSummary(dataDir, entry.name)
    if (summary !== undefined) summaries.push(summary)
  }
  return summaries.sort((left, right) =>
    (right.updatedAt ?? '').localeCompare(left.updatedAt ?? '')
    || left.title.localeCompare(right.title))
}

/**
 * Read one folder's `story.json` into a summary.
 * @param dataDir - the stories root.
 * @param id - folder name, used as the story id and as the title fallback.
 * @returns the summary, or undefined when the folder has no readable metadata.
 */
async function readSummary(dataDir: string, id: string): Promise<RpStorySummary | undefined> {
  let raw: string
  try {
    raw = await readFile(join(dataDir, id, 'story.json'), 'utf8')
  } catch {
    return undefined
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const meta = parsed as StoryMeta
  const title = typeof meta.title === 'string' && meta.title.trim() !== '' ? meta.title : id
  const updatedAt = typeof meta.updatedAt === 'string' ? meta.updatedAt : undefined
  return updatedAt === undefined ? { id, title } : { id, title, updatedAt }
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
