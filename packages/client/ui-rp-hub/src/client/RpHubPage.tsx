/**
 * RP Hub landing page — slice 2: the story index over the `rpHub` Remote.
 *
 * The page owns only presentation and the load/retry state machine; the
 * injected `listStories` is the Host call. Slice 4 turns each row into the
 * story reader; slice 3 replaces the sample rows with real folders.
 */
import { useEffect, useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { RpStorySummary } from '../types.ts'
import type { RpHubInjected } from './index.ts'

/** Props assembled by the main slot renderer for this page. */
export type RpHubPageProps =
  PropsRuntime<'main'>
  & PropsLocale<'rpHub'>
  & InjectFace<RpHubInjected>

/** Load state of the story index. */
type IndexState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly stories: readonly RpStorySummary[] }
  | { readonly status: 'error'; readonly code: string }

const cardStyle = {
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 12,
  background: 'var(--dsw-alias-bg-layer-1)',
} as const

/**
 * Render the story index.
 * @param props - the panel's runtime share and the injected Host call.
 * @returns the index page.
 */
export function RpHubPage({ t, listStories }: RpHubPageProps) {
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
    <section
      style={{
        height: '100%',
        overflowY: 'auto',
        boxSizing: 'border-box',
        paddingTop: 'calc(var(--dsh-frame-top-clearance, 0px) + 24px)',
        paddingInline: 24,
        paddingBottom: 32,
        background: 'var(--dsw-alias-bg-base)',
        color: 'var(--dsw-alias-label-primary)',
      }}
    >
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <header>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 500, lineHeight: '28px' }}>
            {t('page.title')}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' }}>
            {t('page.subtitle')}
          </p>
        </header>

        {state.status === 'loading' && (
          <p style={{ margin: '24px 0 0', fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' }}>
            {t('index.loading')}
          </p>
        )}

        {state.status === 'error' && (
          <div style={{ ...cardStyle, marginTop: 24, padding: '20px 20px 16px' }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-state-error-primary)' }}>
              {t('index.error')}
            </p>
            <p style={{ margin: '4px 0 12px', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' }}>
              {state.code}
            </p>
            <button
              type="button"
              onClick={() => { setAttempt(value => value + 1) }}
              style={{
                font: 'inherit',
                fontSize: 13,
                padding: '5px 12px',
                borderRadius: 8,
                border: '1px solid var(--dsw-alias-border-l2)',
                background: 'var(--dsw-alias-bg-layer-2)',
                color: 'var(--dsw-alias-label-primary)',
                cursor: 'pointer',
              }}
            >
              {t('index.retry')}
            </button>
          </div>
        )}

        {state.status === 'ready' && (state.stories.length === 0
          ? (
              <div style={{ ...cardStyle, marginTop: 24, padding: '24px 20px' }}>
                <h2 style={{ margin: 0, fontSize: 15, fontWeight: 500, lineHeight: '22px' }}>
                  {t('index.empty.title')}
                </h2>
                <p style={{ margin: '6px 0 0', fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' }}>
                  {t('index.empty.body')}
                </p>
              </div>
            )
          : (
              <ul style={{ listStyle: 'none', margin: '24px 0 0', padding: 0, display: 'grid', gap: 8 }}>
                {state.stories.map(story => (
                  <li key={story.id} style={{ ...cardStyle, padding: '14px 16px' }}>
                    <div style={{ fontSize: 14, fontWeight: 500, lineHeight: '21px' }}>{story.title}</div>
                    <div style={{ marginTop: 2, fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' }}>
                      {story.updatedAt === undefined
                        ? story.id
                        : t('index.updated', { date: story.updatedAt.slice(0, 10) })}
                    </div>
                  </li>
                ))}
              </ul>
            ))}

      </div>
    </section>
  )
}
