/**
 * RP Hub, node half: the Host owner of the generated `rpHub` Remote namespace.
 *
 * `listStories` reads the configured data directory — one folder per story,
 * `story.json` per folder. The Host half never assembles prompts or calls a
 * model yet; slices 5–6 add turn append and generation to this same service.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import { listStories } from './storage.ts'
import type { RpStorySummary } from './types.ts'

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
}

export default RpHubController
