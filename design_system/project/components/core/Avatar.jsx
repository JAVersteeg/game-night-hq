import React from 'react';

/** Up to two initials from a display name; '?' rather than an empty circle. */
export function initialsFrom(displayName = '') {
  const words = String(displayName).trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
}

/** Circular identity badge. One `size` number drives diameter and font size. */
export function Avatar({ displayName = '', size = 40, avatarUrl = null, style }) {
  const box = { width: size, height: size, borderRadius: 'var(--radius-full)', flex: '0 0 auto' };
  if (avatarUrl) return <img src={avatarUrl} alt="" style={{ ...box, objectFit: 'cover', ...style }} />;
  return (
    <span
      style={{
        ...box, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent-soft)', color: 'var(--accent-soft-fg)',
        fontFamily: 'var(--font-sans)', fontWeight: 'var(--weight-semibold)',
        fontSize: size * 0.4, lineHeight: 1, ...style,
      }}
    >
      {initialsFrom(displayName)}
    </span>
  );
}
