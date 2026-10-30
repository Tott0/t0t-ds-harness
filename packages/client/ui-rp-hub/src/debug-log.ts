/**
 * Temporary RP Hub trace log (remove before shipping).
 *
 * Writes under the OS temp directory so a failed generation can be diagnosed
 * from inside the container without changing the UI. Every write is
 * best-effort: tracing must never fail a request or mask its real error.
 *
 * Layout (`<tmp>/rp-hub/`):
 * - `attempts.jsonl` — one summary line per attempt.
 * - `last-request.json` — the exact system text and messages of the last attempt.
 * - `last-response.md` — the last successful reply.
 * - `last-error.txt` — the last failure's code/status/message.
 */
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** Directory holding the temporary trace files. */
export const TRACE_DIR = join(tmpdir(), 'rp-hub')

/** One requested message in the trace dump. */
export interface TracedMessage {
  readonly role: string
  readonly text: string
}

/** The exact model request of one attempt. */
export interface TracedRequest {
  readonly at: string
  readonly storyId: string
  readonly provider: string
  readonly model: string
  readonly system: string
  readonly messages: readonly TracedMessage[]
}

/** Outcome summary of one attempt. */
export interface TracedOutcome {
  readonly at: string
  readonly storyId: string
  readonly provider: string
  readonly model: string
  readonly systemChars: number
  readonly messageCount: number
  readonly outcome: 'ok' | 'empty' | 'error'
  readonly textChars?: number
  readonly error?: { readonly code: string; readonly status?: number; readonly message: string }
}

/** Ensure the trace directory exists. */
async function ensureTraceDir(): Promise<void> {
  await mkdir(TRACE_DIR, { recursive: true })
}

/** Overwrite one file in the trace directory. */
async function writeTrace(name: string, text: string): Promise<void> {
  try {
    await ensureTraceDir()
    await writeFile(join(TRACE_DIR, name), text, 'utf8')
  } catch {
    // Tracing is diagnostic only.
  }
}

/**
 * Record the request about to be sent.
 * @param request - exact system text and messages.
 */
export async function traceRequest(request: TracedRequest): Promise<void> {
  await writeTrace('last-request.json', `${JSON.stringify(request, null, 2)}\n`)
}

/**
 * Append one attempt summary.
 * @param outcome - summary of the attempt.
 */
export async function traceOutcome(outcome: TracedOutcome): Promise<void> {
  try {
    await ensureTraceDir()
    await appendFile(join(TRACE_DIR, 'attempts.jsonl'), `${JSON.stringify(outcome)}\n`, 'utf8')
  } catch {
    // Tracing is diagnostic only.
  }
}

/**
 * Record a successful reply.
 * @param text - the reply that was appended.
 */
export async function traceResponse(text: string): Promise<void> {
  await writeTrace('last-response.md', text)
}

/**
 * Record a failure with the full provider message.
 * @param detail - failure detail text.
 */
export async function traceError(detail: string): Promise<void> {
  await writeTrace('last-error.txt', detail)
}
