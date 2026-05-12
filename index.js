const express = require("express");
const app = express();
app.use(express.json());

// ─── FULL DASHBOARD HTML ────────────────────────────────────────────────────
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
    body {
      background: var(--bg); color: var(--text);
      font-family: 'DM Sans', sans-serif; min-height: 100vh;
      background-image:
        radial-gradient(ellipse 80% 50% at 20% -10%, rgba(99,102,241,0.08) 0%, transparent 60%),
        radial-gradient(ellipse 60% 40% at 80% 110%, rgba(6,182,212,0.06) 0%, transparent 60%);
    }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    .container { max-width: 740px; margin: 0 auto; padding: 28px 16px 60px; }

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 12px; }
    .header-title {
      font-family: 'Syne', sans-serif; font-weight: 800; font-size: 28px;
      letter-spacing: -0.03em;
      background: linear-gradient(135deg, #f1f5f9 20%, #94a3b8 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    }
    .header-sub { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-top: 5px; }
    .dot {
      display: inline-block; width: 6px; height: 6px; border-radius: 50%;
      background: #22c55e; margin-right: 6px; animation: pulse-dot 2s ease infinite;
    }
    @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }

    /* SETUP CARD */
    .setup-card { background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 28px; margin-bottom: 24px; }
    .setup-card h2 { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 16px; margin-bottom: 8px; }
    .setup-card p { font-size: 13px; color: var(--dim); margin-bottom: 16px; line-height: 1.6; }
    .input-group { display: flex; flex-direction: column; gap: 10px; }
    .input-row {
      display: flex; align-items: center; gap: 10px;
      background: var(--surface2); border: 1px solid var(--border);
      border-radius: 9px; padding: 4px 4px 4px 14px; transition: border-color 0.2s;
    }
    .input-row:focus-within { border-color: var(--accent); }
    .input-row label { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--muted); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.08em; }
    .input-row input { flex: 1; background: transparent; border: none; outline: none; color: var(--text); font-family: 'DM Mono', monospace; font-size: 12px; padding: 8px 0; }
    .input-row input::placeholder { color: var(--muted); }
    .btn { background: var(--accent); color: #fff; border: none; border-radius: 9px; padding: 11px 20px; font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13px; cursor: pointer; transition: opacity 0.2s, transform 0.15s; width: 100%; }
    .btn:hover { opacity: 0.85; transform: translateY(-1px); }
    .btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .btn-sm { background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); color: #818cf8; border-radius: 8px; padding: 7px 14px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
    .btn-sm:hover { background: rgba(99,102,241,0.2); }
    .btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

    /* FILTERS */
    .filters { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 22px; }
    .filter-btn { background: transparent; border: 1px solid var(--border); color: var(--dim); border-radius: 20px; padding: 5px 13px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .filter-btn.active { color: var(--text); border-color: var(--accent); background: rgba(99,102,241,0.1); }

    /* GROUPS & CARDS */
    .group { margin-bottom: 30px; animation: fadeUp 0.35s ease both; }
    .group-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .group-label { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
    .group-label.today { color: #818cf8; }
    .group-label.tomorrow { color: #f97316; }
    .group-label.default { color: var(--muted); }
    .group-line { flex: 1; height: 1px; background: var(--border); }
    .group-count { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--border); }
    .event-card { display: flex; align-items: flex-start; gap: 11px; padding: 12px 14px; border-radius: 10px; border-left: 3px solid; margin-bottom: 7px; cursor: default; transition: transform 0.15s, box-shadow 0.15s; }
    .event-card:hover { transform: translateX(4px); }
    .event-icon { font-size: 17px; line-height: 1.3; flex-shrink: 0; }
    .event-body { flex: 1; min-width: 0; }
    .event-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .event-meta { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--dim); margin-top: 3px; }
    .event-desc { font-size: 11px; color: var(--muted); margin-top: 3px; font-style: italic; }
    .badge { font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.06em; flex-shrink: 0; align-self: flex-start; margin-top: 1px; }

    /* STATES */
    .skeleton { height: 62px; background: var(--surface); border-radius: 10px; margin-bottom: 7px; animation: shimmer 1.4s ease infinite; }
    .error-box { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.25); border-radius: 10px; padding: 13px 16px; color: #fca5a5; font-size: 13px; margin-bottom: 20px; font-family: 'DM Mono', monospace; }
    .empty { text-align: center; color: var(--muted); padding: 60px 0; font-family: 'DM Mono', monospace; font-size: 13px; }
    .footer { text-align: center; color: var(--border); font-size: 11px; font-family: 'DM Mono', monospace; padding-top: 24px; border-top: 1px solid var(--border); }
    .hint { margin-top: 12px; font-size: 11px; color: var(--muted); line-height: 1.6; }
    .hint code { color: #818cf8; background: rgba(99,102,241,0.1); padding: 1px 5px; border-radius: 4px; }

    @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    @keyframes shimmer { 0%,100%{opacity:0.4} 50%{opacity:0.7} }
    @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
    .spinning { animation: spin 0.8s linear infinite; display: inline-block; }
    @media(max-width:480px){ .header-title{font-size:22px} .input-row label{display:none} }
  </style>
</head>
<body>
<div class="container">

  <div class="header">
    <div>
      <div class="header-title">Carl's Dashboard</div>
      <div class="header-sub" id="last-updated"><span class="dot"></span>Connecting...</div>
    </div>
    <button class="btn-sm" id="refresh-btn" onclick="loadEvents()" disabled>
      <span id="refresh-icon">↻</span> Refresh
    </button>
  </div>

  <div class="setup-card" id="setup-card">
    <h2>🔑 Connect Your Google Calendar</h2>
    <p>Enter your Google Calendar OAuth token to load your events. Stored in your browser only.</p>
    <div class="input-group">
      <div class="input-row">
        <label>GCal Token</label>
        <input type="password" id="gcal-token-input" placeholder="ya29.a0..." autocomplete="off" />
      </div>
      <button class="btn" onclick="saveAndLoad()">Connect & Load Events</button>
    </div>
    <p class="hint">
      Get token → <a href="https://developers.google.com/oauthplayground" target="_blank" style="color:#818cf8">OAuth Playground</a>
      → Select <code>Calendar API v3 → calendar.readonly</code> → Authorize → Exchange → copy <code>Access Token</code>
    </p>
  </div>

  <div class="error-box" id="error-box" style="display:none"></div>
  <div class="filters" id="filters" style="display:none"></div>
  <div id="events-container"></div>
  <div class="footer">X-17 Technologies · Auto-refreshes every 5 min</div>
</div>

<script>
  const CATEGORIES = {
    inventory: { label:"Inventory",  color:"#f97316", bg:"rgba(249,115,22,0.1)",  icon:"📦", kw:["inventory"] },
    deadline:  { label:"Deadlines",  color:"#ef4444", bg:"rgba(239,68,68,0.1)",   icon:"⏰", kw:["deadline","due date","due"] },
    report:    { label:"Reports",    color:"#a78bfa", bg:"rgba(167,139,250,0.1)", icon:"📤", kw:["send mas","mas"] },
    training:  { label:"Training",   color:"#22d3ee", bg:"rgba(34,211,238,0.1)",  icon:"🏋️", kw:["training","convention","zoom","renewal"] },
    personal:  { label:"Personal",   color:"#f472b6", bg:"rgba(244,114,182,0.1)", icon:"🎂", kw:["birthday"] },
    other:     { label:"Other",      color:"#64748b", bg:"rgba(100,116,139,0.1)", icon:"📅", kw:[] },
  };

  let allEvents = [], activeFilter = "all";

  function categorize(t=""){
    const l=t.toLowerCase();
    for(const[k,c]of Object.entries(CATEGORIES)) if(c.kw.some(w=>l.includes(w))) return k;
    return "other";
  }
  function daysFromNow(s){ const n=new Date();n.setHours(0,0,0,0);const d=new Date(s);d.setHours(0,0,0,0);return Math.round((d-n)/86400000); }
  function fmtDate(s){ return new Date(s).toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"}); }
  function fmtTime(s){ return new Date(s).toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"}); }
  function groupLabel(s){
    const d=daysFromNow(s);
    if(d===0) return "Today"; if(d===1) return "Tomorrow";
    if(d<=7) return "This Week"; if(d<=14) return "Next Week";
    return new Date(s).toLocaleDateString("en-PH",{month:"long",year:"numeric"});
  }

  function saveAndLoad(){
    const t=document.getElementById("gcal-token-input").value.trim();
    if(!t){ showError("Google Calendar token is required."); return; }
    sessionStorage.setItem("gcal_token",t);
    document.getElementById("setup-card").style.display="none";
    loadEvents();
  }

  async function loadEvents(){
    const token=sessionStorage.getItem("gcal_token");
    if(!token){ document.getElementById("setup-card").style.display="block"; return; }
    setLoading(true); clearError();
    const now=new Date(), end=new Date(); end.setDate(end.getDate()+45);
    try{
      const res=await fetch("/api/events",{
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ gcalToken:token, startTime:now.toISOString(), endTime:end.toISOString() })
      });
      const data=await res.json();
      if(data.error) throw new Error(JSON.stringify(data.error));
      allEvents=data.events||[];
      renderFilters(); renderEvents(); setLastUpdated();
    }catch(err){ showError("Failed to load: "+err.message); }
    finally{ setLoading(false); }
  }

  function renderFilters(){
    const el=document.getElementById("filters"); el.style.display="flex";
    const counts={};
    allEvents.forEach(ev=>{ const c=categorize(ev.summary); counts[c]=(counts[c]||0)+1; });
    let html=\`<button class="filter-btn \${activeFilter==="all"?"active":""}" onclick="setFilter('all')">All · \${allEvents.length}</button>\`;
    for(const[k,c]of Object.entries(CATEGORIES)){
      if(!counts[k]) continue;
      const isActive=activeFilter===k;
      html+=\`<button class="filter-btn \${isActive?"active":""}" onclick="setFilter('\${k}')"
        style="\${isActive?\`border-color:\${c.color};color:\${c.color};background:\${c.bg}\`:""}">\${c.icon} \${c.label} · \${counts[k]}</button>\`;
    }
    el.innerHTML=html;
  }

  function setFilter(f){ activeFilter=f; renderFilters(); renderEvents(); }

  function renderEvents(){
    const el=document.getElementById("events-container");
    const filtered=activeFilter==="all"?allEvents:allEvents.filter(ev=>categorize(ev.summary)===activeFilter);
    if(!filtered.length){ el.innerHTML='<div class="empty">No events found</div>'; return; }
    const groups={};
    filtered.forEach(ev=>{ const s=ev.start?.dateTime||ev.start?.date; const l=groupLabel(s); if(!groups[l]) groups[l]=[]; groups[l].push(ev); });
    const ORDER=["Today","Tomorrow","This Week","Next Week"];
    const keys=[...ORDER.filter(k=>groups[k]),...Object.keys(groups).filter(k=>!ORDER.includes(k))];
    let html="";
    keys.forEach((g,i)=>{
      const lc=g==="Today"?"today":g==="Tomorrow"?"tomorrow":"default";
      html+=\`<div class="group" style="animation-delay:\${i*0.05}s">
        <div class="group-header"><span class="group-label \${lc}">\${g}</span><div class="group-line"></div><span class="group-count">\${groups[g].length}</span></div>\`;
      groups[g].forEach(ev=>{ html+=renderCard(ev); });
      html+=\`</div>\`;
    });
    el.innerHTML=html;
  }

  function renderCard(ev){
    const cat=categorize(ev.summary), c=CATEGORIES[cat];
    const start=ev.start?.dateTime||ev.start?.date, isDateTime=!!ev.start?.dateTime, day=daysFromNow(start);
    const badge=day===0?\`<span class="badge" style="background:#ef4444;color:#fff">TODAY</span>\`
      :day===1?\`<span class="badge" style="background:#f97316;color:#fff">TOMORROW</span>\`:"";
    return \`<div class="event-card" style="background:\${c.bg};border-left-color:\${c.color}">
      <span class="event-icon">\${c.icon}</span>
      <div class="event-body">
        <div class="event-title">\${ev.summary||"Untitled"}</div>
        <div class="event-meta">\${fmtDate(start)}\${isDateTime?" · "+fmtTime(ev.start.dateTime):""}</div>
        \${ev.description?\`<div class="event-desc">\${ev.description}</div>\`:""}
      </div>\${badge}</div>\`;
  }

  function setLoading(on){
    const btn=document.getElementById("refresh-btn"), icon=document.getElementById("refresh-icon");
    btn.disabled=on; icon.className=on?"spinning":""; icon.textContent="↻";
    if(on&&allEvents.length===0) document.getElementById("events-container").innerHTML=Array(6).fill('<div class="skeleton"></div>').join("");
  }
  function setLastUpdated(){
    const t=new Date().toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"});
    document.getElementById("last-updated").innerHTML=\`<span class="dot"></span>Updated \${t} · Auto-refreshes every 5 min\`;
    document.getElementById("refresh-btn").disabled=false;
  }
  function showError(m){ const e=document.getElementById("error-box"); e.textContent="⚠️ "+m; e.style.display="block"; }
  function clearError(){ document.getElementById("error-box").style.display="none"; }

  window.addEventListener("DOMContentLoaded",()=>{
    if(sessionStorage.getItem("gcal_token")){ document.getElementById("setup-card").style.display="none"; loadEvents(); }
    setInterval(loadEvents, 5*60*1000);
  });
</script>
</body>
</html>`;

// ─── ROUTES ─────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send(HTML));

app.post("/api/events", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set in Railway variables" });

  const { gcalToken, startTime, endTime } = req.body;
  if (!gcalToken) return res.status(400).json({ error: "Missing gcalToken" });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        system: "You are a calendar assistant. Use the Google Calendar MCP tool to list events. Return ONLY a valid JSON array with no extra text or markdown. Each event must have: id, summary, start (dateTime or date), end (dateTime or date), description (optional).",
        messages: [{ role: "user", content: `List all calendar events from ${startTime} to ${endTime}. Return only a JSON array.` }],
        mcp_servers: [{
          type: "url",
          url: "https://calendarmcp.googleapis.com/mcp/v1",
          name: "google-calendar",
          authorization_token: gcalToken,
        }],
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data });

    const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return res.json({ events: [] });

    const events = JSON.parse(match[0]);
    events.sort((a, b) => new Date(a.start?.dateTime || a.start?.date) - new Date(b.start?.dateTime || b.start?.date));
    res.json({ events });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
