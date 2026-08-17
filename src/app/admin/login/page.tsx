export default function AdminLoginPage() {
  return (
    <main style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px",background:"#020617",color:"white"}}>
      <div style={{width:"100%",maxWidth:"420px",padding:"32px",borderRadius:"24px",background:"#0f172a"}}>
        <h1 style={{fontSize:"30px",fontWeight:800,textAlign:"center"}}>TechStar Admin</h1>
        <p style={{textAlign:"center",color:"#94a3b8",marginTop:"8px"}}>Admin login page</p>
        <form action="/api/admin/login" method="post" style={{marginTop:"28px"}}>
          <input name="phone" type="tel" placeholder="Phone Number" required style={{width:"100%",padding:"14px",marginBottom:"14px",borderRadius:"12px",border:"1px solid #334155",background:"#020617",color:"white"}} />
          <input name="password" type="password" placeholder="Password" required style={{width:"100%",padding:"14px",marginBottom:"14px",borderRadius:"12px",border:"1px solid #334155",background:"#020617",color:"white"}} />
          <button type="submit" style={{width:"100%",padding:"14px",border:0,borderRadius:"12px",background:"#2563eb",color:"white",fontWeight:700}}>Sign in to Admin</button>
        </form>
      </div>
    </main>
  );
}
