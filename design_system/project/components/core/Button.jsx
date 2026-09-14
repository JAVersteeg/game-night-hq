import React from 'react';

const CONTAINER = {
  primary: { background: 'var(--accent)', color: 'var(--accent-fg)', border: '1px solid transparent' },
  secondary: { background: 'var(--surface-sunken)', color: 'var(--ink)', border: '1px solid transparent' },
  ghost: { background: 'transparent', color: 'var(--ink)', border: 'var(--border-strong)' },
};

function Spinner() {
  return (
    <span
      style={{
        width: 18, height: 18, borderRadius: 'var(--radius-full)',
        border: '2px solid currentColor', borderTopColor: 'transparent',
        animation: 'gnhq-spin 700ms linear infinite', opacity: 0.7,
      }}
    />
  );
}

/** Full-width action. Mirrors src/components/Button.tsx: rounded-2xl, px-6 py-3.5. */
export function Button({ label, children, variant = 'primary', isLoading = false, disabled = false, onClick, style }) {
  const isDisabled = disabled || isLoading;
  const press = (v) => (e) => { if (!isDisabled) e.currentTarget.style.opacity = v; };
  return (
    <button
      type="button"
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      onMouseDown={press('var(--press-opacity)')}
      onMouseUp={press(1)}
      onMouseLeave={press(1)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', minHeight: 'var(--tap-min)',
        padding: 'var(--control-pad-y) var(--control-pad-x)',
        borderRadius: 'var(--radius-lg)',
        fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)',
        fontSize: 'var(--text-base)', lineHeight: 'var(--text-base-lh)',
        letterSpacing: 'var(--tracking-tight)',
        cursor: isDisabled ? 'default' : 'pointer',
        opacity: isDisabled ? 'var(--disabled-opacity)' : 1,
        transition: 'opacity var(--duration-fast) var(--ease-standard)',
        ...CONTAINER[variant], ...style,
      }}
    >
      {isLoading ? <Spinner /> : (label ?? children)}
    </button>
  );
}
