/**
 * RP Hub, node half: the Host owner of the generated `rpHub` Remote namespace.
 *
 * `listStories` reads the configured data directory — one folder per story,
 * `story.json` per folder. The Host half never assembles prompts or calls a
 * model yet; slices 5–6 add turn append and generation to this same service.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, RemoteError, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { appendStoryTurn, listStories, readStoryDocument } from './storage.ts'
import type { RpStoryDocument, RpStorySummary, RpTurn } from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the generated `rpHub` Remote namespace. */
    rpHubController: RpHubController
  }
}

/** Deployment policy for the RP Hub Host half. */
export interface Config {
  /**
   * Absolute directory holding one folder per story. Deployment-owned: the
   * Web composition sets it (`/bridge/sillytavern/stories` today), so no
   * bridge path is baked into plugin logic.
   */
  readonly dataDir: string
}

/** A story id is one folder segment: no separators, no `.`/`..`. */
const STORY_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u

/** Host service behind the `rpHub` wire namespace. */
export class RpHubController extends TypertRemoteService {
  static Config: z<Config> = z.object({
    dataDir: z.string(),
  })

  private readonly dataDir: string

  /**
   * Register the service under the `rpHub` namespace.
   * @param ctx - Host context; the base class registers the Cordis service.
   * @param config - deployment policy, including the story data directory.
   */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'rpHubController', { namespace: 'rpHub' })
    this.dataDir = config.dataDir
  }

  /**
   * List the stories found under the configured data directory.
   * @returns one summary per readable `stories/<id>/story.json`, newest first.
   */
  @Remote
  async listStories(): Promise<readonly RpStorySummary[]> {
    return listStories(this.dataDir)
  }

  /**
   * Read one story: metadata, the static system prompt, and its turns.
   * @param id - story folder name under the data directory.
   * @returns the story document.
   */
  @Remote
  async readStory(id: string): Promise<RpStoryDocument> {
    if (!STORY_ID.test(id)) {
      throw new RemoteError('gateway/bad-request', `invalid story id: ${JSON.stringify(id)}`, {})
    }
    const story = await readStoryDocument(this.dataDir, id)
    if (story === undefined) {
      throw new RemoteError('rpHub/story-not-found', `story "${id}" has no readable story.json`, { storyId: id })
    }
    return story
  }

  /**
   * Append one turn to a story's history and stamp the story's `updatedAt`.
   * @param id - story folder name under the data directory.
   * @param role - `user` or `response`.
   * @param text - verbatim turn text; must not be blank.
   * @returns the appended turn, id and timestamp included.
   */
  @Remote
  async appendTurn(id: string, role: string, text: string): Promise<RpTurn> {
    if (!STORY_ID.test(id)) {
      throw new RemoteError('gateway/bad-request', `invalid story id: ${JSON.stringify(id)}`, {})
    }
    if (role !== 'user' && role !== 'response') {
      throw new RemoteError('gateway/bad-request', `invalid turn role: ${JSON.stringify(role)}`, {})
    }
    if (text.trim() === '') {
      throw new RemoteError('gateway/bad-request', 'turn text must not be blank', {})
    }
    const turn = await appendStoryTurn(this.dataDir, id, role, text)
    if (turn === undefined) {
      throw new RemoteError('rpHub/story-not-found', `story "${id}" has no readable story.json`, { storyId: id })
    }
    return turn
  }
}

export default RpHubController
