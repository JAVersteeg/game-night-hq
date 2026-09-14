import React from 'react';

function Mark({ mode, on }) {
  const round = mode === 'radio';
  return (
    <span style={{
      width:22,height:22,flex:'0 0 auto',borderRadius: round ? 'var(--radius-full)' : 6,
      border: on ? '6px solid var(--accent)' : 'var(--border-strong)',
      background: on && !round ? 'var(--accent)' : 'var(--surface)',
      display:'flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box',
      color:'var(--accent-fg)',fontSize:13,fontWeight:700,lineHeight:1,
    }}>
      {on && !round ? '\u2713' : null}
    </span>
  );
}

/**
 * A selectable row inside a card group: scoring direction (radio), or who is playing
 * tonight (check). The whole row is the target, not just the mark.
 */
export function ChoiceRow({ title, meta, left, mode = 'radio', selected = false, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        width:'100%',display:'flex',alignItems:'center',gap:'var(--space-3)',textAlign:'left',
        background: selected ? 'var(--accent-soft)' : 'var(--surface)',
        border: selected ? '1px solid var(--accent-line)' : 'var(--border)',
        borderRadius:'var(--radius-lg)', padding:'12px var(--space-4)', cursor:'pointer',
        minHeight:'var(--tap-min)', fontFamily:'var(--font-sans)',
      }}
    >
      {left}
      <span style={{minWidth:0,flex:1}}>
        <span style={{display:'block',fontWeight:'var(--weight-semibold)',fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink)'}}>{title}</span>
        {meta ? <span style={{display:'block',fontWeight:'var(--weight-medium)',fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-muted)'}}>{meta}</span> : null}
      </span>
      <Mark mode={mode} on={selected} />
    </button>
  );
}
