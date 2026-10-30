/** Shared inline-style tokens for the RP Hub panel; theme variables only. */
import type { CSSProperties } from 'react'

/** Page shell: full-height scroll area clearing the frame's top strip. */
export const pageShell: CSSProperties = {
  height: '100%',
  overflowY: 'auto',
  boxSizing: 'border-box',
  paddingTop: 'calc(var(--dsh-frame-top-clearance, 0px) + 24px)',
  paddingInline: 24,
  paddingBottom: 32,
  background: 'var(--dsw-alias-bg-base)',
  color: 'var(--dsw-alias-label-primary)',
}

/** Reader shell: fixed-height column holding a scrolling history and a pinned composer. */
export const readerShell: CSSProperties = {
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  boxSizing: 'border-box',
  background: 'var(--dsw-alias-bg-base)',
  color: 'var(--dsw-alias-label-primary)',
}

/** Scrolling history region above the composer. */
export const readerScroll: CSSProperties = {
  flex: '1 1 auto',
  minHeight: 0,
  overflowY: 'auto',
  paddingTop: 'calc(var(--dsh-frame-top-clearance, 0px) + 24px)',
  paddingInline: 24,
  paddingBottom: 24,
}

/** Pinned composer bar. */
export const composerBar: CSSProperties = {
  flex: '0 0 auto',
  paddingBlock: 12,
  paddingInline: 24,
  borderTop: '1px solid var(--dsw-alias-border-l1)',
  background: 'var(--dsw-alias-bg-layer-1)',
}

/** Centered reading column. */
export const column: CSSProperties = { maxWidth: 720, margin: '0 auto' }

/** Page heading. */
export const pageTitle: CSSProperties = { margin: 0, fontSize: 20, fontWeight: 500, lineHeight: '28px' }

/** Secondary explanatory text. */
export const secondaryText: CSSProperties = {
  margin: '4px 0 0',
  fontSize: 13,
  lineHeight: '20px',
  color: 'var(--dsw-alias-label-secondary)',
}

/** Raised card surface. */
export const card: CSSProperties = {
  border: '1px solid var(--dsw-alias-border-l1)',
  borderRadius: 12,
  background: 'var(--dsw-alias-bg-layer-1)',
}

/** Quiet text button (back link, retry). */
export const textButton: CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  padding: '5px 12px',
  borderRadius: 8,
  border: '1px solid var(--dsw-alias-border-l2)',
  background: 'var(--dsw-alias-bg-layer-2)',
  color: 'var(--dsw-alias-label-primary)',
  cursor: 'pointer',
}
