/**
 * Story reader: a scrolling turn history above a pinned composer. Turns are
 * plain blocks for now — the formatting overhaul is post-MVP backlog #1.
 *
 * The reader loads through `readStory`, appends the draft through `appendTurn`,
 * and keeps the composer available without scrolling to the end.
 */
import { useEffect, useRef, useState } from 'react'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { RemoteFailure, RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import type { RpStoryDocument, RpTurn } from '../types.ts'
import type { RpHubInjected } from './index.ts'
import {
  card, column, composerBar, pageTitle, readerScroll, readerShell, secondaryText, textButton,
} from './ui.ts'

/** Props the page passes to the reader. */
export type RpStoryViewProps =
  PropsLocale<'rpHub'>
  & Pick<RpHubInjected, 'readStory' | 'appendTurn' | 'generate'>
  & {
    readonly storyId: string
    readonly onBack: () => void
  }

/** Load state of one story document. */
type ReaderState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly story: RpStoryDocument }
  | { readonly status: 'error'; readonly code: string }

/** Render one Remote failure as code plus a clamped provider message. */
function failureText(failure: RemoteFailure): string {
  const message = failure.message.trim()
  if (message === '') return failure.code
  const clamped = message.length > 240 ? `${message.slice(0, 240)}…` : message
  return `${failure.code} — ${clamped}`
}

/**
 * Render one story's history and its pinned composer.
 * @param props - translator, Host calls, story id, and back handler.
 * @returns the reader shell (scrolling history + composer bar).
 */
export function RpStoryView({ t, readStory, appendTurn, generate, storyId, onBack }: RpStoryViewProps) {
  const [state, setState] = useState<ReaderState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [appendError, setAppendError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const scrollToEnd = useRef(false)

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

  // After an append, follow the new turn to the end without moving the view on load.
  useEffect(() => {
    if (!scrollToEnd.current) return
    scrollToEnd.current = false
    const element = scrollRef.current
    if (element !== null) element.scrollTop = element.scrollHeight
  }, [state])

  /**
   * Append the current draft as a user turn; the returned turn is added to the
   * local document so the reader does not have to refetch.
   */
  /**
   * Send the draft: append it as a user turn, then generate and append the
   * Response. The user turn stays if generation fails, so a retry does not
   * duplicate it in the composer.
   */
  const send = (): void => {
    if (sending || draft.trim() === '') return
    setSending(true)
    setAppendError(null)
    const addTurn = (turn: RpTurn): void => {
      setState(current => current.status === 'ready'
        ? { status: 'ready', story: { ...current.story, turns: [...current.story.turns, turn] } }
        : current)
    }
    void appendTurn(storyId, 'user', draft).then(async (appended) => {
      if (!appended.ok) {
        setAppendError(failureText(appended.error))
        return
      }
      scrollToEnd.current = true
      addTurn(appended.value)
      setDraft('')
      const generated = await generate(storyId)
      if (!generated.ok) {
        setAppendError(failureText(generated.error))
        return
      }
      scrollToEnd.current = true
      addTurn(generated.value)
    }).catch(() => { setAppendError('transport') }).finally(() => { setSending(false) })
  }

  return (
    <section style={readerShell}>
      <div ref={scrollRef} style={readerScroll}>
        <div style={column}>
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
        </div>
      </div>

      {state.status === 'ready' && (
        <div style={composerBar}>
          <div style={column}>
            <textarea
              value={draft}
              onChange={(event) => { setDraft(event.target.value) }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  send()
                }
              }}
              placeholder={t('composer.placeholder')}
              aria-label={t('composer.placeholder')}
              rows={2}
              disabled={sending}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 64,
                resize: 'vertical',
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid var(--dsw-alias-border-l1)',
                background: 'var(--dsw-alias-bg-base)',
                color: 'var(--dsw-alias-label-primary)',
                font: 'inherit',
                fontSize: 14,
                lineHeight: '21px',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={send}
                disabled={sending || draft.trim() === ''}
                style={{ ...textButton, opacity: sending || draft.trim() === '' ? 0.5 : 1 }}
              >
                {sending ? t('composer.sending') : t('composer.send')}
              </button>
              {appendError !== null && (
                <span style={{ fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' }}>
                  {t('composer.error')} {appendError}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
