/* Fiber Power Computing — front-end prototype.
   All calculations are estimates. Validate real designs with manufacturer data and field measurements. */
(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORE = "fiber-power-computing-v1";
  const defaultState = {
    theme: "dark",
    activeProjectId: "p1",
    projects: [{
      id:"p1", name:"Barangay Canayonan FTTH", location:"Canayonan", target:64, pon:"GPON",
      status:"Planning", created:new Date().toISOString(),
      olt:{name:"OLT-01",manufacturer:"Generic / editable",model:"GPON OLT",ponPorts:4,txPower:4,rxSensitivity:-28,rxOverload:-8},
      network:{primaryRatio:4,secondaryRatio:8,naps:4,portsPerNap:8,clients:48},
      calculator:{txPower:4,splitterRatio:16,fiberKm:5.2,attenuation:.35,connectorLoss:1,connectorCount:2,spliceLoss:.1,spliceCount:4,otherLoss:1,margin:1},
      clientsList:[
        {id:"c1",name:"Client-001",nap:"NAP-329-B1",port:1,dropKm:.12,measured:-17.2},
        {id:"c2",name:"Client-002",nap:"NAP-329-B1",port:2,dropKm:.18,measured:null},
        {id:"c3",name:"Client-003",nap:"NAP-329-B2",port:1,dropKm:.25,measured:null}
      ],
      napsList:[
        {id:"n1",name:"NAP-329-B1",parent:"Primary splitter",ratio:8,ports:8,assigned:6,lengthKm:1.2},
        {id:"n2",name:"NAP-329-B2",parent:"Primary splitter",ratio:8,ports:8,assigned:4,lengthKm:1.8},
        {id:"n3",name:"NAP-329-B3",parent:"Primary splitter",ratio:8,ports:8,assigned:7,lengthKm:2.1},
        {id:"n4",name:"NAP-329-B4",parent:"Primary splitter",ratio:8,ports:8,assigned:3,lengthKm:2.4}
      ]
    }]
  };
  let state = loadState();
  let currentView = "dashboard";
  let calcTab = "downstream";
  let projectSearch = "";

  function loadState(){
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if(saved && Array.isArray(saved.projects) && saved.projects.length) return {...defaultState,...saved};
    } catch(e) { console.warn("Saved data could not be loaded", e); }
    return structuredClone(defaultState);
  }
  function saveState(){ localStorage.setItem(STORE, JSON.stringify(state)); }
  function activeProject(){
    return state.projects.find(p=>p.id===state.activeProjectId) || state.projects[0];
  }
  function esc(s){return String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
  function fmt(n,d=1){return Number.isFinite(Number(n))?Number(n).toFixed(d):"—";}
  function ratioLoss(ratio){return 10*Math.log10(Number(ratio));}
  function calcLoss(p, includeMargin=true, includeDropKm=0){
    const c=p.calculator;
    const split=ratioLoss(Number(c.splitterRatio)||1);
    const fiber=Math.max(0,Number(c.fiberKm)||0)*Math.max(0,Number(c.attenuation)||0)
      + Math.max(0,Number(includeDropKm)||0)*Math.max(0,Number(c.attenuation)||0);
    const connectors=Math.max(0,Number(c.connectorLoss)||0)*Math.max(0,Number(c.connectorCount)||0);
    const splices=Math.max(0,Number(c.spliceLoss)||0)*Math.max(0,Number(c.spliceCount)||0);
    const other=Math.max(0,Number(c.otherLoss)||0);
    const margin=includeMargin?Math.max(0,Number(c.margin)||0):0;
    return {split,fiber,connectors,splices,other,margin,total:split+fiber+connectors+splices+other+margin,received:Number(c.txPower)-split-fiber-connectors-splices-other-margin};
  }
  function showToast(message){
    const dlg=$("#toastDialog"); $("#toastMessage").textContent=message;
    if(typeof dlg.showModal==="function") dlg.showModal(); else alert(message);
  }
  function closeDialog(id){const d=$("#"+id);if(d?.open)d.close();}
  function setTheme(theme){
    state.theme=theme; document.documentElement.dataset.theme=theme; saveState();
    $("#themeBtn").textContent=theme==="dark"?"☼":"☾";
    $("#themeBtn").title=theme==="dark"?"Switch to light mode":"Switch to dark mode";
    const meta=$('meta[name="theme-color"]'); if(meta)meta.content=theme==="dark"?"#171713":"#f1f0ec";
  }
  function setView(view){
    currentView=view; $("#sidebar").classList.remove("open");
    $$(".nav-item[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    $("#pageTitle").textContent=({dashboard:"Dashboard",projects:"Projects",topology:"Network topology",calculator:"Power calculator",optimizer:"Ratio optimizer",naps:"NAP & ports",clients:"Target clients",reports:"Reports & export",settings:"Settings"})[view]||"Dashboard";
    render();
    $("#viewRoot").focus({preventScroll:true});
  }
  function heading(eyebrow,title,desc,actions=""){
    return `<div class="page-heading"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p>${desc}</p></div><div class="button-row">${actions}</div></div>`;
  }
  function cardHead(title,sub="",action=""){
    return `<div class="card-head"><div><h2>${title}</h2>${sub?`<div class="small-text muted">${sub}</div>`:""}</div>${action}</div>`;
  }
  function projectRow(p){
    const pct=Math.min(100,Math.round((Number(p.network.clients)||0)/Math.max(1,Number(p.target)||1)*100));
    return `<div class="project-row" data-project-open="${esc(p.id)}" role="button" tabindex="0">
      <div class="project-symbol">⌘</div><div class="project-info"><b>${esc(p.name)}</b><small>${esc(p.location||"Location not set")} · ${esc(p.pon||"PON")}</small><div class="progress" style="margin-top:8px"><span style="width:${pct}%"></span></div></div>
      <div><span class="tag ${p.status==="Active"?"good":"warn"}">${esc(p.status||"Planning")}</span><small class="muted" style="display:block;text-align:right;margin-top:5px">${pct}%</small></div></div>`;
  }
  function renderDashboard(){
    const p=activeProject(), loss=calcLoss(p), used=p.napsList.reduce((s,n)=>s+Number(n.assigned||0),0), ports=p.napsList.reduce((s,n)=>s+Number(n.ports||0),0);
    const totalClients=p.network.clients||0, target=p.target||1;
    return `${heading("OVERVIEW","Good planning starts here.","Design, calculate and optimize your fiber network from one mobile-friendly workspace.",`<button class="btn primary" data-action="new-project">＋ New project</button>`)}
      <div class="grid stats-grid">
        <div class="card"><div class="stat-top"><span class="stat-label">Target clients</span><span class="stat-icon">♙</span></div><div class="stat-value">${totalClients}<span class="muted" style="font-size:15px"> / ${target}</span></div><div class="stat-foot">Configured in active project</div></div>
        <div class="card"><div class="stat-top"><span class="stat-label">NAP ports assigned</span><span class="stat-icon">▣</span></div><div class="stat-value">${used}<span class="muted" style="font-size:15px"> / ${ports}</span></div><div class="stat-foot">${Math.max(0,ports-used)} listed ports unassigned</div></div>
        <div class="card"><div class="stat-top"><span class="stat-label">Estimated received power</span><span class="stat-icon">∿</span></div><div class="stat-value">${fmt(loss.received)} <span style="font-size:14px">dBm</span></div><div class="stat-foot">Sample path · ${fmt(loss.total)} dB total loss</div></div>
        <div class="card"><div class="stat-top"><span class="stat-label">PON ports</span><span class="stat-icon">⌘</span></div><div class="stat-value">${p.olt.ponPorts}</div><div class="stat-foot">${esc(p.pon)} · equipment profile editable</div></div>
      </div>
      <div class="grid layout-main">
        <section class="card">${cardHead("Recent projects","Select a project to make it active.",`<button class="btn small secondary" data-view="projects">View all</button>`)}
          <div class="project-list">${state.projects.slice(0,4).map(projectRow).join("")}</div>
        </section>
        <section class="card">${cardHead("Quick actions","Go directly to a workflow")}
          <div class="grid quick-grid">
            <button class="quick-action" data-view="topology"><span class="stat-icon">⌘</span><span><b>Build topology</b><small>Inspect branches and NAPs</small></span></button>
            <button class="quick-action" data-view="calculator"><span class="stat-icon">∑</span><span><b>Calculate power</b><small>Review optical losses</small></span></button>
            <button class="quick-action" data-view="optimizer"><span class="stat-icon">✧</span><span><b>Optimize ratio</b><small>Compare split designs</small></span></button>
            <button class="quick-action" data-view="reports"><span class="stat-icon">▧</span><span><b>Export report</b><small>Save project data</small></span></button>
          </div>
        </section>
      </div>
      <section class="card" style="margin-top:16px">${cardHead("Active project","Current working context",`<button class="btn small ghost" data-view="settings">Project settings</button>`)}
        <div class="grid quick-grid"><div><div class="muted small-text">PROJECT</div><h3>${esc(p.name)}</h3><p class="small-text">${esc(p.location||"Location not specified")} · ${esc(p.pon)}</p></div>
        <div><div class="muted small-text">CLIENT PLAN</div><div class="progress" style="margin:10px 0"><span style="width:${Math.min(100,totalClients/target*100)}%"></span></div><div class="small-text muted">${Math.round(totalClients/target*100)}% of target client count</div></div></div>
      </section>`;
  }
  function renderProjects(){
    const list=state.projects.filter(p=>(p.name+" "+p.location).toLowerCase().includes(projectSearch.toLowerCase()));
    return `${heading("WORKSPACE","Projects","Keep separate plans for each barangay, OLT site or expansion phase.",`<button class="btn primary" data-action="new-project">＋ Create project</button>`)}
      <div class="card">${cardHead("Your projects",`${state.projects.length} project(s)`)}
      <input class="search" id="projectSearch" placeholder="Search project or location…" value="${esc(projectSearch)}" aria-label="Search projects">
      <div class="project-list" style="margin-top:14px">${list.length?list.map(p=>projectRow(p)).join(""):`<div class="empty"><strong>No matching projects</strong>Try a different search term.</div>`}</div></div>`;
  }
  function renderTopology(){
    const p=activeProject(), ratio=p.network.primaryRatio, sec=p.network.secondaryRatio;
    const branches=Array.from({length:Math.min(8,Math.max(2,Number(p.network.naps)||4))},(_,i)=>{
      const nap=p.napsList[i];
      return `<div class="branch"><div class="connector"></div><div class="node"><strong>${esc(nap?.name||`NAP-${i+1}`)}</strong><small>${nap?esc(nap.parent):"New branch"} · 1:${sec}</small></div><div class="connector"></div><div class="node nap"><strong>Ports ${nap?nap.ports:p.network.portsPerNap}</strong><small>${nap?nap.assigned:0} assigned</small></div><div class="connector"></div><div class="node client"><strong>Target clients</strong><small>Trace path →</small></div></div>`;
    }).join("");
    return `${heading("DESIGN WORKSPACE","Network topology","A simplified interactive preview of your current project hierarchy.",`<button class="btn secondary" data-action="edit-topology">Edit topology</button><button class="btn primary" data-view="optimizer">Optimize design</button>`)}
      <div class="grid layout-main"><section class="card">${cardHead("Logical connection map","Illustrative topology · not a GIS survey")}
        <div class="topology"><div class="tree"><div class="node"><strong>${esc(p.olt.name||"OLT-01")}</strong><small>${esc(p.pon)} · PON port</small></div><div class="connector"></div><div class="node"><strong>Primary splitter 1:${ratio}</strong><small>Upstream distribution</small></div><div class="branch-row">${branches}</div></div></div>
        <p class="small-text muted">Diagram is a planning visualization. Confirm every physical connection and output-port mapping before installation.</p></section>
      <section class="card">${cardHead("Topology settings","Edit the active project's sample design")}
        <form id="topologyForm" class="form-grid">
          <div class="field"><label>Primary splitter ratio</label><select name="primaryRatio">${[2,4,8,16,32].map(n=>`<option ${ratio==n?"selected":""}>${n}</option>`).join("")}</select></div>
          <div class="field"><label>Secondary splitter ratio</label><select name="secondaryRatio">${[2,4,8,16,32].map(n=>`<option ${sec==n?"selected":""}>${n}</option>`).join("")}</select></div>
          <div class="field"><label>NAP branches</label><input name="naps" type="number" min="1" max="8" value="${p.network.naps}"></div>
          <div class="field"><label>Ports per NAP</label><select name="portsPerNap">${[4,8,12,16,24].map(n=>`<option ${p.network.portsPerNap==n?"selected":""}>${n}</option>`).join("")}</select></div>
          <div class="field"><label>Target clients</label><input name="clients" type="number" min="1" max="10000" value="${p.network.clients}"></div>
          <div class="field" style="align-self:end"><button class="btn primary" type="submit">Save topology</button></div>
        </form></section></div>`;
  }
  function renderCalculator(){
    const p=activeProject(), c=p.calculator, r=calcLoss(p,true), raw=calcLoss(p,false);
    const rxMin=Number(p.olt.rxSensitivity ?? -28), rxMax=Number(p.olt.rxOverload ?? -8);
    const status=r.received<rxMin?"Below sensitivity":r.received>rxMax?"Potential overload":"Within configured limits";
    const statusClass=r.received<rxMin||r.received>rxMax?"bad":"good";
    return `${heading("OPTICAL ENGINE","Power calculator","Edit path assumptions and inspect a transparent dB loss breakdown.",`<button class="btn secondary" data-action="reset-calculator">Reset sample</button>`)}
      <div class="segmented" role="tablist" aria-label="Optical direction"><button data-calc-tab="downstream" class="${calcTab==="downstream"?"active":""}">Downstream</button><button data-calc-tab="upstream" class="${calcTab==="upstream"?"active":""}">Upstream</button></div>
      <div class="grid layout-main" style="margin-top:16px"><section class="card">${cardHead("Path inputs","Use actual equipment and measured route data where available")}
        <form id="calculatorForm" class="form-grid">
          ${field("OLT transmit power (dBm)","txPower",c.txPower,"number","0.1")}
          ${field("Splitter ratio (1:N)","splitterRatio",c.splitterRatio,"select",[2,4,8,16,32,64])}
          ${field("Main fiber length (km)","fiberKm",c.fiberKm,"number","0.01")}
          ${field("Fiber attenuation (dB/km)","attenuation",c.attenuation,"number","0.01")}
          ${field("Loss per connector (dB)","connectorLoss",c.connectorLoss,"number","0.1")}
          ${field("Connector count","connectorCount",c.connectorCount,"number","1")}
          ${field("Loss per splice (dB)","spliceLoss",c.spliceLoss,"number","0.1")}
          ${field("Splice count","spliceCount",c.spliceCount,"number","1")}
          ${field("Other passive loss (dB)","otherLoss",c.otherLoss,"number","0.1")}
          ${field("Engineering margin (dB)","margin",c.margin,"number","0.1")}
          <div class="field" style="grid-column:1/-1"><button class="btn primary" type="submit">Calculate optical budget</button></div>
        </form></section>
      <section class="card">${cardHead("Calculated result","ESTIMATE — not a measured reading")}
        <div class="result-box"><div class="muted small-text">Estimated ${calcTab} received power</div><div class="result-number ${statusClass==="good"?"result-good":"result-bad"}">${fmt(r.received)} dBm</div><span class="tag ${statusClass}">${status}</span><p class="small-text muted">Configured receiver range: ${fmt(rxMin)} to ${fmt(rxMax)} dBm. Confirm the actual module datasheet and direction-specific budget.</p></div>
        <div class="loss-list" style="margin-top:18px">
          ${lossRow("Splitter insertion loss",r.split)}${lossRow("Fiber loss",r.fiber)}${lossRow("Connector loss",r.connectors)}${lossRow("Splice loss",r.splices)}${lossRow("Other loss",r.other)}${lossRow("Engineering margin",r.margin)}
          <div class="loss-row"><strong>Total design budget</strong><strong>${fmt(r.total)} dB</strong></div>
          <div class="loss-row"><span>Received power before margin</span><strong>${fmt(Number(c.txPower)-(raw.total))} dBm</strong></div>
        </div>
        <div class="result-box" style="margin-top:15px"><div class="muted small-text">Formula</div><code>Received dBm = Tx dBm − total path loss dB</code></div>
        <p class="small-text muted">Prototype simplification: the same editable path assumptions are shown for both tabs. A production version must use separate upstream/downstream wavelengths, transmitter values, receiver limits and component losses.</p>
      </section></div>`;
  }
  function field(label,name,value,type="number",extra="0.1"){
    if(type==="select")return `<div class="field"><label>${label}</label><select name="${name}">${extra.map(n=>`<option value="${n}" ${Number(value)===n?"selected":""}>1:${n}</option>`).join("")}</select></div>`;
    return `<div class="field"><label>${label}</label><input name="${name}" type="${type}" step="${extra}" value="${esc(value)}" required></div>`;
  }
  function lossRow(name,value){return `<div class="loss-row"><span>${name}</span><strong>${fmt(value)} dB</strong></div>`;}
  function renderOptimizer(){
    const p=activeProject(), c=p.calculator, target=Number(p.target)||64;
    const options=[
      {name:"1:16 single-stage",split:16,stages:"One splitter",cost:1,ratio:16},
      {name:"1:32 single-stage",split:32,stages:"One splitter",cost:1.25,ratio:32},
      {name:"1:4 → 1:8 cascade",split:32,stages:"Two splitter stages",cost:1.5,ratio:32,splitLoss:ratioLoss(4)+ratioLoss(8)},
      {name:"1:4 → 1:16 cascade",split:64,stages:"Two splitter stages",cost:1.8,ratio:64,splitLoss:ratioLoss(4)+ratioLoss(16)}
    ];
    const valid=options.map(o=>{
      const splitLoss=o.splitLoss??ratioLoss(o.split);
      const total=splitLoss+(Number(c.fiberKm)||0)*(Number(c.attenuation)||0)+(Number(c.connectorLoss)||0)*(Number(c.connectorCount)||0)+(Number(c.spliceLoss)||0)*(Number(c.spliceCount)||0)+(Number(c.otherLoss)||0)+(Number(c.margin)||0);
      const rx=Number(c.txPower)-total;
      const powerValid=rx>=Number(p.olt.rxSensitivity??-28)&&rx<=Number(p.olt.rxOverload??-8);
      const capacity=o.split>=target;
      return {...o,splitLoss,total,rx,powerValid,capacity,valid:powerValid&&capacity};
    });
    const recommended=[...valid].filter(x=>x.valid).sort((a,b)=>a.cost-b.cost||a.total-b.total)[0];
    const chosen=recommended||[...valid].sort((a,b)=>(Number(b.powerValid)-Number(a.powerValid))||Math.abs(a.split-target)-Math.abs(b.split-target))[0];
    return `${heading("DESIGN ASSISTANT","Ratio optimizer","Compare illustrative splitter candidates against your current path assumptions.",`<button class="btn secondary" data-view="calculator">Edit power inputs</button>`)}
      <div class="recommendation"><p class="eyebrow">${recommended?"RECOMMENDED FEASIBLE CANDIDATE":"REVIEW REQUIRED"}</p><h2>${esc(chosen.name)}</h2><p>${recommended?"This candidate meets the simplified configured power range and target split capacity. Confirm actual output-port loss and the full PON design budget.":"No candidate passes all simplified constraints. Review the target, power assumptions and equipment profile before choosing a design."}</p><div class="button-row" style="margin-top:16px"><span class="tag ${chosen.powerValid?"good":"bad"}">${chosen.powerValid?"Power check passes":"Power check fails"}</span><span class="tag ${chosen.capacity?"good":"warn"}">${chosen.capacity?"Capacity meets target":"Capacity below target"}</span><span class="tag">Est. ${fmt(chosen.rx)} dBm</span></div></div>
      <div class="card" style="margin-top:16px">${cardHead("Candidate comparison","Simple ranking only — not a substitute for an engineering review")}
        <div class="table-wrap"><table><thead><tr><th>Design</th><th>Total split</th><th>Est. power</th><th>Total loss</th><th>Capacity</th><th>Result</th></tr></thead><tbody>${valid.map(o=>`<tr><td><strong>${esc(o.name)}</strong><br><span class="muted">${esc(o.stages)}</span></td><td>1:${o.split}</td><td>${fmt(o.rx)} dBm</td><td>${fmt(o.total)} dB</td><td>${o.split>=target?"Meets target":"Below target"}</td><td><span class="tag ${o.valid?"good":o.powerValid||o.capacity?"warn":"bad"}">${o.valid?"Feasible":!o.powerValid?"Power review":"Capacity review"}</span></td></tr>`).join("")}</tbody></table></div>
        <p class="small-text muted">The prototype uses ideal theoretical split loss (10 log₁₀ N) for candidates unless a cascade is explicitly listed. Replace this with manufacturer insertion loss for each actual splitter output before field use.</p></div>`;
  }
  function renderNaps(){
    const p=activeProject();
    return `${heading("DISTRIBUTION","NAP & port management","Track distribution boxes, capacity, port assignment and estimated route length.",`<button class="btn primary" data-action="add-nap">＋ Add NAP</button>`)}
      <div class="grid stats-grid"><div class="card"><div class="stat-label">NAP count</div><div class="stat-value">${p.napsList.length}</div></div><div class="card"><div class="stat-label">Total ports</div><div class="stat-value">${p.napsList.reduce((s,n)=>s+Number(n.ports||0),0)}</div></div><div class="card"><div class="stat-label">Assigned ports</div><div class="stat-value">${p.napsList.reduce((s,n)=>s+Number(n.assigned||0),0)}</div></div><div class="card"><div class="stat-label">Unassigned ports</div><div class="stat-value">${p.napsList.reduce((s,n)=>s+Math.max(0,Number(n.ports||0)-Number(n.assigned||0)),0)}</div></div></div>
      <div class="card">${cardHead("Distribution points","Port counts are editable sample inventory")}
      <div class="table-wrap"><table><thead><tr><th>NAP</th><th>Parent</th><th>Splitter</th><th>Ports</th><th>Assigned</th><th>Route km</th><th>Actions</th></tr></thead><tbody>${p.napsList.map(n=>`<tr><td><strong>${esc(n.name)}</strong></td><td>${esc(n.parent)}</td><td>1:${n.ratio}</td><td>${n.ports}</td><td>${n.assigned}</td><td>${fmt(n.lengthKm,2)}</td><td><button class="btn small secondary" data-edit-nap="${esc(n.id)}">Edit</button><button class="btn small ghost" data-delete-nap="${esc(n.id)}">Delete</button></td></tr>`).join("")}</tbody></table></div></div>`;
  }
  function renderClients(){
    const p=activeProject();
    return `${heading("SUBSCRIBERS","Target clients","Assign clients to a NAP, keep a record of drop length and distinguish measured power from estimates.",`<button class="btn primary" data-action="add-client">＋ Add client</button>`)}
      <div class="card">${cardHead("Client inventory",`${p.clientsList.length} sample / saved record(s)`)}
      <div class="table-wrap"><table><thead><tr><th>Client</th><th>NAP</th><th>Port</th><th>Drop km</th><th>Measured dBm</th><th>Status</th><th>Action</th></tr></thead><tbody>${p.clientsList.map(c=>`<tr><td><strong>${esc(c.name)}</strong></td><td>${esc(c.nap)}</td><td>${c.port}</td><td>${fmt(c.dropKm,2)}</td><td>${c.measured==null?"Not measured":fmt(c.measured,1)}</td><td><span class="tag ${c.measured==null?"warn":"good"}">${c.measured==null?"Pending test":"Measured"}</span></td><td><button class="btn small secondary" data-edit-client="${esc(c.id)}">Edit</button><button class="btn small ghost" data-delete-client="${esc(c.id)}">Delete</button></td></tr>`).join("")||`<tr><td colspan="7">No clients yet. Add your first client.</td></tr>`}</tbody></table></div></div>`;
  }
  function renderReports(){
    const p=activeProject(), r=calcLoss(p), assigned=p.napsList.reduce((s,n)=>s+Number(n.assigned||0),0), ports=p.napsList.reduce((s,n)=>s+Number(n.ports||0),0);
    return `${heading("DOCUMENTATION","Reports & export","Create a shareable project snapshot. Exported data is a planning record, not a certified design.",`<button class="btn secondary" data-action="export-json">Export JSON</button><button class="btn primary" data-action="print-report">Print / Save PDF</button>`)}
      <div class="report-sheet" id="reportSheet"><div class="report-title"><div><p class="eyebrow">FIBER POWER COMPUTING</p><h2>${esc(p.name)}</h2><p>${esc(p.location||"Location not specified")} · ${esc(p.pon)} · ${esc(p.status)}</p></div><span class="tag warn">Planning prototype</span></div>
      <div class="report-metrics"><div class="report-metric"><small>Target clients</small><b>${p.target}</b></div><div class="report-metric"><small>Assigned NAP ports</small><b>${assigned} / ${ports}</b></div><div class="report-metric"><small>Estimated power</small><b>${fmt(r.received)} dBm</b></div></div>
      <h3>Optical budget summary</h3><div class="loss-list" style="margin-top:12px">${lossRow("Splitter loss",r.split)}${lossRow("Fiber loss",r.fiber)}${lossRow("Connector loss",r.connectors)}${lossRow("Splice loss",r.splices)}${lossRow("Other loss",r.other)}${lossRow("Engineering margin",r.margin)}<div class="loss-row"><strong>Total loss</strong><strong>${fmt(r.total)} dB</strong></div></div>
      <h3 style="margin-top:24px">NAP inventory</h3><div class="table-wrap"><table><thead><tr><th>NAP</th><th>Ratio</th><th>Ports</th><th>Assigned</th><th>Route km</th></tr></thead><tbody>${p.napsList.map(n=>`<tr><td>${esc(n.name)}</td><td>1:${n.ratio}</td><td>${n.ports}</td><td>${n.assigned}</td><td>${fmt(n.lengthKm,2)}</td></tr>`).join("")}</tbody></table></div>
      <p class="small-text muted" style="margin-top:20px">Generated ${new Date().toLocaleString()}. All power values are estimates unless explicitly identified as measured. Confirm equipment specifications and perform field tests before deployment.</p></div>`;
  }
  function renderSettings(){
    const p=activeProject();
    return `${heading("PREFERENCES","Settings","Comfort, project defaults and future integration placeholders.")}
      <div class="grid layout-main"><section class="card">${cardHead("Appearance","Choose the theme that feels comfortable for long planning sessions")}
        <div class="settings-row"><div><b>Night mode</b><small>Dark charcoal background and warm gold accents.</small></div><button class="switch" id="themeSwitch" role="switch" aria-checked="${state.theme==="dark"}" aria-label="Toggle night mode"><span></span></button></div>
        <div class="settings-row"><div><b>Reduced motion</b><small>Respect your device's reduced-motion preference.</small></div><span class="tag good">System setting</span></div>
        <div class="settings-row"><div><b>Warm accent color</b><small>Gold is used for focus, highlights and primary actions.</small></div><span class="tag">Enabled</span></div></section>
      <section class="card">${cardHead("Active project defaults","Editable prototype settings")}
        <form id="settingsForm" class="form-grid"><div class="field"><label>Project name</label><input name="name" value="${esc(p.name)}" required></div><div class="field"><label>Location</label><input name="location" value="${esc(p.location)}"></div><div class="field"><label>PON technology</label><select name="pon">${["GPON","EPON","XGS-PON","Mixed / undecided"].map(v=>`<option ${p.pon===v?"selected":""}>${v}</option>`).join("")}</select></div><div class="field"><label>Target clients</label><input name="target" type="number" min="1" value="${p.target}"></div><div class="field"><label>OLT name</label><input name="oltName" value="${esc(p.olt.name)}"></div><div class="field"><label>PON ports</label><input name="ponPorts" type="number" min="1" max="256" value="${p.olt.ponPorts}"></div><div class="field" style="grid-column:1/-1"><button class="btn primary" type="submit">Save settings</button></div></form></section>
      <section class="card">${cardHead("Future integration placeholders","Not connected in this prototype")}
        ${settingLine("Backend API","Set API base URL in config.example.js before connecting a server.")}
        ${settingLine("Equipment / SNMP / OMCI","Add vendor-specific, authorized integrations on a secure backend.")}
        ${settingLine("Map provider","Reserve a key in your provider dashboard; restrict it by domain and API.")}
        ${settingLine("Authentication","Use server-side sessions or a managed auth provider; do not store secrets in browser code.")}
        <button class="btn secondary" data-action="show-api-plan">View integration checklist</button></section>
      </div>`;
  }
  function settingLine(title,desc){return `<div class="settings-row"><div><b>${title}</b><small>${desc}</small></div><span class="tag">Reserved</span></div>`;}
  function render(){
    const root=$("#viewRoot");
    const views={dashboard:renderDashboard,projects:renderProjects,topology:renderTopology,calculator:renderCalculator,optimizer:renderOptimizer,naps:renderNaps,clients:renderClients,reports:renderReports,settings:renderSettings};
    root.innerHTML=(views[currentView]||renderDashboard)();
    const mobile=$(".mobile-bottom");
    if(mobile)mobile.remove();
    const bar=document.createElement("nav");bar.className="mobile-bottom";bar.setAttribute("aria-label","Quick navigation");
    [["dashboard","⌂","Home"],["projects","▤","Projects"],["topology","⌘","Map"],["calculator","∑","Power"]].forEach(([v,ic,label])=>{
      const b=document.createElement("button");b.className=currentView===v?"active":"";b.dataset.view=v;b.innerHTML=`<span>${ic}</span>${label}`;bar.appendChild(b);
    });
    document.body.appendChild(bar);
  }
  function newProject(){ $("#projectDialog").showModal(); }
  function makeId(prefix){return prefix+"_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,6);}
  function download(name,content,type){
    const blob=new Blob([content],{type}), url=URL.createObjectURL(blob), a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function editNap(id){
    const p=activeProject(), n=p.napsList.find(x=>x.id===id);if(!n)return;
    const name=prompt("NAP name:",n.name);if(name===null)return;
    const ratio=prompt("Splitter ratio (e.g. 8 for 1:8):",n.ratio);if(ratio===null)return;
    const ports=prompt("Physical ports:",n.ports);if(ports===null)return;
    const assigned=prompt("Assigned ports:",n.assigned);if(assigned===null)return;
    const km=prompt("Route length (km):",n.lengthKm);if(km===null)return;
    if(!name.trim()||![ratio,ports,assigned,km].every(v=>Number.isFinite(Number(v)))||Number(ratio)<1||Number(ports)<1||Number(assigned)<0||Number(assigned)>Number(ports)||Number(km)<0){showToast("Invalid NAP data. Please check values and try again.");return;}
    Object.assign(n,{name:name.trim(),ratio:Number(ratio),ports:Number(ports),assigned:Number(assigned),lengthKm:Number(km)});saveState();render();
  }
  function editClient(id){
    const p=activeProject(), c=p.clientsList.find(x=>x.id===id);if(!c)return;
    const name=prompt("Client name:",c.name);if(name===null)return;
    const nap=prompt("NAP name:",c.nap);if(nap===null)return;
    const port=prompt("NAP port number:",c.port);if(port===null)return;
    const km=prompt("Drop cable length in km:",c.dropKm);if(km===null)return;
    const measured=prompt("Measured power in dBm (leave blank if not measured):",c.measured??"");if(measured===null)return;
    if(!name.trim()||!Number.isFinite(Number(port))||Number(port)<1||!Number.isFinite(Number(km))||Number(km)<0||(measured.trim()&&!Number.isFinite(Number(measured)))){showToast("Invalid client data.");return;}
    Object.assign(c,{name:name.trim(),nap:nap.trim(),port:Number(port),dropKm:Number(km),measured:measured.trim()?Number(measured):null});saveState();render();
  }
  function handleAction(action){
    const p=activeProject();
    switch(action){
      case "new-project":newProject();break;
      case "add-nap":{
        const name=prompt("New NAP name:","NAP-"+(p.napsList.length+1));if(!name?.trim())return;
        const ports=Number(prompt("Physical ports:", "8"));if(!Number.isInteger(ports)||ports<1||ports>256){showToast("Enter a valid port count from 1 to 256.");return;}
        const ratio=Number(prompt("Splitter ratio (e.g. 8 means 1:8):","8"));if(!Number.isInteger(ratio)||ratio<1){showToast("Enter a valid splitter ratio.");return;}
        p.napsList.push({id:makeId("nap"),name:name.trim(),parent:"Primary splitter",ratio,ports,assigned:0,lengthKm:0});saveState();render();showToast("NAP added.");break;
      }
      case "add-client":{
        const name=prompt("Client name:","Client-"+String(p.clientsList.length+1).padStart(3,"0"));if(!name?.trim())return;
        const napDefault=p.napsList[0]?.name||"Unassigned";
        const nap=prompt("NAP name:",napDefault);if(nap===null)return;
        const port=Number(prompt("NAP port number:","1"));const dropKm=Number(prompt("Drop cable length (km):","0.1"));
        if(!Number.isInteger(port)||port<1||!Number.isFinite(dropKm)||dropKm<0){showToast("Enter a valid port and non-negative cable length.");return;}
        if(p.clientsList.some(c=>c.nap===nap&&c.port===port)){showToast("That NAP port is already assigned in the client list.");return;}
        p.clientsList.push({id:makeId("client"),name:name.trim(),nap,port,dropKm,measured:null});saveState();render();showToast("Client added.");break;
      }
      case "reset-calculator":p.calculator=structuredClone(defaultState.projects[0].calculator);saveState();render();showToast("Calculator values reset to sample values.");break;
      case "export-json":download("fiber-power-project.json",JSON.stringify(p,null,2),"application/json");showToast("Project JSON export prepared.");break;
      case "print-report":window.print();break;
      case "edit-topology":{
        const v=prompt("Number of NAP branches (1–8):",p.network.naps);if(v===null)return;
        const n=Number(v);if(!Number.isInteger(n)||n<1||n>8){showToast("Enter a whole number from 1 to 8.");return;}
        p.network.naps=n;saveState();setView("topology");break;
      }
      case "show-api-plan":showToast("API plan: create a server API, add authentication and validation, keep API secrets server-side, then connect config.example.js. See README.md and backend/README.md.");break;
    }
  }
  document.addEventListener("click",e=>{
    const viewBtn=e.target.closest("[data-view]");if(viewBtn){setView(viewBtn.dataset.view);return;}
    const action=e.target.closest("[data-action]");if(action){handleAction(action.dataset.action);return;}
    const close=e.target.closest("[data-close]");if(close){closeDialog(close.dataset.close);return;}
    const open=e.target.closest("[data-project-open]");if(open){state.activeProjectId=open.dataset.projectOpen;saveState();setView("dashboard");return;}
    const editNapBtn=e.target.closest("[data-edit-nap]");if(editNapBtn){editNap(editNapBtn.dataset.editNap);return;}
    const deleteNap=e.target.closest("[data-delete-nap]");if(deleteNap){if(confirm("Delete this NAP? Client records referencing it will remain until edited.")){const p=activeProject();p.napsList=p.napsList.filter(n=>n.id!==deleteNap.dataset.deleteNap);saveState();render();}return;}
    const editClientBtn=e.target.closest("[data-edit-client]");if(editClientBtn){editClient(editClientBtn.dataset.editClient);return;}
    const deleteClient=e.target.closest("[data-delete-client]");if(deleteClient){if(confirm("Delete this client record?")){const p=activeProject();p.clientsList=p.clientsList.filter(c=>c.id!==deleteClient.dataset.deleteClient);saveState();render();}return;}
    const tab=e.target.closest("[data-calc-tab]");if(tab){calcTab=tab.dataset.calcTab;render();return;}
  });
  document.addEventListener("submit",e=>{
    e.preventDefault();const form=e.target, fd=new FormData(form);
    if(form.id==="projectForm"){
      const name=String(fd.get("name")||"").trim();if(!name)return;
      const target=Math.max(1,Number(fd.get("target"))||64), pon=String(fd.get("pon"));
      const p={id:makeId("project"),name,location:String(fd.get("location")||"").trim(),target,pon,status:"Planning",created:new Date().toISOString(),
        olt:{name:"OLT-01",manufacturer:"Generic / editable",model:"GPON OLT",ponPorts:4,txPower:4,rxSensitivity:-28,rxOverload:-8},
        network:{primaryRatio:4,secondaryRatio:8,naps:4,portsPerNap:8,clients:0},
        calculator:structuredClone(defaultState.projects[0].calculator),clientsList:[],napsList:[]};
      state.projects.unshift(p);state.activeProjectId=p.id;saveState();closeDialog("projectDialog");form.reset();setView("dashboard");showToast("Project created and saved on this device.");return;
    }
    if(form.id==="calculatorForm"){
      const p=activeProject();for(const key of Object.keys(p.calculator)){if(fd.has(key))p.calculator[key]=Number(fd.get(key));}
      if(p.calculator.fiberKm<0||p.calculator.attenuation<0||p.calculator.connectorCount<0||p.calculator.spliceCount<0||p.calculator.margin<0){showToast("Lengths, attenuation, counts and margin cannot be negative.");return;}
      saveState();render();showToast("Optical budget recalculated.");return;
    }
    if(form.id==="topologyForm"){
      const p=activeProject();p.network.primaryRatio=Number(fd.get("primaryRatio"));p.network.secondaryRatio=Number(fd.get("secondaryRatio"));p.network.naps=Number(fd.get("naps"));p.network.portsPerNap=Number(fd.get("portsPerNap"));p.network.clients=Number(fd.get("clients"));
      p.target=Math.max(p.target,p.network.clients);saveState();render();showToast("Topology settings saved.");return;
    }
    if(form.id==="settingsForm"){
      const p=activeProject();p.name=String(fd.get("name")).trim();p.location=String(fd.get("location")||"").trim();p.pon=String(fd.get("pon"));p.target=Math.max(1,Number(fd.get("target"))||1);p.olt.name=String(fd.get("oltName")||"OLT-01");p.olt.ponPorts=Math.max(1,Number(fd.get("ponPorts"))||1);saveState();render();showToast("Project settings saved.");return;
    }
  });
  document.addEventListener("input",e=>{if(e.target.id==="projectSearch"){projectSearch=e.target.value;const pos=e.target.selectionStart;render();const input=$("#projectSearch");input?.focus();input?.setSelectionRange(pos,pos);}});
  $("#themeBtn").addEventListener("click",()=>setTheme(state.theme==="dark"?"light":"dark"));
  $("#menuBtn").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
  $("#profileBtn").addEventListener("click",()=>showToast("Prototype profile: BR. Add secure authentication in the future backend."));
  $("#themeSwitch")?.addEventListener("click",()=>setTheme(state.theme==="dark"?"light":"dark"));
  // Delegate theme switch because settings is rendered dynamically.
  document.addEventListener("click",e=>{if(e.target.closest("#themeSwitch"))setTheme(state.theme==="dark"?"light":"dark");});
  $("#projectForm").addEventListener("submit",()=>{}); // native submit is handled by delegated submit listener
  $("#todayLabel").textContent=new Intl.DateTimeFormat(undefined,{weekday:"short",month:"short",day:"numeric"}).format(new Date());
  setTheme(state.theme);render();
})();