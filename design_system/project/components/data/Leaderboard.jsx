import React from 'react';

const CELL = {
  fontFamily:'var(--font-sans)', fontWeight:'var(--weight-medium)',
  fontSize:'var(--text-sm)', lineHeight:'var(--text-sm-lh)',
  color:'var(--ink)', fontVariantNumeric:'tabular-nums', textAlign:'right',
  padding:'10px 0', width:52,
};
const HEAD = { ...CELL, color:'var(--ink-subtle)', fontWeight:'var(--weight-semibold)' };

/**
 * Per-game leaderboard. Rows are ordered as given — the caller decides whether
 * highest or lowest total wins.
 */
export function Leaderboard({ rows = [], columns = ['Gespeeld', 'Winst', 'Gem.'], renderAvatar }) {
  return (
    <div style={{border:'var(--border)',borderRadius:'var(--radius-lg)',background:'var(--surface)',overflow:'hidden'}}>
      <div style={{display:'flex',alignItems:'center',gap:'var(--space-3)',padding:'0 var(--space-4)',borderBottom:'var(--border)'}}>
        <div style={{...HEAD,flex:1,minWidth:0,textAlign:'left',width:'auto'}}>Speler</div>
        {columns.map((c) => <div key={c} style={HEAD}>{c}</div>)}
      </div>
      {rows.map((r, i) => (
        <div key={r.name} style={{display:'flex',alignItems:'center',gap:'var(--space-3)',padding:'0 var(--space-4)',borderBottom: i === rows.length - 1 ? 'none' : 'var(--border)',background: r.highlight ? 'var(--surface-muted)' : 'transparent'}}>
          <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:'var(--space-2)',padding:'8px 0'}}>
            <span style={{width:16,fontFamily:'var(--font-sans)',fontWeight:'var(--weight-semibold)',fontSize:'var(--text-sm)',color:'var(--ink-subtle)',fontVariantNumeric:'tabular-nums'}}>{i + 1}</span>
            {renderAvatar ? renderAvatar(r) : null}
            <span style={{fontFamily:'var(--font-sans)',fontWeight:'var(--weight-semibold)',fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</span>
          </div>
          {r.values.map((v, j) => <div key={j} style={CELL}>{v}</div>)}
        </div>
      ))}
    </div>
  );
}
