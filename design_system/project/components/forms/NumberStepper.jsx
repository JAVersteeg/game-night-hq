import React from 'react';

const BTN = {
  width:40, height:40, flex:'0 0 auto', borderRadius:'var(--radius-md)',
  border:'var(--border-strong)', background:'var(--surface)', color:'var(--ink)',
  fontFamily:'var(--font-sans)', fontWeight:'var(--weight-semibold)', fontSize:20,
  lineHeight:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
};

/**
 * Numeric score field. The scorekeeper is entering numbers fast with one thumb, so the
 * value is tappable up and down as well as typeable.
 */
export function NumberStepper({ label, value = 0, onChange, sign = 1, step = 1, min, max }) {
  const set = (v) => {
    if (typeof min === 'number' && v < min) return;
    if (typeof max === 'number' && v > max) return;
    onChange && onChange(v);
  };
  return (
    <div style={{display:'flex',alignItems:'center',gap:'var(--space-3)'}}>
      <div style={{minWidth:0,flex:1}}>
        <div style={{fontFamily:'var(--font-sans)',fontWeight:'var(--weight-medium)',fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink)'}}>{label}</div>
        {sign === -1 ? (
          <div style={{fontFamily:'var(--font-sans)',fontWeight:'var(--weight-medium)',fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--danger)'}}>telt af</div>
        ) : null}
      </div>
      <div style={{display:'flex',alignItems:'center',gap:'var(--space-2)'}}>
        <button type="button" style={BTN} onClick={() => set(value - step)} aria-label="minder">&#8722;</button>
        <input
          value={value}
          onChange={(e) => { const n = Number(e.target.value.replace(/[^\d-]/g, '')); if (!Number.isNaN(n)) set(n); }}
          style={{width:56,textAlign:'center',padding:'9px 4px',borderRadius:'var(--radius-md)',border:'var(--border)',background:'var(--surface)',color:'var(--ink)',fontFamily:'var(--font-sans)',fontWeight:'var(--weight-semibold)',fontSize:'var(--text-lg)',lineHeight:'var(--text-lg-lh)',fontVariantNumeric:'tabular-nums',outline:'none'}}
        />
        <button type="button" style={BTN} onClick={() => set(value + step)} aria-label="meer">+</button>
      </div>
    </div>
  );
}
