import React from 'react';

const TONES = {
  neutral: { background: 'var(--surface-sunken)', color: 'var(--ink-muted)' },
  accent: { background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)' },
  success: { background: 'var(--success-soft)', color: 'var(--success-soft-fg)' },
  warning: { background: 'var(--warning-soft)', color: 'var(--warning-soft-fg)' },
  danger: { background: 'var(--danger-soft)', color: 'var(--danger-soft-fg)' },
};

/** Small status pill: live session, finished session, winner, scorekeeper. */
export function Badge({ children, tone = 'neutral', style }) {
  return (
    <span style={{
      display:'inline-flex',alignItems:'center',gap:6,borderRadius:'var(--radius-full)',
      padding:'4px 10px',fontFamily:'var(--font-sans)',fontWeight:'var(--weight-semibold)',
      fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',whiteSpace:'nowrap',
      ...TONES[tone], ...style,
    }}>
      {children}
    </span>
  );
}
