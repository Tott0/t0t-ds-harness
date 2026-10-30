/**
 * RP Hub, node half: the Host owner of the generated `rpHub` Remote namespace.
 *
 * `listStories` and `readStory` read the configured data directory — one folder
 * per story, `story.json` per folder. `appendTurn` appends a line to
 * `turns.jsonl`; `generate` builds the prompt itself (static `system.md` plus
 * the turn history) and calls `ctx.llm` directly, deliberately bypassing the
 * agent-loop/session prompt assembly.
 */
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-agent-default-model'
import type { GenerateOptions, Message } from '@deepseek-ai/dsh-llm'
import { MessageId } from '@deepseek-ai/dsh-llm'
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
  /** Optional roleplay-only provider route; absent follows the profile default. */
  readonly provider?: string
  /** Optional roleplay-only model; absent follows the story's model, then the profile default. */
  readonly model?: string
}

/** A story id is one folder segment: no separators, no `.`/`..`. */
const STORY_ID = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u

/** Host service behind the `rpHub` wire namespace. */
export class RpHubController extends TypertRemoteService {
  static Config: z<Config> = z.object({
    dataDir: z.string(),
    provider: z.string().required(false),
    model: z.string().required(false),
  })

  /** Model-call seam and the profile's configured default route. */
  static inject = ['llm', 'agentDefaultModel']

  private readonly dataDir: string
  private readonly provider: string | undefined
  private readonly model: string | undefined

  /**
   * Register the service under the `rpHub` namespace.
   * @param ctx - Host context; the base class registers the Cordis service.
   * @param config - deployment policy, including the story data directory.
   */
  constructor(ctx: Context, config: Config) {
    super(ctx, 'rpHubController', { namespace: 'rpHub' })
    this.dataDir = config.dataDir
    this.provider = config.provider
    this.model = config.model
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

  /**
   * Generate the next Response from the story's static prompt and history, and
   * append it. Buffered: the whole reply is collected before it is written.
   * @param id - story folder name under the data directory.
   * @returns the appended Response turn.
   */
  @Remote
  async generate(id: string): Promise<RpTurn> {
    if (!STORY_ID.test(id)) {
      throw new RemoteError('gateway/bad-request', `invalid story id: ${JSON.stringify(id)}`, {})
    }
    const story = await readStoryDocument(this.dataDir, id)
    if (story === undefined) {
      throw new RemoteError('rpHub/story-not-found', `story "${id}" has no readable story.json`, { storyId: id })
    }
    const target = this.targetFor(story.meta.model)
    let text: string
    try {
      text = await this.complete(story, target)
    } catch (error: unknown) {
      throw new RemoteError('rpHub/generation-failed', error instanceof Error ? error.message : String(error), {
        storyId: id,
        reason: 'model-call',
      })
    }
    if (text === '') {
      throw new RemoteError('rpHub/generation-failed', 'the model returned no text', {
        storyId: id,
        reason: 'empty',
      })
    }
    const turn = await appendStoryTurn(this.dataDir, id, 'response', text)
    if (turn === undefined) {
      throw new RemoteError('rpHub/story-not-found', `story "${id}" has no readable story.json`, { storyId: id })
    }
    return turn
  }

  /**
   * Resolve the provider/model route for one story.
   * @param storyModel - per-story model override, absent when the story follows the default.
   * @returns the configured provider and the story-or-default model.
   */
  private targetFor(storyModel: string | undefined): { provider: string; model: string } {
    const selection = this.ctx.agentDefaultModel.currentSelection()
    return {
      provider: this.provider ?? selection.provider,
      model: storyModel ?? this.model ?? selection.model,
    }
  }

  /**
   * Run one buffered model call and return its visible text.
   * @param story - the story whose prompt and history to send.
   * @param target - resolved provider/model route.
   * @returns the concatenated text of every text block.
   */
  private async complete(
    story: RpStoryDocument,
    target: { provider: string; model: string },
  ): Promise<string> {
    const prompt = this.promptOf(story, target)
    const options: GenerateOptions = {
      provider: target.provider,
      model: target.model,
      system: prompt.system,
      messages: prompt.messages,
    }
    let text = ''
    let failure: { readonly message: string; readonly code: string; readonly status?: number } | undefined
    for await (const chunk of this.ctx.llm.stream(options)) {
      if (chunk.type === 'text-delta') text += chunk.text
      else if (chunk.type === 'finish' && (chunk.reason.kind === 'error' || chunk.reason.kind === 'aborted')) {
        failure = chunk.reason.failure
      }
    }
    if (failure !== undefined) {
      throw new Error(
        `model call failed (${failure.code}${failure.status === undefined ? '' : ` ${failure.status}`}): ${failure.message}`,
      )
    }
    return text.trim()
  }

  /**
   * Build the request from the story: the static system prompt (plus the
   * opening narration, which is scenario setup rather than chat history) and
   * the then-alternating turn messages.
   *
   * Leading Responses are folded into the system prompt on purpose: a history
   * that starts with an assistant message is rejected by some OpenAI-compatible
   * routes, and the opening belongs with the setting anyway.
   * @param story - the story document.
   * @param target - resolved provider/model route.
   * @returns the system text and ordered provider messages.
   */
  private promptOf(
    story: RpStoryDocument,
    target: { provider: string; model: string },
  ): { system: string; messages: Message[] } {
    let first = 0
    const opening: string[] = []
    while (story.turns[first]?.role === 'response') {
      opening.push(story.turns[first]!.text)
      first++
    }
    const messages: Message[] = story.turns.slice(first).map(turn => turn.role === 'user'
      ? {
          role: 'user',
          id: MessageId(`rp-${story.meta.id}-${turn.id}`),
          source: { kind: 'user' },
          content: [{ type: 'text', text: turn.text }],
        }
      : {
          role: 'assistant',
          id: MessageId(`rp-${story.meta.id}-${turn.id}`),
          source: { kind: 'model', provider: target.provider, model: target.model },
          content: [{ type: 'text', text: turn.text }],
        })
    if (messages.length === 0) {
      messages.push({
        role: 'user',
        id: MessageId(`rp-${story.meta.id}-continue`),
        source: { kind: 'user' },
        content: [{ type: 'text', text: 'Continue the story from the opening.' }],
      })
    }
    const system = opening.length === 0
      ? story.system
      : `${story.system.trimEnd()}\n\n## Opening\n${opening.join('\n\n')}`
    return { system, messages }
  }
}

export default RpHubController
