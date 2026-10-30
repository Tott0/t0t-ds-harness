/**
 * Wire types of the generated `rpHub` Remote namespace. Client-safe: no Host
 * imports, so the browser declaration reads the same shapes the Host returns.
 * @module @deepseek-ai/dsh-client-ui-rp-hub/types
 */

/** One story as the RP Hub index lists it. */
export interface RpStorySummary {
  /** Folder name under the data directory; the story's stable id. */
  readonly id: string
  /** Display title, read from the story's `story.json`. */
  readonly title: string
  /** ISO-8601 time this story last changed; absent when it never recorded one. */
  readonly updatedAt?: string
}

/** One turn of a story's history. */
export interface RpTurn {
  /** Stable turn id from `turns.jsonl` (`t_0001`). */
  readonly id: string
  /** Canon role: the user's Turn, or the machine's Response. */
  readonly role: 'user' | 'response'
  /** Verbatim turn text. */
  readonly text: string
  /** ISO-8601 time the turn was recorded; absent in hand-written files. */
  readonly ts?: string
}

/**
 * The subset of `story.json` the hub reads. Every other field is ignored, and
 * an absent one is omitted here rather than invented.
 */
export interface RpStoryMeta {
  /** Story id: the folder name, authoritative over a stale `story.json` copy. */
  readonly id: string
  /** Display title; falls back to the id when `story.json` has none. */
  readonly title: string
  /** Schema generation of the story folder. */
  readonly schemaVersion?: number
  /** ISO-8601 creation time. */
  readonly createdAt?: string
  /** ISO-8601 last-change time. */
  readonly updatedAt?: string
  /** Interaction mode authored for the story (`novelist`, `pov`, `cyoa`). */
  readonly interactionMode?: string
  /** Optional per-story model override; absent means the configured default. */
  readonly model?: string
}

/** Everything the story reader shows for one folder. */
export interface RpStoryDocument {
  /** Normalized metadata from `story.json`. */
  readonly meta: RpStoryMeta
  /** The static system prompt, verbatim; empty when `system.md` is absent. */
  readonly system: string
  /** Turns in file order. */
  readonly turns: readonly RpTurn[]
}

declare module '@deepseek-ai/dsh-typert-protocol' {
  interface RemoteErrorDetailsMap {
    /** The requested folder has no readable `story.json`. */
    'rpHub/story-not-found': { readonly storyId: string }
  }
}
