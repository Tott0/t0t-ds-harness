/**
 * RP Hub panel shell: the page owns the tiny navigation state (index ↔ one
 * story) and the scroll/padding frame; the index and the reader own their own
 * load states over the injected Host calls.
 */
import { useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { RpHubInjected } from './index.ts'
import { RpStoryIndex } from './RpStoryIndex.tsx'
import { RpStoryView } from './RpStoryView.tsx'
import { column, pageShell } from './ui.ts'

/** Props assembled by the main slot renderer for this page. */
export type RpHubPageProps =
  PropsRuntime<'main'>
  & PropsLocale<'rpHub'>
  & InjectFace<RpHubInjected>

/**
 * Render the RP Hub panel.
 * @param props - the panel's runtime share and the injected Host calls.
 * @returns the index or the open story.
 */
export function RpHubPage({ t, listStories, readStory }: RpHubPageProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  return (
    <section style={pageShell}>
      <div style={column}>
        {openId === null
          ? <RpStoryIndex t={t} listStories={listStories} onOpen={setOpenId} />
          : (
              <RpStoryView
                t={t}
                readStory={readStory}
                storyId={openId}
                onBack={() => { setOpenId(null) }}
              />
            )}
      </div>
    </section>
  )
}
