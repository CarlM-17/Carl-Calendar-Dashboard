const express = require("express");
const app = express();
app.use(express.json());

// ─── AUTO-REFRESH ACCESS TOKEN ────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    throw new Error("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or GOOGLE_REFRESH_TOKEN in Railway Variables");
  }

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });

  const data = await r.json();
  if (!r.ok) throw new Error(data.error_description || "Failed to refresh token");

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

// ─── HTML ─────────────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Carl's Dashboard</title>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #080d18; --surface: #0f172a; --surface2: #1a2540;
      --border: #1e2d47; --text: #e2e8f0; --muted: #475569; --dim: #64748b;
      --accent: #6366f1;
    }
    body { background: var(--bg); color: var(--text); font-family: 'DM Sans', sans-serif; min-height: 100vh;
      background-image: radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99,102,241,0.08) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 110%, rgba(6,182,212,0.06) 0%, transparent 60%); }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    .container { max-width: 740px; margin: 0 auto; padding: 28px 16px 60px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 12px; }
    .header-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -0.03em;
      background: linear-gradient(135deg, #f1f5f9 20%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .header-sub { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-top: 5px; }
    .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #22c55e; margin-right: 6px; animation: pulse-dot 2s ease infinite; }
    @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }
    .btn-sm { background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); color: #818cf8; border-radius: 8px; padding: 7px 14px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
    .btn-sm:hover { background: rgba(99,102,241,0.2); }
    .btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }
    .filters { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 22px; }
    .filter-btn { background: transparent; border: 1px solid var(--border); color: var(--dim); border-radius: 20px; padding: 5px 13px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .filter-btn.active { color: var(--text); border-color: var(--accent); background: rgba(99,102,241,0.1); }
    .group { margin-bottom: 30px; animation: fadeUp 0.35s ease both; }
    .group-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .group-label { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
    .group-label.today { color: #818cf8; } .group-label.tomorrow { color: #f97316; } .group-label.default { color: var(--muted); }
    .group-line { flex: 1; height: 1px; background: var(--border); }
    .group-count { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--border); }
    .event-card { display: flex; align-items: flex-start; gap: 11px; padding: 12px 14px; border-radius: 10px; border-left: 3px solid; margin-bottom: 7px; cursor: default; transition: transform 0.15s; }
    .event-card:hover { transform: translateX(4px); }
    .event-icon { font-size: 17px; line-height: 1.3; flex-shrink: 0; }
    .event-body { flex: 1; min-width: 0; }
    .event-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .event-meta { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--dim); margin-top: 3px; }
    .event-desc { font-size: 11px; color: var(--muted); margin-top: 3px; font-style: italic; }
    .badge { font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.06em; flex-shrink: 0; align-self: flex-start; margin-top: 1px; }
    .skeleton { height: 62px; background: var(--surface); border-radius: 10px; margin-bottom: 7px; animation: shimmer 1.4s ease infinite; }
    .error-box { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 13px 16px; color: #fca5a5; font-size: 13px; margin-bottom: 20px; font-family: 'DM Mono', monospace; line-height: 1.7; }
    .empty { text-align: center; color: var(--muted); padding: 60px 0; font-family: 'DM Mono', monospace; font-size: 13px; }
    .footer { text-align: center; color: var(--border); font-size: 11px; font-family: 'DM Mono', monospace; padding-top: 24px; border-top: 1px solid var(--border); margin-top: 20px; }
    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    .spinning { animation: spin 0.8s linear infinite; display: inline-block; }
    @media(max-width:480px){ .header-title{font-size:22px} }
  </style>
</head>
<body>
<div class="container">
  <div class="header">
    <div>
      <div class="header-title">Carl's Dashboard</div>
      <div class="header-sub" id="last-updated"><span class="dot"></span>Loading...</div>
    </div>
    <button class="btn-sm" id="refresh-btn" onclick="loadEvents()" disabled>
      <span id="refresh-icon">↻</span> Refresh
    </button>
  </div>
  <div class="error-box" id="error-box" style="display:none"></div>
  <div class="filters" id="filters" style="display:none"></div>
  <div id="events-container"></div>
  <div class="footer">Carl's Dashboard · X-17 Technologies · Auto-refreshes every 5 min</div>
</div>

<script>
  const CATS = {
    inventory: { label:"Inventory",  color:"#f97316", bg:"rgba(249,115,22,0.1)",  icon:"📦", kw:["inventory"] },
    deadline:  { label:"Deadlines",  color:"#ef4444", bg:"rgba(239,68,68,0.1)",   icon:"⏰", kw:["deadline","due date","due"] },
    report:    { label:"Reports",    color:"#a78bfa", bg:"rgba(167,139,250,0.1)", icon:"📤", kw:["send mas","mas"] },
    training:  { label:"Training",   color:"#22d3ee", bg:"rgba(34,211,238,0.1)",  icon:"🏋️", kw:["training","convention","zoom","renewal"] },
    personal:  { label:"Personal",   color:"#f472b6", bg:"rgba(244,114,182,0.1)", icon:"🎂", kw:["birthday"] },
    other:     { label:"Other",      color:"#64748b", bg:"rgba(100,116,139,0.1)", icon:"📅", kw:[] },
  };
  let allEvents=[], activeFilter="all";

  const cat = t => { const l=(t||"").toLowerCase(); for(const[k,c]of Object.entries(CATS)) if(c.kw.some(w=>l.includes(w))) return k; return "other"; };
  const days = s => { const n=new Date();n.setHours(0,0,0,0);const d=new Date(s);d.setHours(0,0,0,0);return Math.round((d-n)/86400000); };
  const fmtD = s => new Date(s).toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"});
  const fmtT = s => new Date(s).toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"});
  const grpLabel = s => { const d=days(s); if(d===0)return"Today"; if(d===1)return"Tomorrow"; if(d<=7)return"This Week"; if(d<=14)return"Next Week"; return new Date(s).toLocaleDateString("en-PH",{month:"long",year:"numeric"}); };

  async function loadEvents() {
    setLoading(true); clearErr();
    const now=new Date(), end=new Date(); end.setDate(end.getDate()+45);
    try {
      const r = await fetch("/api/events", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ timeMin:now.toISOString(), timeMax:end.toISOString() })
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      allEvents = data.events || [];
      renderFilters(); renderEvents(); setUpdated();
    } catch(e) { showErr(e.message); }
    finally { setLoading(false); }
  }

  function renderFilters() {
    const el=document.getElementById("filters"); el.style.display="flex";
    const cnt={}; allEvents.forEach(ev=>{ const c=cat(ev.summary); cnt[c]=(cnt[c]||0)+1; });
    let h=\`<button class="filter-btn \${activeFilter==="all"?"active":""}" onclick="setFilter('all')">All · \${allEvents.length}</button>\`;
    for(const[k,c]of Object.entries(CATS)) {
      if(!cnt[k]) continue;
      const on=activeFilter===k;
      h+=\`<button class="filter-btn \${on?"active":""}" onclick="setFilter('\${k}')" style="\${on?\`border-color:\${c.color};color:\${c.color};background:\${c.bg}\`:""}">\${c.icon} \${c.label} · \${cnt[k]}</button>\`;
    }
    el.innerHTML=h;
  }

  function setFilter(f){ activeFilter=f; renderFilters(); renderEvents(); }

  function renderEvents() {
    const el=document.getElementById("events-container");
    const list=activeFilter==="all"?allEvents:allEvents.filter(ev=>cat(ev.summary)===activeFilter);
    if(!list.length){ el.innerHTML='<div class="empty">No upcoming events</div>'; return; }
    const grps={};
    list.forEach(ev=>{ const s=ev.start?.dateTime||ev.start?.date; const l=grpLabel(s); if(!grps[l])grps[l]=[]; grps[l].push(ev); });
    const ORDER=["Today","Tomorrow","This Week","Next Week"];
    const keys=[...ORDER.filter(k=>grps[k]),...Object.keys(grps).filter(k=>!ORDER.includes(k))];
    let h="";
    keys.forEach((g,i)=>{
      const lc=g==="Today"?"today":g==="Tomorrow"?"tomorrow":"default";
      h+=\`<div class="group" style="animation-delay:\${i*0.05}s"><div class="group-header"><span class="group-label \${lc}">\${g}</span><div class="group-line"></div><span class="group-count">\${grps[g].length}</span></div>\`;
      grps[g].forEach(ev=>{ h+=cardHTML(ev); });
      h+=\`</div>\`;
    });
    el.innerHTML=h;
  }

  function cardHTML(ev) {
    const c=CATS[cat(ev.summary)], s=ev.start?.dateTime||ev.start?.date, isDT=!!ev.start?.dateTime, d=days(s);
    const badge=d===0?\`<span class="badge" style="background:#ef4444;color:#fff">TODAY</span>\`:d===1?\`<span class="badge" style="background:#f97316;color:#fff">TOMORROW</span>\`:"";
    return \`<div class="event-card" style="background:\${c.bg};border-left-color:\${c.color}">
      <span class="event-icon">\${c.icon}</span>
      <div class="event-body">
        <div class="event-title">\${ev.summary||"Untitled"}</div>
        <div class="event-meta">\${fmtD(s)}\${isDT?" · "+fmtT(ev.start.dateTime):""}</div>
        \${ev.description?\`<div class="event-desc">\${ev.description}</div>\`:""}
      </div>\${badge}</div>\`;
  }

  function setLoading(on) {
    const btn=document.getElementById("refresh-btn"),icon=document.getElementById("refresh-icon");
    btn.disabled=on; icon.className=on?"spinning":""; icon.textContent="↻";
    if(on&&allEvents.length===0) document.getElementById("events-container").innerHTML=Array(6).fill('<div class="skeleton"></div>').join("");
  }
  function setUpdated() {
    const t=new Date().toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"});
    document.getElementById("last-updated").innerHTML=\`<span class="dot"></span>Updated \${t} · Auto-refreshes every 5 min\`;
    document.getElementById("refresh-btn").disabled=false;
  }
  function showErr(m){ const e=document.getElementById("error-box"); e.innerHTML="⚠️ "+m; e.style.display="block"; }
  function clearErr(){ document.getElementById("error-box").style.display="none"; }

  window.addEventListener("DOMContentLoaded",()=>{
    loadEvents();
    setInterval(loadEvents, 5*60*1000);
  });
</script>
</body>
</html>`;

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send(HTML));

app.post("/api/events", async (req, res) => {
  try {
    const token = await getAccessToken();
    const { timeMin, timeMax } = req.body;

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", timeMin);
    url.searchParams.set("timeMax", timeMax);
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "100");

    const r = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` }
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || String(r.status) });
    res.json({ events: data.items || [] });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
