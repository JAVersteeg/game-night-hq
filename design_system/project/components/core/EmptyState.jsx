import React from 'react';

/** Centred title + explanation for a list with nothing in it yet. */
export function EmptyState({ title, body, action, style }) {
  return (
    <div
      style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        padding: 'var(--space-16) var(--screen-gutter)', ...style,
      }}
    >
      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-xl)', lineHeight: 'var(--text-xl-lh)', color: 'var(--ink)' }}>{title}</div>
      {body ? (
        <div style={{ marginTop: 'var(--space-2)', fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-base)', lineHeight: 'var(--text-base-lh)', color: 'var(--ink-muted)', maxWidth: 320, textWrap: 'pretty' }}>{body}</div>
      ) : null}
      {action ? <div style={{ marginTop: 'var(--space-6)', width: '100%', maxWidth: 320 }}>{action}</div> : null}
    </div>
  );
}
