import React from 'react';

/**
 * Head-to-head record between two players: one horizontal bar split by wins,
 * plus the raw counts. Draws are shown as a neutral middle segment.
 */
export function HeadToHead({ left, right, leftWins = 0, rightWins = 0, draws = 0 }) {
  const total = Math.max(1, leftWins + rightWins + draws);
  const pct = (n) => (n / total) * 100;
  const num = { fontFamily:'var(--font-sans)', fontWeight:'var(--weight-bold)', fontSize:'var(--text-2xl)', lineHeight:'var(--text-2xl-lh)', letterSpacing:'var(--tracking-tight)', fontVariantNumeric:'tabular-nums', color:'var(--ink)' };
  const name = { fontFamily:'var(--font-sans)', fontWeight:'var(--weight-medium)', fontSize:'var(--text-sm)', lineHeight:'var(--text-sm-lh)', color:'var(--ink-muted)' };

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',gap:'var(--space-3)'}}>
        <div><div style={num}>{leftWins}</div><div style={name}>{left}</div></div>
        <div style={{textAlign:'center',...name}}>{draws > 0 ? draws + ' gelijk' : 'onderling'}</div>
        <div style={{textAlign:'right'}}><div style={num}>{rightWins}</div><div style={name}>{right}</div></div>
      </div>
      <div style={{display:'flex',gap:2,marginTop:'var(--space-3)',height:10,borderRadius:'var(--radius-full)',overflow:'hidden',background:'var(--surface-sunken)'}}>
        <div style={{width:pct(leftWins) + '%',background:'var(--series-1)'}} />
        {draws > 0 ? <div style={{width:pct(draws) + '%',background:'var(--ink-faint)'}} /> : null}
        <div style={{width:pct(rightWins) + '%',background:'var(--series-2)'}} />
      </div>
    </div>
  );
}
