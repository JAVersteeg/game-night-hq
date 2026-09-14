const { Button, Card, Badge, Avatar, SectionLabel, NumberStepper, ScoreBars } = DS;

const TEMPLATE = () => TEMPLATES[0];

function total(values, fields) {
  return fields.reduce((sum, f) => sum + f.sign * (values[f.key] ?? 0), 0);
}

/** One participant's card during live entry. Collapsed unless it is the open one. */
function PlayerEntry({ member, values, fields, open, onOpen, onChange, readOnly }) {
  const t = total(values, fields);
  return (
    <Card padding="0">
      <button
        type="button"
        onClick={onOpen}
        style={{width:'100%',display:'flex',alignItems:'center',gap:'var(--space-3)',background:'none',border:'none',padding:'12px var(--space-4)',cursor:'pointer',textAlign:'left'}}
      >
        <Avatar displayName={member.display_name} size={36} />
        <span style={{flex:1,minWidth:0,fontFamily:'var(--font-sans)',fontWeight:600,fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{member.display_name}</span>
        <span style={{fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'var(--text-2xl)',lineHeight:'var(--text-2xl-lh)',letterSpacing:'var(--tracking-tight)',color:'var(--ink)',fontVariantNumeric:'tabular-nums'}}>{t}</span>
      </button>
      {open && !readOnly ? (
        <div style={{borderTop:'var(--border)',padding:'var(--space-3) var(--space-4)',display:'flex',flexDirection:'column',gap:'var(--space-3)'}}>
          {fields.map((f) => (
            <NumberStepper key={f.key} label={f.label} sign={f.sign} value={values[f.key] ?? 0} onChange={(v) => onChange(f.key, v)} />
          ))}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Live session. The scorekeeper gets the entry form; everyone else in the group gets the
 * same layout read-only, updating over Realtime.
 */
function LiveSessionScreen({ readOnly = false, onFinish }) {
  const fields = TEMPLATE().fields;
  const players = MEMBERS.slice(0, 3);
  const [scores, setScores] = React.useState({
    u1: { nederzettingen: 4, steden: 2, langste_weg: 2, strafkaarten: 1 },
    u2: { nederzettingen: 5, steden: 3, langste_weg: 0, strafkaarten: 0 },
    u3: { nederzettingen: 3, steden: 2, langste_weg: 0, strafkaarten: 2 },
  });
  const [open, setOpen] = React.useState('u1');

  const change = (id) => (key, v) => setScores({ ...scores, [id]: { ...scores[id], [key]: v } });

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
      <div style={{padding:'var(--space-2) var(--screen-gutter) 0'}}>
        <div style={{display:'flex',alignItems:'center',gap:'var(--space-3)'}}>
          <h1 style={{margin:0,flex:1,fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'var(--text-3xl)',lineHeight:'var(--text-3xl-lh)',letterSpacing:'var(--tracking-tight)',color:'var(--ink)'}}>Kolonisten</h1>
          <Badge tone="warning">Bezig</Badge>
        </div>
        <div style={{marginTop:4,fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-muted)'}}>
          {readOnly ? 'Alleen lezen · Jasper houdt de score bij' : 'Hoogste totaal wint · jij houdt de score bij'}
        </div>
      </div>

      <div style={{flex:1,minHeight:0,overflow:'auto',padding:'var(--space-4) var(--screen-gutter) var(--space-8)',display:'flex',flexDirection:'column',gap:'var(--space-2)'}}>
        {players.map((m) => (
          <PlayerEntry
            key={m.id}
            member={m}
            fields={fields}
            values={scores[m.id]}
            open={open === m.id}
            readOnly={readOnly}
            onOpen={() => setOpen(open === m.id ? null : m.id)}
            onChange={change(m.id)}
          />
        ))}

        {readOnly ? null : (
          <div style={{marginTop:'var(--space-4)'}}>
            <Button label="Avond afronden" onClick={onFinish} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Locked result: winner, final totals, and the bonus rules that fired. */
function SessionResultScreen({ onDone }) {
  const rows = [
    { name: 'Mara de Wit', total: 10 },
    { name: 'Jasper Versteeg', total: 7 },
    { name: 'Tim Boskamp', total: 3 },
  ];
  return (
    <div style={{flex:1,minHeight:0,overflow:'auto',padding:'var(--space-6) var(--screen-gutter) var(--space-12)'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center'}}>
        <Avatar displayName="Mara de Wit" size={72} />
        <div style={{marginTop:'var(--space-3)'}}><Badge tone="success">Winnaar</Badge></div>
        <div style={{marginTop:'var(--space-2)',fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'var(--text-2xl)',lineHeight:'var(--text-2xl-lh)',letterSpacing:'var(--tracking-tight)',color:'var(--ink)'}}>Mara de Wit</div>
        <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink-muted)'}}>Kolonisten · 12 september</div>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Eindstand</SectionLabel>
        <Card style={{marginTop:'var(--space-2)'}}>
          <ScoreBars rows={rows} />
        </Card>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Bonusregels</SectionLabel>
        <Card tone="muted" style={{marginTop:'var(--space-2)'}}>
          <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink-muted)'}}>Mara kreeg +2 punten voor vier steden of meer.</div>
        </Card>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <Button label="Klaar" onClick={onDone} />
      </div>
    </div>
  );
}

Object.assign(window, { LiveSessionScreen, SessionResultScreen });
