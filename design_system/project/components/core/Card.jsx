import React from 'react';

const TONES = { plain: 'var(--surface)', muted: 'var(--surface-muted)' };

/**
 * The container every list row, field and panel in the app is made of:
 * rounded-2xl, hairline warm border, no shadow.
 */
export function Card({ children, tone = 'plain', interactive = false, onClick, padding, style }) {
  const press = (v) => (e) => { if (interactive) e.currentTarget.style.opacity = v; };
  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      onMouseDown={press('var(--press-opacity-soft)')}
      onMouseUp={press(1)}
      onMouseLeave={press(1)}
      style={{
        background: TONES[tone],
        border: 'var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: padding ?? 'var(--card-pad-y) var(--card-pad-x)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'opacity var(--duration-fast) var(--ease-standard)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A single row inside a list: title, optional meta line, optional right slot. */
export function ListRow({ title, meta, right, onClick }) {
  return (
    <Card interactive={Boolean(onClick)} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-lg)', lineHeight: 'var(--text-lg-lh)', color: 'var(--ink)' }}>{title}</div>
        {meta ? <div style={{ marginTop: 2, fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', lineHeight: 'var(--text-sm-lh)', color: 'var(--ink-muted)' }}>{meta}</div> : null}
      </div>
      {right}
    </Card>
  );
}
