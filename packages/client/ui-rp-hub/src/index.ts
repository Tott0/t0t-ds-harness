/**
 * RP Hub, node half: the Host owner of the generated `rpHub` Remote namespace.
 *
 * Slice 2 is the data-channel proof: one unary method returning a fixed list,
 * rendered by the panel. Real story folders replace the sample rows in slice 3
 * (`listStories` reads the configured data directory); the storage format and
 * the method surface stay the same, so the client does not change.
 */
import type { Context } from '@deepseek-ai/cordis'
import { Remote, TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol'
import type { RpStorySummary } from './types.ts'

export type * from './types.ts'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host owner of the generated `rpHub` Remote namespace. */
    rpHubController: RpHubController
  }
}

/**
 * Temporary rows for the channel proof. Deliberately not read from disk: a
 * failure here can only be the client↔Host wiring, never filesystem access.
 * Slice 3 deletes this constant.
 */
const SAMPLE_STORIES: readonly RpStorySummary[] = [
  { id: 'high-school-simulator', title: 'High School Simulator', updatedAt: '2026-10-29T00:00:00.000Z' },
  { id: 'the-quiet-library', title: 'The Quiet Library', updatedAt: '2026-10-28T00:00:00.000Z' },
]

/** Host service behind the `rpHub` wire namespace. */
export class RpHubController extends TypertRemoteService {
  /**
   * Register the service under the `rpHub` namespace.
   * @param ctx - Host context; the base class registers the Cordis service.
   */
  constructor(ctx: Context) {
    super(ctx, 'rpHubController', { namespace: 'rpHub' })
  }

  /**
   * List the stories the RP Hub panel shows.
   * @returns the sample rows until story storage lands.
   */
  @Remote
  async listStories(): Promise<readonly RpStorySummary[]> {
    return SAMPLE_STORIES
  }
}

export default RpHubController
