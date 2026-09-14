// Design-system namespace, read lazily so a stale or not-yet-compiled bundle shows a
// legible notice instead of unmounting the whole tree.
const DS = new Proxy({}, {
  get(_t, key) {
    const ns = window.GameNightHQDesignSystem_d57d33 || {};
    if (ns[key]) return ns[key];
    return function MissingComponent() {
      return (
        <div style={{border:'1px dashed var(--danger-line)',borderRadius:'var(--radius-md)',padding:'8px 12px',fontFamily:'var(--font-sans)',fontWeight:600,fontSize:13,color:'var(--danger)'}}>
          {String(key)} ontbreekt in _ds_bundle.js
        </div>
      );
    };
  },
});

// Demo data for the UI kit. Shapes follow the Supabase sketch in CLAUDE.md.
const MEMBERS = [
  { id: 'u1', display_name: 'Jasper Versteeg', color: 'var(--series-1)' },
  { id: 'u2', display_name: 'Mara de Wit', color: 'var(--series-2)' },
  { id: 'u3', display_name: 'Tim Boskamp', color: 'var(--series-3)' },
  { id: 'u4', display_name: 'Lotte Prins', color: 'var(--series-4)' },
];

const TEMPLATES = [
  {
    id: 't1', name: 'Kolonisten', scoring_direction: 'highest_total_wins',
    fields: [
      { key: 'nederzettingen', label: 'Nederzettingen', sign: 1, default_value: 0 },
      { key: 'steden', label: 'Steden', sign: 1, default_value: 0 },
      { key: 'langste_weg', label: 'Langste handelsroute', sign: 1, default_value: 0 },
      { key: 'strafkaarten', label: 'Strafkaarten', sign: -1, default_value: 0 },
    ],
    bonus_rules: [{ field_key: 'steden', operator: '>=', value: 4, points_delta: 2 }],
  },
  { id: 't2', name: 'Wie is de Mol', scoring_direction: 'lowest_total_wins', fields: [], bonus_rules: [] },
  { id: 't3', name: 'Dartsavond', scoring_direction: 'highest_total_wins', fields: [], bonus_rules: [] },
];

const SESSIONS = [
  { id: 's1', game: 'Kolonisten', played_at: '12 sep', status: 'in_progress', scorekeeper: 'u1', winner: null, totals: [] },
  { id: 's2', game: 'Kolonisten', played_at: '2 sep', status: 'final', winner: 'Mara de Wit', totals: [['Mara de Wit', 11], ['Jasper Versteeg', 9], ['Tim Boskamp', 7]] },
  { id: 's3', game: 'Dartsavond', played_at: '29 aug', status: 'final', winner: 'Tim Boskamp', totals: [['Tim Boskamp', 301], ['Jasper Versteeg', 244], ['Lotte Prins', 190]] },
  { id: 's4', game: 'Kolonisten', played_at: '19 aug', status: 'final', winner: 'Jasper Versteeg', totals: [['Jasper Versteeg', 10], ['Mara de Wit', 10], ['Lotte Prins', 6]] },
  { id: 's5', game: 'Wie is de Mol', played_at: '5 aug', status: 'final', winner: 'Lotte Prins', totals: [['Lotte Prins', 3], ['Mara de Wit', 5], ['Tim Boskamp', 8]] },
];

const TREND = {
  labels: ['5/8', '19/8', '2/9', '12/9', '26/9'],
  series: [
    { name: 'Mara', color: 'var(--series-2)', points: [8, 10, 7, 11, 9] },
    { name: 'Jasper', color: 'var(--series-1)', points: [6, 10, 9, 8, 12] },
    { name: 'Tim', color: 'var(--series-3)', points: [5, 6, 8, 7, 7] },
  ],
};

Object.assign(window, { DS, MEMBERS, TEMPLATES, SESSIONS, TREND });
