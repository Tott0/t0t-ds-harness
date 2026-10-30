/**
 * Story index: the panel's landing list over the Host `listStories` call.
 * Rows are buttons; opening one is the page's navigation state, not a route.
 */
import { useEffect, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { RpStorySummary } from '../types.ts'
import type { RpHubInjected } from './index.ts'
import { card, pageTitle, secondaryText, textButton } from './ui.ts'

/** Props the page passes to the index. */
export type RpStoryIndexProps =
  PropsLocale<'rpHub'>
  & Pick<RpHubInjected, 'listStories'>
  & { readonly onOpen: (id: string) => void }

/** Load state of the story index. */
type IndexState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly stories: readonly RpStorySummary[] }
  | { readonly status: 'error'; readonly code: string }

/**
 * Render the story index.
 * @param props - translator, Host catalog call, and the open handler.
 * @returns the index body (header + state).
 */
export function RpStoryIndex({ t, listStories, onOpen }: RpStoryIndexProps) {
  const [state, setState] = useState<IndexState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    const settle = (result: RemoteResult<readonly RpStorySummary[]>): void => {
      if (cancelled) return
      setState(result.ok
        ? { status: 'ready', stories: result.value }
        : { status: 'error', code: result.error.code })
    }
    listStories().then(settle, () => {
      if (!cancelled) setState({ status: 'error', code: 'transport' })
    })
    return () => { cancelled = true }
  }, [listStories, attempt])

  return (
    <>
      <header>
        <h1 style={pageTitle}>{t('page.title')}</h1>
        <p style={secondaryText}>{t('page.subtitle')}</p>
      </header>

      {state.status === 'loading' && (
        <p style={{ ...secondaryText, marginTop: 24 }}>{t('index.loading')}</p>
      )}

      {state.status === 'error' && (
        <div style={{ ...card, marginTop: 24, padding: '20px 20px 16px' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-state-error-primary)' }}>
            {t('index.error')}
          </p>
          <p style={{ margin: '4px 0 12px', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' }}>
            {state.code}
          </p>
          <button type="button" onClick={() => { setAttempt(value => value + 1) }} style={textButton}>
            {t('index.retry')}
          </button>
        </div>
      )}

      {state.status === 'ready' && (state.stories.length === 0
        ? (
            <div style={{ ...card, marginTop: 24, padding: '24px 20px' }}>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 500, lineHeight: '22px' }}>
                {t('index.empty.title')}
              </h2>
              <p style={{ ...secondaryText, marginTop: 6 }}>{t('index.empty.body')}</p>
            </div>
          )
        : (
            <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gap: 8 }}>
              {state.stories.map(story => (
                <li key={story.id}>
                  <button
                    type="button"
                    onClick={() => { onOpen(story.id) }}
                    aria-label={t('index.open', { title: story.title })}
                    style={{
                      ...card,
                      display: 'block',
                      width: '100%',
                      padding: '14px 16px',
                      font: 'inherit',
                      textAlign: 'left',
                      color: 'inherit',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ display: 'block', fontSize: 14, fontWeight: 500, lineHeight: '21px' }}>
                      {story.title}
                    </span>
                    <span style={{ display: 'block', marginTop: 2, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' }}>
                      {story.updatedAt === undefined
                        ? story.id
                        : t('index.updated', { date: story.updatedAt.slice(0, 10) })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
    </>
  )
}
