const express = require("express");
const app = express();
app.use(express.json());

// ─── AUTO-REFRESH ACCESS TOKEN ────────────────────────────────────────────────
let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN } = process.env;
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN)
    throw new Error("Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET or GOOGLE_REFRESH_TOKEN in Railway Variables");

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
  tokenExpiry = Date.now() + data.expires_in * 1000;
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

    /* HEADER */
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; gap: 12px; }
    .header-title { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 28px; letter-spacing: -0.03em;
      background: linear-gradient(135deg, #f1f5f9 20%, #94a3b8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
    .header-sub { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-top: 5px; }
    .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #22c55e; margin-right: 6px; animation: pulse-dot 2s ease infinite; }
    @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.8)} }

    /* TABS */
    .tabs { display: flex; gap: 4px; margin-bottom: 24px; background: var(--surface); border-radius: 10px; padding: 4px; border: 1px solid var(--border); width: fit-content; }
    .tab { font-family: 'DM Mono', monospace; font-size: 12px; padding: 7px 18px; border-radius: 7px; border: none; background: transparent; color: var(--dim); cursor: pointer; transition: all 0.2s; }
    .tab.active { background: var(--accent); color: #fff; }

    /* FILTERS */
    .filters { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 22px; }
    .filter-btn { background: transparent; border: 1px solid var(--border); color: var(--dim); border-radius: 20px; padding: 5px 13px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
    .filter-btn.active { color: var(--text); border-color: var(--accent); background: rgba(99,102,241,0.1); }

    .btn-sm { background: rgba(99,102,241,0.12); border: 1px solid rgba(99,102,241,0.25); color: #818cf8; border-radius: 8px; padding: 7px 14px; font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.2s; white-space: nowrap; display: flex; align-items: center; gap: 5px; }
    .btn-sm:hover { background: rgba(99,102,241,0.2); }
    .btn-sm:disabled { opacity: 0.4; cursor: not-allowed; }

    /* GROUPS & CARDS */
    .group { margin-bottom: 30px; animation: fadeUp 0.35s ease both; }
    .group-header { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .group-label { font-family: 'Syne', sans-serif; font-weight: 800; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; }
    .group-label.today { color: #818cf8; } .group-label.tomorrow { color: #f97316; } .group-label.default { color: var(--muted); } .group-label.overdue { color: #ef4444; }
    .group-line { flex: 1; height: 1px; background: var(--border); }
    .group-count { font-family: 'DM Mono', monospace; font-size: 10px; color: var(--border); }

    .event-card { display: flex; align-items: flex-start; gap: 11px; padding: 12px 14px; border-radius: 10px; border-left: 3px solid; margin-bottom: 7px; cursor: default; transition: transform 0.15s; }
    .event-card:hover { transform: translateX(4px); }
    .event-icon { font-size: 17px; line-height: 1.3; flex-shrink: 0; }
    .event-body { flex: 1; min-width: 0; }
    .event-title { font-family: 'Syne', sans-serif; font-weight: 700; font-size: 13.5px; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .event-title.completed { text-decoration: line-through; color: var(--muted); }
    .event-meta { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--dim); margin-top: 3px; }
    .event-desc { font-size: 11px; color: var(--muted); margin-top: 3px; font-style: italic; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .badge { font-family: 'DM Mono', monospace; font-size: 9px; font-weight: 600; padding: 2px 7px; border-radius: 4px; letter-spacing: 0.06em; flex-shrink: 0; align-self: flex-start; margin-top: 1px; }
    .tasklist-badge { font-family: 'DM Mono', monospace; font-size: 9px; padding: 1px 6px; border-radius: 10px; background: rgba(99,102,241,0.15); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); margin-top: 3px; display: inline-block; }

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
    <button class="btn-sm" id="refresh-btn" onclick="loadAll()" disabled>
      <span id="refresh-icon">↻</span> Refresh
    </button>
  </div>

  <!-- TABS -->
  <div class="tabs">
    <button class="tab active" id="tab-events" onclick="switchTab('events')">📅 Events</button>
    <button class="tab" id="tab-tasks" onclick="switchTab('tasks')">✅ Tasks</button>
  </div>

  <div class="error-box" id="error-box" style="display:none"></div>

  <!-- EVENTS PANEL -->
  <div id="panel-events">
    <div class="filters" id="filters-events"></div>
    <div id="events-container"></div>
  </div>

  <!-- TASKS PANEL -->
  <div id="panel-tasks" style="display:none">
    <div class="filters" id="filters-tasks"></div>
    <div id="tasks-container"></div>
  </div>

  <div class="footer">Carl's Dashboard · X-17 Technologies · Auto-refreshes every 5 min</div>
</div>

<script>
  // ── CATEGORIES ───────────────────────────────────────────────────
  const CATS = {
    inventory: { label:"Inventory",  color:"#f97316", bg:"rgba(249,115,22,0.1)",  icon:"📦", kw:["inventory"] },
    deadline:  { label:"Deadlines",  color:"#ef4444", bg:"rgba(239,68,68,0.1)",   icon:"⏰", kw:["deadline","due date","due"] },
    report:    { label:"Reports",    color:"#a78bfa", bg:"rgba(167,139,250,0.1)", icon:"📤", kw:["send mas","mas"] },
    training:  { label:"Training",   color:"#22d3ee", bg:"rgba(34,211,238,0.1)",  icon:"🏋️", kw:["training","convention","zoom","renewal"] },
    personal:  { label:"Personal",   color:"#f472b6", bg:"rgba(244,114,182,0.1)", icon:"🎂", kw:["birthday"] },
    other:     { label:"Other",      color:"#64748b", bg:"rgba(100,116,139,0.1)", icon:"📅", kw:[] },
  };

  let allEvents=[], allTasks=[], activeTab="events", activeEventFilter="all", activeTaskFilter="all";

  // ── HELPERS ──────────────────────────────────────────────────────
  const cat = t => { const l=(t||"").toLowerCase(); for(const[k,c]of Object.entries(CATS)) if(c.kw.some(w=>l.includes(w))) return k; return "other"; };
  const days = s => { const n=new Date();n.setHours(0,0,0,0);const d=new Date(s);d.setHours(0,0,0,0);return Math.round((d-n)/86400000); };
  const fmtD = s => new Date(s).toLocaleDateString("en-PH",{weekday:"short",month:"short",day:"numeric"});
  const fmtT = s => new Date(s).toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"});
  const grpLabel = (s, allowPast=false) => {
    const d=days(s);
    if(allowPast && d<0) return "Overdue";
    if(d===0)return"Today"; if(d===1)return"Tomorrow";
    if(d<=7)return"This Week"; if(d<=14)return"Next Week";
    return new Date(s).toLocaleDateString("en-PH",{month:"long",year:"numeric"});
  };

  // ── TAB SWITCH ───────────────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    document.getElementById("panel-events").style.display = tab==="events"?"block":"none";
    document.getElementById("panel-tasks").style.display  = tab==="tasks"?"block":"none";
    document.getElementById("tab-events").className = "tab" + (tab==="events"?" active":"");
    document.getElementById("tab-tasks").className  = "tab" + (tab==="tasks"?" active":"");
  }

  // ── LOAD ALL ─────────────────────────────────────────────────────
  async function loadAll() {
    setLoading(true); clearErr();
    const now=new Date(), end=new Date(); end.setDate(end.getDate()+45);
    try {
      const [evRes, tkRes] = await Promise.all([
        fetch("/api/events",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ timeMin:now.toISOString(), timeMax:end.toISOString() }) }),
        fetch("/api/tasks",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({}) })
      ]);
      const evData = await evRes.json();
      const tkData = await tkRes.json();
      if (evData.error) throw new Error("Events: " + evData.error);
      if (tkData.error) throw new Error("Tasks: " + tkData.error);
      allEvents = evData.events || [];
      allTasks  = tkData.tasks  || [];
      renderEventFilters(); renderEvents();
      renderTaskFilters();  renderTasks();
      setUpdated();
    } catch(e) { showErr(e.message); }
    finally { setLoading(false); }
  }

  // ── EVENTS ───────────────────────────────────────────────────────
  function renderEventFilters() {
    const el=document.getElementById("filters-events");
    const cnt={}; allEvents.forEach(ev=>{ const c=cat(ev.summary); cnt[c]=(cnt[c]||0)+1; });
    let h=\`<button class="filter-btn \${activeEventFilter==="all"?"active":""}" onclick="setEvFilter('all')">All · \${allEvents.length}</button>\`;
    for(const[k,c]of Object.entries(CATS)){
      if(!cnt[k]) continue; const on=activeEventFilter===k;
      h+=\`<button class="filter-btn \${on?"active":""}" onclick="setEvFilter('\${k}')" style="\${on?\`border-color:\${c.color};color:\${c.color};background:\${c.bg}\`:""}">\${c.icon} \${c.label} · \${cnt[k]}</button>\`;
    }
    el.innerHTML=h;
  }
  function setEvFilter(f){ activeEventFilter=f; renderEventFilters(); renderEvents(); }

  function renderEvents() {
    const el=document.getElementById("events-container");
    const list=activeEventFilter==="all"?allEvents:allEvents.filter(ev=>cat(ev.summary)===activeEventFilter);
    if(!list.length){ el.innerHTML='<div class="empty">No upcoming events</div>'; return; }
    const grps={};
    list.forEach(ev=>{ const s=ev.start?.dateTime||ev.start?.date; const l=grpLabel(s); if(!grps[l])grps[l]=[]; grps[l].push(ev); });
    const ORDER=["Today","Tomorrow","This Week","Next Week"];
    const keys=[...ORDER.filter(k=>grps[k]),...Object.keys(grps).filter(k=>!ORDER.includes(k))];
    let h="";
    keys.forEach((g,i)=>{
      const lc=g==="Today"?"today":g==="Tomorrow"?"tomorrow":"default";
      h+=\`<div class="group" style="animation-delay:\${i*0.05}s"><div class="group-header"><span class="group-label \${lc}">\${g}</span><div class="group-line"></div><span class="group-count">\${grps[g].length}</span></div>\`;
      grps[g].forEach(ev=>{ h+=eventCard(ev); });
      h+=\`</div>\`;
    });
    el.innerHTML=h;
  }

  function eventCard(ev) {
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

  // ── TASKS ────────────────────────────────────────────────────────
  function renderTaskFilters() {
    const el=document.getElementById("filters-tasks");
    const lists=[...new Set(allTasks.map(t=>t.listTitle))];
    let h=\`<button class="filter-btn \${activeTaskFilter==="all"?"active":""}" onclick="setTkFilter('all')">All · \${allTasks.length}</button>\`;
    lists.forEach(l=>{
      const cnt=allTasks.filter(t=>t.listTitle===l).length;
      const on=activeTaskFilter===l;
      h+=\`<button class="filter-btn \${on?"active":""}" onclick="setTkFilter('\${l.replace(/'/g,"\\\\'")}')" style="\${on?"border-color:#6366f1;color:#818cf8;background:rgba(99,102,241,0.1)":""}">📋 \${l} · \${cnt}</button>\`;
    });
    el.innerHTML=h;
  }
  function setTkFilter(f){ activeTaskFilter=f; renderTaskFilters(); renderTasks(); }

  function renderTasks() {
    const el=document.getElementById("tasks-container");
    const list=activeTaskFilter==="all"?allTasks:allTasks.filter(t=>t.listTitle===activeTaskFilter);
    if(!list.length){ el.innerHTML='<div class="empty">No tasks found</div>'; return; }

    // Group: Overdue, Today, no-due (No Due Date), future
    const grps={}, noDue=[];
    list.forEach(t=>{
      if(!t.due){ noDue.push(t); return; }
      const l=grpLabel(t.due, true);
      if(!grps[l])grps[l]=[];
      grps[l].push(t);
    });
    if(noDue.length) grps["No Due Date"]=noDue;

    const ORDER=["Overdue","Today","Tomorrow","This Week","Next Week","No Due Date"];
    const keys=[...ORDER.filter(k=>grps[k]),...Object.keys(grps).filter(k=>!ORDER.includes(k))];
    let h="";
    keys.forEach((g,i)=>{
      const lc=g==="Today"?"today":g==="Tomorrow"?"tomorrow":g==="Overdue"?"overdue":"default";
      h+=\`<div class="group" style="animation-delay:\${i*0.05}s"><div class="group-header"><span class="group-label \${lc}">\${g}</span><div class="group-line"></div><span class="group-count">\${grps[g].length}</span></div>\`;
      grps[g].forEach(t=>{ h+=taskCard(t); });
      h+=\`</div>\`;
    });
    el.innerHTML=h;
  }

  function taskCard(t) {
    const done=t.status==="completed";
    const color=done?"#64748b":"#22d3ee";
    const bg=done?"rgba(100,116,139,0.07)":"rgba(34,211,238,0.08)";
    const icon=done?"✅":"⬜";
    const dueStr=t.due?\`Due \${fmtD(t.due)}\`:"No due date";
    const d=t.due?days(t.due):null;
    const badge=d===0?\`<span class="badge" style="background:#ef4444;color:#fff">TODAY</span>\`
      :d===1?\`<span class="badge" style="background:#f97316;color:#fff">TOMORROW</span>\`
      :(d!==null&&d<0)?\`<span class="badge" style="background:#7f1d1d;color:#fca5a5">OVERDUE</span>\`:"";
    return \`<div class="event-card" style="background:\${bg};border-left-color:\${color}">
      <span class="event-icon">\${icon}</span>
      <div class="event-body">
        <div class="event-title \${done?"completed":""}">\${t.title||"Untitled"}</div>
        <div class="event-meta">\${dueStr}</div>
        <span class="tasklist-badge">\${t.listTitle}</span>
        \${t.notes?\`<div class="event-desc">\${t.notes}</div>\`:""}
      </div>\${badge}</div>\`;
  }

  // ── UI HELPERS ───────────────────────────────────────────────────
  function setLoading(on) {
    const btn=document.getElementById("refresh-btn"),icon=document.getElementById("refresh-icon");
    btn.disabled=on; icon.className=on?"spinning":""; icon.textContent="↻";
    if(on&&allEvents.length===0) document.getElementById("events-container").innerHTML=Array(5).fill('<div class="skeleton"></div>').join("");
    if(on&&allTasks.length===0)  document.getElementById("tasks-container").innerHTML=Array(5).fill('<div class="skeleton"></div>').join("");
  }
  function setUpdated() {
    const t=new Date().toLocaleTimeString("en-PH",{hour:"2-digit",minute:"2-digit"});
    document.getElementById("last-updated").innerHTML=\`<span class="dot"></span>Updated \${t} · Auto-refreshes every 5 min\`;
    document.getElementById("refresh-btn").disabled=false;
  }
  function showErr(m){ const e=document.getElementById("error-box"); e.innerHTML="⚠️ "+m; e.style.display="block"; }
  function clearErr(){ document.getElementById("error-box").style.display="none"; }

  window.addEventListener("DOMContentLoaded",()=>{
    loadAll();
    setInterval(loadAll, 5*60*1000);
  });
</script>
</body>
</html>`;

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get("/", (req, res) => res.send(HTML));

// Google Calendar Events
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
    const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || String(r.status) });
    res.json({ events: data.items || [] });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Google Tasks — fetches all task lists then all tasks
app.post("/api/tasks", async (req, res) => {
  try {
    const token = await getAccessToken();

    // Get all task lists
    const listsRes = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists?maxResults=20", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const listsData = await listsRes.json();
    if (!listsRes.ok) return res.status(listsRes.status).json({ error: listsData?.error?.message || "Failed to fetch task lists" });

    const lists = listsData.items || [];

    // Fetch tasks from all lists in parallel
    const taskArrays = await Promise.all(lists.map(async (list) => {
      const r = await fetch(
        `https://tasks.googleapis.com/tasks/v1/lists/${list.id}/tasks?maxResults=100&showCompleted=true&showHidden=false`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const d = await r.json();
      return (d.items || []).map(t => ({ ...t, listTitle: list.title }));
    }));

    const tasks = taskArrays.flat().filter(t => t.title && t.status !== "completed" || (t.status === "completed" && t.due));
    tasks.sort((a, b) => {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });

    res.json({ tasks });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
