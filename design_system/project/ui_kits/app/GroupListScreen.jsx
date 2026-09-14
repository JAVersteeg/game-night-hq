const { Avatar, ListRow, EmptyState } = DS;

/**
 * src/features/groups/screens/GroupListScreen.tsx — title row with the profile avatar on the
 * right, then a FlatList of group rows with an empty state.
 *
 * The app has no create/join UI yet, so this screen offers no way in: the empty state is the
 * whole story until that flow is built. Toggle the demo data outside the phone instead.
 */
function GroupListScreen({ profile, groups, onProfile }) {
  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',minHeight:0}}>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'var(--space-4)',padding:'var(--space-2) var(--screen-gutter)'}}>
        <h1 style={{margin:0,fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'var(--text-3xl)',lineHeight:'var(--text-3xl-lh)',letterSpacing:'var(--tracking-tight)',color:'var(--ink)'}}>Jouw groepen</h1>
        <button onClick={onProfile} aria-label="Naar je profiel" style={{background:'none',border:'none',padding:0,marginTop:4,cursor:'pointer'}}>
          <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={40} />
        </button>
      </div>
      <div style={{flex:1,minHeight:0,overflow:'auto',display:'flex',flexDirection:'column',gap:'var(--list-gap)',padding:'var(--space-2) var(--screen-gutter) var(--space-8)'}}>
        {groups.length === 0 ? (
          <EmptyState
            title="Nog geen groepen"
            body="Maak een groep voor jullie spelavonden, of sluit je aan bij een groep met een uitnodigingscode van een vriend."
          />
        ) : groups.map((g) => <ListRow key={g.id} title={g.name} onClick={() => {}} />)}
      </div>
    </div>
  );
}

Object.assign(window, { GroupListScreen });
