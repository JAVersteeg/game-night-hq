const { Button, Card, ListRow, Badge, SectionLabel, SegmentedControl, Avatar, StatTile, Leaderboard, TrendChart, HeadToHead, EmptyState } = DS;

const ScreenTitle = ({ children, right }) => (
  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'var(--space-4)',padding:'var(--space-2) var(--screen-gutter) 0'}}>
    <h1 style={{margin:0,fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'var(--text-3xl)',lineHeight:'var(--text-3xl-lh)',letterSpacing:'var(--tracking-tight)',color:'var(--ink)'}}>{children}</h1>
    {right}
  </div>
);

const Scroll = ({ children }) => (
  <div style={{flex:1,minHeight:0,overflow:'auto',padding:'var(--space-4) var(--screen-gutter) var(--space-8)',display:'flex',flexDirection:'column',gap:'var(--list-gap)'}}>{children}</div>
);

/** Games tab: the group's templates, plus the way into a new session. */
function GamesTab({ onNewGame, onStart }) {
  return (
    <Scroll>
      {TEMPLATES.map((t) => (
        <ListRow
          key={t.id}
          title={t.name}
          meta={(t.scoring_direction === 'highest_total_wins' ? 'Hoogste totaal wint' : 'Laagste totaal wint') + (t.fields.length ? ' · ' + t.fields.length + ' velden' : '')}
          onClick={() => {}}
        />
      ))}
      <div style={{display:'flex',flexDirection:'column',gap:'var(--space-2)',marginTop:'var(--space-4)'}}>
        <Button label="Avond starten" onClick={onStart} />
        <Button label="Spel toevoegen" variant="ghost" onClick={onNewGame} />
      </div>
    </Scroll>
  );
}

/** History tab: sessions newest first, the live one flagged. */
function HistoryTab({ onOpen }) {
  return (
    <Scroll>
      {SESSIONS.map((s) => (
        <ListRow
          key={s.id}
          title={s.game}
          meta={s.status === 'in_progress' ? s.played_at + ' · Jasper houdt de score bij' : s.played_at + ' · ' + s.winner + ' won'}
          right={s.status === 'in_progress' ? <Badge tone="warning">Bezig</Badge> : null}
          onClick={() => onOpen(s)}
        />
      ))}
    </Scroll>
  );
}

/** Stats tab: headline numbers, per-game leaderboard, trend, head-to-head. */
function StatsTab() {
  const [game, setGame] = React.useState('Kolonisten');
  const [pair, setPair] = React.useState(['Jasper Versteeg', 'Mara de Wit']);
  return (
    <Scroll>
      <div style={{display:'flex',gap:'var(--space-3)'}}>
        <StatTile value="12" label="avonden" />
        <StatTile value="25" unit="%" label="jouw winst" />
        <StatTile value="8.4" label="gem. score" />
      </div>

      <div style={{marginTop:'var(--space-4)'}}>
        <SegmentedControl options={['Kolonisten', 'Dartsavond', 'Alles']} value={game} onChange={setGame} />
      </div>

      <div style={{marginTop:'var(--space-4)'}}>
        <SectionLabel>Klassement</SectionLabel>
        <div style={{marginTop:'var(--space-2)'}}>
          <Leaderboard
            columns={['Gespeeld', 'Winst', 'Gem.']}
            renderAvatar={(r) => <Avatar displayName={r.name} size={24} />}
            rows={[
              { name: 'Mara de Wit', values: [12, '42%', 8.4] },
              { name: 'Jasper Versteeg', values: [12, '25%', 7.1], highlight: true },
              { name: 'Tim Boskamp', values: [9, '22%', 6.8] },
              { name: 'Lotte Prins', values: [7, '14%', 6.2] },
            ]}
          />
        </div>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Scoreverloop</SectionLabel>
        <Card padding="var(--space-3)" style={{marginTop:'var(--space-2)'}}>
          <TrendChart labels={TREND.labels} series={TREND.series} width={310} height={150} />
        </Card>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Onderling</SectionLabel>
        <Card style={{marginTop:'var(--space-2)'}}>
          <HeadToHead left="Jasper" right="Mara" leftWins={4} rightWins={7} draws={1} />
          <div style={{display:'flex',flexWrap:'wrap',gap:'var(--space-2)',marginTop:'var(--space-4)'}}>
            {MEMBERS.map((m) => {
              const on = pair.includes(m.display_name);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPair(on ? pair : [pair[1], m.display_name])}
                  style={{border: on ? '1px solid var(--accent-line)' : 'var(--border)',background: on ? 'var(--accent-soft)' : 'var(--surface)',color: on ? 'var(--accent-soft-fg)' : 'var(--ink-muted)',borderRadius:'var(--radius-full)',padding:'6px 12px',fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-sm)',cursor:'pointer'}}
                >
                  {m.display_name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        </Card>
      </div>
    </Scroll>
  );
}

/**
 * Group detail. Three tabs, matching the domain model: the group's games, its session
 * history, and stats derived from that history.
 */
function GroupDetailScreen({ group, initialTab = 'Spellen', onNewGame, onStart, onOpenSession }) {
  const [tab, setTab] = React.useState(initialTab);
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
      <ScreenTitle right={<div style={{display:'flex',marginTop:6}}>{MEMBERS.slice(0, 3).map((m, i) => <div key={m.id} style={{marginLeft: i ? -10 : 0,border:'2px solid var(--surface)',borderRadius:'var(--radius-full)',display:'flex'}}><Avatar displayName={m.display_name} size={28} /></div>)}</div>}>{group}</ScreenTitle>
      <div style={{padding:'var(--space-3) var(--screen-gutter) 0'}}>
        <SegmentedControl options={['Spellen', 'Geschiedenis', 'Statistieken']} value={tab} onChange={setTab} />
      </div>
      {tab === 'Spellen' ? <GamesTab onNewGame={onNewGame} onStart={onStart} />
        : tab === 'Geschiedenis' ? <HistoryTab onOpen={onOpenSession} />
        : <StatsTab />}
    </div>
  );
}

Object.assign(window, { GroupDetailScreen, GamesTab, HistoryTab, StatsTab, ScreenTitle, Scroll });
