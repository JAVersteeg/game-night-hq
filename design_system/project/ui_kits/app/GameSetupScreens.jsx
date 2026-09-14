const { Button, Card, TextField, SectionLabel, ChoiceRow, NumberStepper, Badge } = DS;

/**
 * Define a game for this group: a name, numeric fields with a sign, a scoring direction,
 * and optional bonus rules. Any member can do this — there is no admin role.
 */
function GameTemplateScreen({ onSave }) {
  const [name, setName] = React.useState('Kolonisten');
  const [direction, setDirection] = React.useState('highest_total_wins');
  const [fields, setFields] = React.useState(TEMPLATES[0].fields);
  const [rules, setRules] = React.useState(TEMPLATES[0].bonus_rules);

  const flip = (i) => setFields(fields.map((f, j) => (j === i ? { ...f, sign: f.sign === 1 ? -1 : 1 } : f)));
  const addField = () => setFields([...fields, { key: 'veld' + (fields.length + 1), label: 'Nieuw veld', sign: 1, default_value: 0 }]);

  return (
    <div style={{flex:1,minHeight:0,overflow:'auto',padding:'var(--space-6) var(--screen-gutter) var(--space-12)'}}>
      <TextField label="Naam" value={name} onChange={setName} placeholder="Naam van het spel" />

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Velden</SectionLabel>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-2)',marginTop:'var(--space-2)'}}>
          {fields.map((f, i) => (
            <Card key={f.key} padding="12px var(--space-4)">
              <div style={{display:'flex',alignItems:'center',gap:'var(--space-3)'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:'var(--font-sans)',fontWeight:600,fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.label}</div>
                  <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-subtle)'}}>start op {f.default_value}</div>
                </div>
                <button type="button" onClick={() => flip(i)} style={{border:'none',background:'none',padding:0,cursor:'pointer'}}>
                  <Badge tone={f.sign === 1 ? 'success' : 'danger'}>{f.sign === 1 ? 'Telt op' : 'Telt af'}</Badge>
                </button>
              </div>
            </Card>
          ))}
        </div>
        <div style={{marginTop:'var(--space-3)'}}>
          <Button label="Veld toevoegen" variant="ghost" onClick={addField} />
        </div>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Scorerichting</SectionLabel>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-2)',marginTop:'var(--space-2)'}}>
          <ChoiceRow title="Hoogste totaal wint" selected={direction === 'highest_total_wins'} onSelect={() => setDirection('highest_total_wins')} />
          <ChoiceRow title="Laagste totaal wint" selected={direction === 'lowest_total_wins'} onSelect={() => setDirection('lowest_total_wins')} />
        </div>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Bonusregels</SectionLabel>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-2)',marginTop:'var(--space-2)'}}>
          {rules.map((r, i) => (
            <Card key={i} padding="12px var(--space-4)">
              <div style={{fontFamily:'var(--font-sans)',fontWeight:600,fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink)'}}>Steden {r.operator} {r.value}</div>
              <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-muted)'}}>{r.points_delta > 0 ? '+' : ''}{r.points_delta} punten aan het eind van de avond</div>
            </Card>
          ))}
          {rules.length === 0 ? (
            <Card tone="muted">
              <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink-muted)'}}>Nog geen bonusregels. Een regel geeft punten bij een voorwaarde, bijvoorbeeld vier steden of meer.</div>
            </Card>
          ) : null}
        </div>
        <div style={{marginTop:'var(--space-3)'}}>
          <Button label="Regel toevoegen" variant="ghost" onClick={() => setRules([...rules, { field_key: 'steden', operator: '>=', value: 4, points_delta: 2 }])} />
        </div>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <Button label="Spel opslaan" onClick={onSave} />
      </div>
    </div>
  );
}

/** Pick a game, pick who plays, pick tonight's scorekeeper. */
function SessionSetupScreen({ onStart }) {
  const { Avatar } = DS;
  const [game, setGame] = React.useState('t1');
  const [players, setPlayers] = React.useState(['u1', 'u2', 'u3']);
  const [keeper, setKeeper] = React.useState('u1');
  const toggle = (id) => setPlayers(players.includes(id) ? players.filter((p) => p !== id) : [...players, id]);

  return (
    <div style={{flex:1,minHeight:0,overflow:'auto',padding:'var(--space-6) var(--screen-gutter) var(--space-12)'}}>
      <SectionLabel>Spel</SectionLabel>
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-2)',marginTop:'var(--space-2)'}}>
        {TEMPLATES.map((t) => (
          <ChoiceRow key={t.id} title={t.name} meta={t.scoring_direction === 'highest_total_wins' ? 'Hoogste totaal wint' : 'Laagste totaal wint'} selected={game === t.id} onSelect={() => setGame(t.id)} />
        ))}
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Wie speelt mee</SectionLabel>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-2)',marginTop:'var(--space-2)'}}>
          {MEMBERS.map((m) => (
            <ChoiceRow key={m.id} mode="check" title={m.display_name} left={<Avatar displayName={m.display_name} size={32} />} selected={players.includes(m.id)} onSelect={() => toggle(m.id)} />
          ))}
        </div>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Scoreteller</SectionLabel>
        <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-muted)',marginTop:4}}>Alleen de scoreteller vult de scores in. De rest kijkt live mee.</div>
        <div style={{display:'flex',flexDirection:'column',gap:'var(--space-2)',marginTop:'var(--space-2)'}}>
          {MEMBERS.filter((m) => players.includes(m.id)).map((m) => (
            <ChoiceRow key={m.id} title={m.display_name} left={<Avatar displayName={m.display_name} size={32} />} selected={keeper === m.id} onSelect={() => setKeeper(m.id)} />
          ))}
        </div>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <Button label="Avond starten" onClick={onStart} disabled={players.length < 2} />
      </div>
    </div>
  );
}

Object.assign(window, { GameTemplateScreen, SessionSetupScreen });
