import React from 'react';

/** Small uppercase label above a section, as on the profile screen. */
export function SectionLabel({ children, style }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)',
        fontSize: 'var(--text-sm)', lineHeight: 'var(--text-sm-lh)',
        color: 'var(--ink-subtle)', textTransform: 'uppercase',
        letterSpacing: 'var(--tracking-wide)', ...style,
      }}
    >
      {children}
    </div>
  );
}
