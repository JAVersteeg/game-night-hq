import React from 'react';

/**
 * Final totals for one session, as horizontal bars in leaderboard order.
 * Used on the result screen and in history detail.
 */
export function ScoreBars({ rows = [], winnerTone = 'var(--success)' }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.total)));
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'var(--space-3)'}}>
      {rows.map((r, i) => (
        <div key={r.name}>
          <div style={{display:'flex',alignItems:'baseline',justifyContent:'space-between',gap:'var(--space-3)'}}>
            <span style={{fontFamily:'var(--font-sans)',fontWeight:'var(--weight-semibold)',fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.name}</span>
            <span style={{fontFamily:'var(--font-sans)',fontWeight:'var(--weight-bold)',fontSize:'var(--text-lg)',lineHeight:'var(--text-lg-lh)',color:'var(--ink)',fontVariantNumeric:'tabular-nums'}}>{r.total}</span>
          </div>
          <div style={{height:8,marginTop:6,borderRadius:'var(--radius-full)',background:'var(--surface-sunken)',overflow:'hidden'}}>
            <div style={{width:(Math.abs(r.total) / max) * 100 + '%',height:'100%',background: i === 0 ? winnerTone : 'var(--clay-700)'}} />
          </div>
        </div>
      ))}
    </div>
  );
}
