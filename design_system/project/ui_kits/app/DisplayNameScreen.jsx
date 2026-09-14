const { Button, TextField } = DS;

/**
 * src/features/auth/screens/DisplayNameScreen.tsx — the one and only onboarding prompt.
 * Vertically centred in a keyboard-aware scroll view, 24px gutter.
 */
function DisplayNameScreen({ onSubmit }) {
  const [name, setName] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const trimmed = name.trim();

  function submit() {
    if (!trimmed || pending) return;
    setPending(true);
    setTimeout(() => { setPending(false); onSubmit(trimmed); }, 650);
  }

  return (
    <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',padding:'0 var(--screen-gutter)'}}>
      <h1 style={{margin:0,fontFamily:'var(--font-sans)',fontWeight:700,fontSize:'var(--text-3xl)',lineHeight:'var(--text-3xl-lh)',letterSpacing:'var(--tracking-tight)',color:'var(--ink)',textWrap:'pretty'}}>Hoe mogen we je noemen?</h1>
      <p style={{margin:'var(--space-2) 0 0',fontFamily:'var(--font-sans)',fontWeight:500,fontSize:'var(--text-base)',lineHeight:'var(--text-base-lh)',color:'var(--ink-muted)'}}>Dit is de naam die je vrienden op het scorebord zien.</p>
      <TextField value={name} onChange={setName} placeholder="Je naam" maxLength={40} style={{marginTop:'var(--space-8)'}} />
      <div style={{marginTop:'var(--space-6)'}}>
        <Button label="Doorgaan" onClick={submit} disabled={!trimmed} isLoading={pending} />
      </div>
    </div>
  );
}

Object.assign(window, { DisplayNameScreen });
