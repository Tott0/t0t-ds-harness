/**
 * Story reader: one story's turns, plain blocks, over the Host `readStory`
 * call. No typography ambitions yet — the reader exists so experiment output
 * can be read in-app.
 */
import { useEffect, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { RpStoryDocument } from '../types.ts'
import type { RpHubInjected } from './index.ts'
import { card, pageTitle, secondaryText, textButton } from './ui.ts'

/** Props the page passes to the reader. */
export type RpStoryViewProps =
  PropsLocale<'rpHub'>
  & Pick<RpHubInjected, 'readStory'>
  & {
    readonly storyId: string
    readonly onBack: () => void
  }

/** Load state of one story document. */
type ReaderState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly story: RpStoryDocument }
  | { readonly status: 'error'; readonly code: string }

/**
 * Render one story's history.
 * @param props - translator, Host read call, story id, and back handler.
 * @returns the reader body (header + turn blocks).
 */
export function RpStoryView({ t, readStory, storyId, onBack }: RpStoryViewProps) {
  const [state, setState] = useState<ReaderState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    const settle = (result: RemoteResult<RpStoryDocument>): void => {
      if (cancelled) return
      setState(result.ok
        ? { status: 'ready', story: result.value }
        : { status: 'error', code: result.error.code })
    }
    readStory(storyId).then(settle, () => {
      if (!cancelled) setState({ status: 'error', code: 'transport' })
    })
    return () => { cancelled = true }
  }, [readStory, storyId, attempt])

  return (
    <>
      <button type="button" onClick={onBack} style={{ ...textButton, marginBottom: 12 }}>
        ← {t('reader.back')}
      </button>

      {state.status === 'loading' && (
        <p style={secondaryText}>{t('reader.loading')}</p>
      )}

      {state.status === 'error' && (
        <div style={{ ...card, padding: '20px 20px 16px' }}>
          <p style={{ margin: 0, fontSize: 13, lineHeight: '20px', color: 'var(--dsw-alias-state-error-primary)' }}>
            {t('reader.error')}
          </p>
          <p style={{ margin: '4px 0 12px', fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' }}>
            {state.code}
          </p>
          <button type="button" onClick={() => { setAttempt(value => value + 1) }} style={textButton}>
            {t('index.retry')}
          </button>
        </div>
      )}

      {state.status === 'ready' && (
        <>
          <header>
            <h1 style={pageTitle}>{state.story.meta.title}</h1>
            <p style={secondaryText}>
              {state.story.meta.updatedAt === undefined
                ? state.story.meta.id
                : t('index.updated', { date: state.story.meta.updatedAt.slice(0, 10) })}
              {' · '}
              {t('reader.turnCount', { count: state.story.turns.length })}
            </p>
          </header>

          {state.story.turns.length === 0
            ? <p style={{ ...secondaryText, marginTop: 24 }}>{t('reader.empty')}</p>
            : (
                <div style={{ display: 'grid', gap: 8, marginTop: 24 }}>
                  {state.story.turns.map(turn => (
                    <article key={turn.id} style={{ ...card, padding: '14px 16px' }}>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                          color: turn.role === 'user'
                            ? 'var(--dsw-alias-brand-primary)'
                            : 'var(--dsw-alias-label-secondary)',
                        }}
                      >
                        {turn.role === 'user' ? t('reader.user') : t('reader.response')}
                      </div>
                      <p
                        style={{
                          margin: '6px 0 0',
                          fontSize: 14,
                          lineHeight: '22px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {turn.text}
                      </p>
                    </article>
                  ))}
                </div>
              )}
        </>
      )}
    </>
  )
}
