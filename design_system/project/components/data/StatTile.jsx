import React from 'react';

/** One headline number with its label. Three across on a stats screen. */
export function StatTile({ label, value, unit, meta }) {
  return (
    <div style={{flex:1,minWidth:0,border:'var(--border)',borderRadius:'var(--radius-lg)',background:'var(--surface)',padding:'12px var(--space-3)'}}>
      <div style={{display:'flex',alignItems:'baseline',gap:2}}>
        <span style={{fontFamily:'var(--font-sans)',fontWeight:'var(--weight-bold)',fontSize:'var(--text-2xl)',lineHeight:'var(--text-2xl-lh)',letterSpacing:'var(--tracking-tight)',color:'var(--ink)',fontVariantNumeric:'tabular-nums'}}>{value}</span>
        {unit ? <span style={{fontFamily:'var(--font-sans)',fontWeight:'var(--weight-semibold)',fontSize:'var(--text-base)',color:'var(--ink-subtle)'}}>{unit}</span> : null}
      </div>
      <div style={{marginTop:2,fontFamily:'var(--font-sans)',fontWeight:'var(--weight-medium)',fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-muted)'}}>{label}</div>
      {meta ? <div style={{fontFamily:'var(--font-sans)',fontWeight:'var(--weight-medium)',fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-subtle)'}}>{meta}</div> : null}
    </div>
  );
}
