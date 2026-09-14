import React from 'react';

/** The onboarding/name input: rounded-2xl, hairline border, 18px value text. */
export function TextField({ value, onChange, placeholder, label, error, maxLength, id, style }) {
  const idle = error ? '1px solid var(--danger-line)' : 'var(--border)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', ...style }}>
      {label ? (
        <label htmlFor={id} style={{ fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)', fontSize: 'var(--text-sm)', lineHeight: 'var(--text-sm-lh)', color: 'var(--ink-muted)' }}>{label}</label>
      ) : null}
      <input
        id={id}
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange && onChange(e.target.value)}
        onFocus={(e) => { e.currentTarget.style.border = '1px solid var(--accent)'; }}
        onBlur={(e) => { e.currentTarget.style.border = idle; }}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: '14px var(--space-4)',
          borderRadius: 'var(--radius-lg)',
          border: idle,
          background: 'var(--surface)', color: 'var(--ink)',
          fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-medium)',
          fontSize: 'var(--text-lg)', lineHeight: 'var(--text-lg-lh)', outline: 'none',
        }}
      />
      {error ? <div style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 'var(--text-sm-lh)', color: 'var(--danger)' }}>{error}</div> : null}
    </div>
  );
}
