const { Avatar, Card, SectionLabel } = DS;

/**
 * src/features/profile/screens/ProfileScreen.tsx — avatar hero, the name as a read-only field,
 * and a muted panel standing in for personal stats. Nothing here is editable yet.
 */
function ProfileScreen({ profile }) {
  return (
    <div style={{flex:1,minHeight:0,overflow:'auto',padding:'var(--space-6) var(--screen-gutter) var(--space-12)'}}>
      <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={96} />
        <div style={{marginTop:'var(--space-3)',fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-sm)',lineHeight:'var(--text-sm-lh)',color:'var(--ink-subtle)'}}>Profielfoto volgt later</div>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Naam</SectionLabel>
        <Card style={{marginTop:'var(--space-2)'}}>
          <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-lg)',lineHeight:'var(--text-lg-lh)',color:'var(--ink)'}}>{profile.display_name}</div>
        </Card>
      </div>

      <div style={{marginTop:'var(--section-gap)'}}>
        <SectionLabel>Statistieken</SectionLabel>
        <Card tone="muted" padding="var(--space-6) var(--space-4)" style={{marginTop:'var(--space-2)'}}>
          <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink-muted)'}}>Je persoonlijke statistieken verschijnen hier zodra je spellen hebt gespeeld.</div>
        </Card>
      </div>
    </div>
  );
}

Object.assign(window, { ProfileScreen });
