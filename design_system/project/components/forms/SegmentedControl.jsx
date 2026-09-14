import React from 'react';

/** Tab row for switching between views inside a group. Sits under the screen title. */
export function SegmentedControl({ options = [], value, onChange }) {
  return (
    <div style={{display:'flex',gap:'var(--space-1)',background:'var(--surface-sunken)',borderRadius:'var(--radius-lg)',padding:4}}>
      {options.map((o) => {
        const on = o === value;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange && onChange(o)}
            style={{
              flex:1, border:'none', cursor:'pointer',
              background: on ? 'var(--surface)' : 'transparent',
              color: on ? 'var(--ink)' : 'var(--ink-muted)',
              borderRadius:'var(--radius-md)', padding:'9px 8px',
              fontFamily:'var(--font-sans)', fontWeight:'var(--weight-semibold)',
              fontSize:'var(--text-sm)', lineHeight:'var(--text-sm-lh)',
              transition:'opacity var(--duration-fast) var(--ease-standard)',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}
