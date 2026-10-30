/**
 * Story reader: one story's turns, plain blocks, over the Host `readStory`
 * call, plus the composer that appends a user turn through `appendTurn`.
 *
 * Rendering is deliberately plain (slice 5): a turn-format overhaul is a
 * post-MVP item. The composer appends only; generation joins in slice 6.
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
  & Pick<RpHubInjected, 'readStory' | 'appendTurn'>
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
 * Render one story's history and its composer.
 * @param props - translator, Host calls, story id, and back handler.
 * @returns the reader body (header, turn blocks, composer).
 */
export function RpStoryView({ t, readStory, appendTurn, storyId, onBack }: RpStoryViewProps) {
  const [state, setState] = useState<ReaderState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [appendError, setAppendError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setState({ status: 'loading' })
    setAppendError(null)
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

  /**
   * Append the current draft as a user turn; the returned turn is added to the
   * local document so the reader does not have to refetch.
   */
  const append = (): void => {
    if (sending || draft.trim() === '') return
    setSending(true)
    setAppendError(null)
    appendTurn(storyId, 'user', draft).then((result) => {
      if (!result.ok) {
        setAppendError(result.error.code)
        return
      }
      const turn = result.value
      setState(current => current.status === 'ready'
        ? { status: 'ready', story: { ...current.story, turns: [...current.story.turns, turn] } }
        : current)
      setDraft('')
    }, () => { setAppendError('transport') }).finally(() => { setSending(false) })
  }

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

          <div style={{ marginTop: 24 }}>
            <textarea
              value={draft}
              onChange={(event) => { setDraft(event.target.value) }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  append()
                }
              }}
              placeholder={t('composer.placeholder')}
              aria-label={t('composer.placeholder')}
              rows={3}
              disabled={sending}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 84,
                resize: 'vertical',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--dsw-alias-border-l1)',
                background: 'var(--dsw-alias-bg-layer-1)',
                color: 'var(--dsw-alias-label-primary)',
                font: 'inherit',
                fontSize: 14,
                lineHeight: '21px',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={append}
                disabled={sending || draft.trim() === ''}
                style={{ ...textButton, opacity: sending || draft.trim() === '' ? 0.5 : 1 }}
              >
                {sending ? t('composer.sending') : t('composer.add')}
              </button>
              {appendError !== null && (
                <span style={{ fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' }}>
                  {t('composer.error')} {appendError}
                </span>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
