/**
 * RP Hub, browser half: the **RP Hub** entry of the sidebar list and the panel
 * it opens in the main column. The panel is root-scoped — it belongs to the
 * profile, not to a Session — and its id is the same key the layout selects.
 *
 * The page owns no story data: it calls the injected catalog calls, which
 * forward to the Host `rpHub` Remote namespace generated from this package's
 * node half. Pinning and the More menu are the sidebar's own behavior.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-rp-hub/remote'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-api-remotes/client'
import type { RpStoryDocument, RpStorySummary, RpTurn } from '../types.ts'
import { RpHubIcon } from './RpHubIcon.tsx'
import { RpHubPage } from './RpHubPage.tsx'
import { en, NS, zh } from './locales.ts'

export { NS } from './locales.ts'
export type { RpHubLocaleKey } from './locales.ts'

/** The id shared by the sidebar row and the main panel it opens. */
export const PANEL_ID = 'rp-hub' as MainPanelId

/** Services required by the registrations and the Remote calls. */
export const inject = ['slots', 'locale', 'layout', 'remote', 'remote.rpHub']

/** Business face the panel body receives from this module. */
export interface RpHubInjected {
  /**
   * Read the story index.
   * @returns the Host admission with every story folder it can list.
   */
  listStories: () => Promise<RemoteResult<readonly RpStorySummary[]>>
  /**
   * Read one story's metadata, system prompt, and turns.
   * @param id - story folder name from the index.
   * @returns the Host admission with the story document.
   */
  readStory: (id: string) => Promise<RemoteResult<RpStoryDocument>>
  /**
   * Append one turn to a story's history.
   * @param id - story folder name.
   * @param role - `user` or `response`.
   * @param text - verbatim turn text.
   * @returns the Host admission with the appended turn.
   */
  appendTurn: (id: string, role: 'user' | 'response', text: string) => Promise<RemoteResult<RpTurn>>
}

/**
 * Contribute the RP Hub entry to the sidebar with the panel it opens.
 * @param ctx - the browser plugin context.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-rp-hub: dictionaries')
  const t = ctx.locale.bind(NS)
  const listStories = (): Promise<RemoteResult<readonly RpStorySummary[]>> => ctx.remote.rpHub.listStories()
  const readStory = (id: string): Promise<RemoteResult<RpStoryDocument>> => ctx.remote.rpHub.readStory(id)
  const appendTurn = (
    id: string,
    role: 'user' | 'response',
    text: string,
  ): Promise<RemoteResult<RpTurn>> => ctx.remote.rpHub.appendTurn(id, role, text)
  ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main',
    key: PANEL_ID,
    locale: NS,
    inject: (): RpHubInjected => ({ listStories, readStory, appendTurn }),
  }, RpHubPage))
  ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist',
    id: PANEL_ID,
    order: 10,
    label: () => t('panel'),
    locale: NS,
  }, RpHubIcon))
}
