const { Avatar } = DS;

// iOS status bar + native stack header, recreated only as far as the screenshots need.
function StatusBar() {
  return (
    <div style={{height:44,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',fontFamily:'var(--font-sans)',fontWeight:600,fontSize:14,color:'var(--ink)',flex:'0 0 auto'}}>
      <span>21:40</span>
      <span style={{display:'flex',gap:5,alignItems:'center'}}>
        <span style={{display:'flex',gap:2,alignItems:'flex-end'}}>
          {[5,8,11,14].map((h,i)=><span key={i} style={{width:3,height:h,background:'var(--ink)',borderRadius:1}} />)}
        </span>
        <span style={{width:20,height:11,border:'1px solid var(--ink)',borderRadius:3,padding:1,display:'block'}}>
          <span style={{display:'block',width:'72%',height:'100%',background:'var(--ink)',borderRadius:1}} />
        </span>
      </span>
    </div>
  );
}

function NativeHeader({ title, onBack }) {
  return (
    <div style={{flex:'0 0 auto',height:44,borderBottom:'var(--border)',display:'flex',alignItems:'center',padding:'0 12px',position:'relative'}}>
      <button onClick={onBack} style={{background:'none',border:'none',padding:'4px 8px',cursor:'pointer',display:'flex',alignItems:'center',gap:4,color:'var(--accent)',fontFamily:'var(--font-sans)',fontWeight:500,fontSize:17}}>
        <span style={{fontSize:22,lineHeight:1,marginTop:-2}}>&#8249;</span>Terug
      </button>
      <div style={{position:'absolute',left:0,right:0,textAlign:'center',fontFamily:'var(--font-sans)',fontWeight:600,fontSize:17,color:'var(--ink)',pointerEvents:'none'}}>{title}</div>
    </div>
  );
}

function PhoneFrame({ children, label }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10,alignItems:'center'}}>
      <div style={{width:390,height:760,background:'var(--surface)',borderRadius:44,border:'1px solid var(--line-strong)',overflow:'hidden',display:'flex',flexDirection:'column',position:'relative'}}>
        {children}
        <div style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',width:134,height:5,borderRadius:3,background:'var(--ink)',opacity:.25}} />
      </div>
      {label ? <div style={{fontFamily:'var(--font-sans)',fontWeight:500,fontSize:12,color:'var(--ink-subtle)'}}>{label}</div> : null}
    </div>
  );
}

Object.assign(window, { StatusBar, NativeHeader, PhoneFrame });
