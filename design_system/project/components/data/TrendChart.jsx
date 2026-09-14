import React from 'react';

const PAD = { l: 30, r: 8, t: 10, b: 22 };

/**
 * Score trend over time: one line per player, points evenly spaced by session index.
 * Deliberately plain — hairline grid, 2px lines, small dots, no area fill, no animation.
 */
export function TrendChart({ series = [], labels = [], height = 168, width = 342 }) {
  const all = series.flatMap((s) => s.points).filter((n) => typeof n === 'number');
  if (all.length === 0 || series.length === 0) return null;

  const rawMin = Math.min(...all);
  const rawMax = Math.max(...all);
  const span = Math.max(1, rawMax - rawMin);
  const min = Math.floor((rawMin - span * 0.15) / 2) * 2;
  const max = Math.ceil((rawMax + span * 0.15) / 2) * 2;

  const innerW = width - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const n = Math.max(1, labels.length || series[0].points.length);
  const x = (i) => PAD.l + (n === 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v) => PAD.t + innerH - ((v - min) / (max - min)) * innerH;

  const ticks = [min, min + (max - min) / 2, max];

  return (
    <div>
      <svg viewBox={'0 0 ' + width + ' ' + height} width="100%" height={height} role="img" style={{display:'block',overflow:'visible'}}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke="var(--line)" strokeWidth="1" />
            <text x={PAD.l - 6} y={y(t) + 4} textAnchor="end" fontFamily="var(--font-sans)" fontSize="10" fontWeight="500" fill="var(--ink-subtle)">{Math.round(t)}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fontFamily="var(--font-sans)" fontSize="10" fontWeight="500" fill="var(--ink-subtle)">{l}</text>
        ))}
        {series.map((s) => (
          <g key={s.name}>
            <polyline
              fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              points={s.points.map((v, i) => x(i) + ',' + y(v)).join(' ')}
            />
            {s.points.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="2.5" fill="var(--surface)" stroke={s.color} strokeWidth="2" />)}
          </g>
        ))}
      </svg>
      <div style={{display:'flex',flexWrap:'wrap',gap:'var(--space-3)',marginTop:'var(--space-2)',paddingLeft:PAD.l}}>
        {series.map((s) => (
          <span key={s.name} style={{display:'inline-flex',alignItems:'center',gap:6,fontFamily:'var(--font-sans)',fontWeight:'var(--weight-medium)',fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-muted)'}}>
            <span style={{width:10,height:2,borderRadius:2,background:s.color,display:'inline-block'}} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
