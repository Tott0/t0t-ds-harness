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
