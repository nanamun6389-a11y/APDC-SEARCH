const FIREBASE_ROOT='https://apdc-judge-default-rtdb.asia-southeast1.firebasedatabase.app';
const FIREBASE_BASE=FIREBASE_ROOT+'/apdcPublic';
let groups=[],selected=-1,eventCatalog=[];
const $=id=>document.getElementById(id),status=t=>$('status').textContent=t;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const fetchJson=async(path)=>{const r=await fetch(`${path}${path.includes('?')?'&':'?'}v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`${path}: ${r.status}`);return r.json()};
const restGet=async(path)=>{const r=await fetch(`${FIREBASE_BASE}/${path}.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`REST GET ${path}: ${r.status}`);return r.json()};
const restPut=async(path,value)=>{const r=await fetch(`${FIREBASE_BASE}/${path}.json`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});if(!r.ok)throw new Error(`REST PUT ${path}: ${r.status}`);return r.json()};
const rootGet=async(path)=>{const r=await fetch(`${FIREBASE_ROOT}/${path}.json?v=${Date.now()}`,{cache:'no-store'});if(!r.ok)throw new Error(`ROOT GET ${path}: ${r.status}`);return r.json()};
const rootPut=async(path,value)=>{const r=await fetch(`${FIREBASE_ROOT}/${path}.json`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});if(!r.ok)throw new Error(`ROOT PUT ${path}: ${r.status}`);return r.json()};
function deviceInfo(){const ua=navigator.userAgent;let device=/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':/Android/i.test(ua)?(/Samsung|SM-/i.test(ua)?'Samsung Android':'Android device'):/Windows/i.test(ua)?'Windows PC':/Macintosh/i.test(ua)?'Mac':'Unknown device';let browser=/SamsungBrowser/i.test(ua)?'Samsung Internet':/Edg/i.test(ua)?'Edge':/CriOS|Chrome/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'Browser';return `${device} · ${browser}`}
function playerGroups(players){const m=new Map();for(const p of players||[]){const key=`${p.backNo}||${p.competitor}`;if(!m.has(key))m.set(key,{backNo:String(p.backNo??''),competitor:p.competitor||'',entries:[]});m.get(key).entries.push({...p})}return[...m.values()].sort((a,b)=>(Number(a.backNo)||99999)-(Number(b.backNo)||99999)||a.competitor.localeCompare(b.competitor))}
function flattenGroups(gs){return gs.flatMap(g=>g.entries.map(e=>({...e,backNo:String(g.backNo),competitor:g.competitor})))}
function normalizeSettings(settings){if(Array.isArray(settings))return settings;if(Array.isArray(settings?.events))return settings.events;return Object.values(settings||{}).flatMap(v=>Array.isArray(v)?v:[v]);}
function buildEventCatalog(players,settings){const map=new Map();const add=e=>{if(!e||Array.isArray(e))return;const eventNo=String(e.eventNo||e.eventNumber||e.sourceEventNo||e.no||'').trim();const event=String(e.event||e.title||'').trim();const section=String(e.section||'').trim();const style=String(e.style||'').trim();const division=String(e.division||e.entryType||'').trim();if(!eventNo||!event||/break|lunch|opening|award/i.test(event))return;const key=[eventNo,event.toLowerCase(),section.toLowerCase()].join('|');const next={eventNo,event,section,style,division,entryType:e.entryType||division||''};if(!map.has(key)){map.set(key,next)}else{const cur=map.get(key);for(const k of ['event','section','style','division','entryType'])if(!cur[k]&&next[k])cur[k]=next[k]}};(players||[]).forEach(add);normalizeSettings(settings).forEach(add);return[...map.values()].sort((a,b)=>(Number(a.eventNo)||99999)-(Number(b.eventNo)||99999)||(`${a.section} ${a.event}`).localeCompare(`${b.section} ${b.event}`))}
function usedBackNumbers(exceptIndex=-1){const used=new Map();groups.forEach((g,i)=>{if(i===exceptIndex)return;const n=String(g.backNo||'').trim();if(n)used.set(n,g.competitor||'Unknown player')});return used}
function availableBackNumbers(limit=12){const used=usedBackNumbers(selected);const out=[];for(let n=1;n<=299&&out.length<limit;n++)if(!used.has(String(n)))out.push(n);return out}
function renderBackNoStatus(){const box=$('backNoStatus');if(!box)return;const raw=String($('backNo').value||'').trim();const used=usedBackNumbers(selected);let msg='';let cls='backno-neutral';if(raw){if(!/^\d+$/.test(raw)||Number(raw)<1||Number(raw)>299){msg='Back No. must be between 1 and 299.';cls='backno-bad'}else if(used.has(raw)){msg=`NO. ${esc(raw)} is already used by ${esc(used.get(raw))}.`;cls='backno-bad'}else{msg=`NO. ${esc(raw)} is available.`;cls='backno-good'}}else{msg='Choose an unused Back No.'}const avail=availableBackNumbers().map(n=>`<button type="button" class="backno-chip" data-backno="${n}">${n}</button>`).join('');box.className=`backno-status ${cls}`;box.innerHTML=`<div>${msg}</div><div class="backno-available-label">AVAILABLE</div><div class="backno-chips">${avail}</div>`;box.querySelectorAll('[data-backno]').forEach(b=>b.onclick=()=>{$('backNo').value=b.dataset.backno;if(selected>=0)groups[selected].backNo=b.dataset.backno;renderBackNoStatus();renderList()})}

function parseSourceEventNos(row){
  const raw=[];
  if(row&&row.sourceEventNo!==undefined&&row.sourceEventNo!==null)raw.push(String(row.sourceEventNo));
  if(row&&row.sourceEventNos!==undefined&&row.sourceEventNos!==null){
    if(Array.isArray(row.sourceEventNos)) raw.push(...row.sourceEventNos.map(String));
    else raw.push(String(row.sourceEventNos));
  }
  return [...new Set(raw.flatMap(v=>String(v).split(/\s*[/,|+]\s*/)).map(v=>v.trim()).filter(Boolean))];
}
function syncTimetableEntryCounts(tt,players){
  const rows=Array.isArray(tt?.rows)?tt.rows.map(r=>({...r})):[];
  if(!rows.length)return null;
  const byEventNo=new Map();
  const byIdentity=new Map();
  for(const p of players||[]){
    const id=`${String(p.backNo||'').trim()}|${String(p.competitor||'').trim()}`;
    if(!id||id==='|')continue;
    const eno=String(p.eventNo||p.sourceEventNo||'').trim();
    if(eno){if(!byEventNo.has(eno))byEventNo.set(eno,new Map());byEventNo.get(eno).set(id,p)}
    const ident=`${String(p.event||'').trim().toLowerCase()}|${String(p.section||'').trim().toLowerCase()}`;
    if(ident!=='|'){if(!byIdentity.has(ident))byIdentity.set(ident,new Map());byIdentity.get(ident).set(id,p)}
  }
  const firstIndexByKey=new Map();
  rows.forEach((r,i)=>{
    const nos=parseSourceEventNos(r);
    const ident=`${String(r.event||'').trim().toLowerCase()}|${String(r.section||'').trim().toLowerCase()}`;
    const key=nos.length?`no:${nos.join('/')}`:`id:${ident}`;
    if(!firstIndexByKey.has(key))firstIndexByKey.set(key,i);
  });
  let changed=0;
  rows.forEach((r,i)=>{
    const nos=parseSourceEventNos(r);
    const ident=`${String(r.event||'').trim().toLowerCase()}|${String(r.section||'').trim().toLowerCase()}`;
    const key=nos.length?`no:${nos.join('/')}`:`id:${ident}`;
    if(firstIndexByKey.get(key)!==i)return;
    const merged=new Map();
    if(nos.length){
      nos.forEach(no=>{const m=byEventNo.get(no);if(m)m.forEach((v,k)=>merged.set(k,v))});
    }else{
      const m=byIdentity.get(ident);if(m)m.forEach((v,k)=>merged.set(k,v));
    }
    if(!merged.size)return;
    const vals=[...merged.values()];
    const count=vals.length;
    const backNumbers=[...new Set(vals.map(p=>String(p.backNo||'').trim()).filter(Boolean))].sort((a,b)=>(Number(a)||99999)-(Number(b)||99999));
    if(String(r.entries||'')!==String(count) || JSON.stringify(r.backNumbers||[])!==JSON.stringify(backNumbers))changed++;
    r.entries=String(count);
    r.backNumbers=backNumbers;
  });
  return {...tt,rows,updatedAt:Date.now(),entrySyncAt:new Date().toISOString(),entrySyncChanges:changed};
}
async function syncJudgeTimetable(players){
  // The JUDGE timetable-data.json is the single canonical structure.
  // Never rebuild order/time/rounds from an older Firebase override.
  let source=null;
  try{source=await fetchJson('timetable-data.json')}catch(err){console.warn('Canonical timetable load failed',err)}
  if(!source){try{const saved=await rootGet('timetableOverride');if(saved&&Array.isArray(saved.rows)&&saved.rows.length)source=saved}catch(err){console.warn('Judge timetable override read failed',err)}}
  if(!source)throw new Error('Canonical timetable data is empty');
  const synced=syncTimetableEntryCounts(source,players);
  if(!synced)throw new Error('Timetable data is empty');
  await rootPut('timetableOverride',synced);
  await restPut('timetable',synced);
  return synced;
}
function validateBackNumbers(){const seen=new Map();const conflicts=[];groups.forEach(g=>{const n=String(g.backNo||'').trim();if(!n)return;if(!/^\d+$/.test(n)||Number(n)<1||Number(n)>299){conflicts.push(`Invalid Back No. ${n} (${g.competitor||'Unnamed'})`);return}if(seen.has(n)&&seen.get(n)!==g.competitor)conflicts.push(`NO. ${n}: ${seen.get(n)} / ${g.competitor}`);else seen.set(n,g.competitor)});return conflicts}

function initEntryAdmin(){
  $('loginBox').classList.add('hidden');$('adminBox').classList.remove('hidden');
  $('sessionInfo').textContent=`Device: ${sessionStorage.getItem('apdcDeviceInfo')||deviceInfo()}`;
  loadAll();
}
initEntryAdmin();
async function loadAll(){
  status('Loading players…');
  try{
    const [basePlayers,settings]=await Promise.all([fetchJson('players.json'),fetchJson('event-settings.json')]);
    groups=playerGroups(basePlayers);eventCatalog=buildEventCatalog(basePlayers,settings);selected=-1;renderList();renderEditor();
    status(`Loaded ${groups.length} players. Checking latest saved data…`);
    try{
      const remote=await restGet('players');
      if(Array.isArray(remote)&&remote.length){groups=playerGroups(remote);eventCatalog=buildEventCatalog([...basePlayers,...remote],settings);renderList();status(`Loaded ${groups.length} players · ${eventCatalog.length} saved sections.`)}
      else status(`Loaded ${groups.length} players · ${eventCatalog.length} saved sections.`);
    }catch(err){console.warn(err);status(`Loaded ${groups.length} players from site data · ${eventCatalog.length} saved sections.`)}
  }catch(err){console.error(err);status('Could not load players.json. Please upload the full ZIP again.')}
}
function renderList(){const q=String($('filter').value||'').trim().toLowerCase();const visible=groups.map((g,i)=>({g,i})).filter(x=>`${x.g.backNo} ${x.g.competitor}`.toLowerCase().includes(q));$('playerList').innerHTML=visible.map(({g,i})=>`<div class="player-edit-item ${i===selected?'active':''}"><div class="player-edit-info"><b>NO. ${esc(g.backNo)}</b><span>${esc(g.competitor)}</span><small>${g.entries.length} entries</small></div><button type="button" class="player-edit-btn" data-edit="${i}">EDIT</button></div>`).join('')||'<p class="empty-note">No player found.</p>';$('playerList').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openPlayer(Number(b.dataset.edit)))}
function openPlayer(i){commitEditor();selected=i;renderList();renderEditor();setTimeout(()=>$('playerEditor').scrollIntoView({behavior:'smooth',block:'start'}),0)}
function closePlayer(){commitEditor();selected=-1;renderList();renderEditor()}
function rowHtml(e,i){return `<div class="entry-row entry-picker-row" data-i="${i}"><div class="event-no-wrap picker-trigger"><input class="event-no-input" value="${esc(e.eventNo||'')}" placeholder="Event No." readonly><button type="button" class="event-open" title="Select saved section">▾</button><div class="event-menu hidden"></div></div><input class="picker-trigger-input" data-k="event" value="${esc(e.event||'')}" placeholder="Event" readonly><input class="picker-trigger-input" data-k="section" value="${esc(e.section||'')}" placeholder="Section" readonly><input data-k="style" value="${esc(e.style||'')}" placeholder="Style" readonly><input data-k="division" value="${esc(e.division||'')}" placeholder="Division" readonly><button type="button" class="entry-delete" data-del="${i}">×</button></div>`}
function fillMenu(row,query=''){const menu=row.querySelector('.event-menu');const q=query.toLowerCase();const list=eventCatalog.filter(e=>`${e.eventNo} ${e.event} ${e.section} ${e.style} ${e.division}`.toLowerCase().includes(q));menu.innerHTML=`<div class="event-menu-search"><input placeholder="Search event no. / event / section" value="${esc(query)}"></div><div class="event-menu-list">${list.map(e=>`<button type="button" data-key="${esc([e.eventNo,e.event,e.section,e.style,e.division].join('|'))}"><b>EVENT ${esc(e.eventNo)}</b><span>${esc(e.event)}</span><small>${esc(e.section)} · ${esc(e.style)}${e.division?' · '+esc(e.division):''}</small></button>`).join('')||'<p>No saved section found.</p>'}</div>`;const search=menu.querySelector('input');search.oninput=()=>fillMenu(row,search.value);setTimeout(()=>search.focus(),0);menu.querySelectorAll('[data-key]').forEach(btn=>btn.onclick=()=>{const picked=eventCatalog.find(e=>[e.eventNo,e.event,e.section,e.style,e.division].join('|')===btn.dataset.key);if(!picked)return;const idx=Number(row.dataset.i);groups[selected].entries[idx]={...groups[selected].entries[idx],...picked,backNo:groups[selected].backNo,competitor:groups[selected].competitor};renderEditor()})}
function openMenu(row){document.querySelectorAll('.event-menu').forEach(m=>m.classList.add('hidden'));const menu=row.querySelector('.event-menu');menu.classList.remove('hidden');fillMenu(row,'')}
function renderEditor(){const editor=$('playerEditor');if(selected<0||!groups[selected]){editor.classList.add('hidden');$('backNo').value='';$('competitor').value='';$('entryRows').innerHTML='';if($('backNoStatus'))$('backNoStatus').innerHTML='';return}editor.classList.remove('hidden');const g=groups[selected];$('editorName').textContent=g.competitor||'NEW PLAYER';$('backNo').value=g.backNo;$('competitor').value=g.competitor;renderBackNoStatus();$('entryRows').innerHTML=g.entries.map(rowHtml).join('')||'<p class="empty-note">No entries. Press ADD ENTRY and select a saved section.</p>';$('entryRows').querySelectorAll('.entry-picker-row').forEach(row=>{row.querySelector('.event-no-input').onclick=()=>openMenu(row);row.querySelector('.event-open').onclick=()=>openMenu(row);row.querySelectorAll('.picker-trigger-input').forEach(inp=>inp.onclick=()=>openMenu(row))});$('entryRows').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{commitEditor();groups[selected].entries.splice(Number(b.dataset.del),1);renderEditor();renderList()})}
function commitEditor(){if(selected<0||!groups[selected]||$('playerEditor').classList.contains('hidden'))return;const g=groups[selected];g.backNo=$('backNo').value.trim();g.competitor=$('competitor').value.trim();g.entries=[...$('entryRows').querySelectorAll('.entry-row')].map(row=>{const old=g.entries[Number(row.dataset.i)]||{};const out={...old};row.querySelectorAll('[data-k]').forEach(inp=>out[inp.dataset.k]=inp.value.trim());out.eventNo=row.querySelector('.event-no-input')?.value.trim()||old.eventNo||'';out.backNo=g.backNo;out.competitor=g.competitor;out.entryType=out.entryType||out.division||'';return out}).filter(e=>e.event&&e.section)}
$('filter').oninput=renderList;$('backNo').oninput=()=>{if(selected>=0){groups[selected].backNo=$('backNo').value;renderBackNoStatus();renderList()}};$('competitor').oninput=()=>{if(selected>=0){groups[selected].competitor=$('competitor').value;$('editorName').textContent=$('competitor').value||'NEW PLAYER';renderList()}};$('closeEditor').onclick=closePlayer;$('newPlayer').onclick=()=>{commitEditor();groups.push({backNo:'',competitor:'',entries:[]});openPlayer(groups.length-1)};$('addEntry').onclick=()=>{if(selected<0)return;commitEditor();groups[selected].entries.push({eventNo:'',event:'',section:'',style:'',division:'',entryType:''});renderEditor();setTimeout(()=>{const rows=$('entryRows').querySelectorAll('.entry-row');if(rows.length)openMenu(rows[rows.length-1])},0)};$('deletePlayer').onclick=()=>{if(selected>=0&&confirm('Delete this player and all entries?')){groups.splice(selected,1);selected=-1;renderList();renderEditor()}};$('loadBase').onclick=loadAll;
$('saveAll').onclick=async()=>{commitEditor();const conflicts=validateBackNumbers();if(conflicts.length){status('SAVE BLOCKED: duplicate or invalid Back No.');alert('Back No. problem:\n\n'+conflicts.join('\n'));renderBackNoStatus();return}const players=flattenGroups(groups).filter(x=>x.backNo&&x.competitor&&x.event&&x.section);const device=sessionStorage.getItem('apdcDeviceInfo')||deviceInfo();status('Saving entries and creating restore point…');try{let current=[];try{const c=await restGet('players');if(Array.isArray(c))current=c}catch{}let versions=[];try{const v=await restGet('entryVersions');if(Array.isArray(v))versions=v}catch{}versions.unshift({id:Date.now(),createdAt:new Date().toISOString(),device,records:current.length,players:current});versions=versions.slice(0,10);await restPut('entryVersions',versions);await restPut('players',players);const syncedTimetable=await syncJudgeTimetable(players);await restPut('meta',{updatedAt:new Date().toISOString(),device,timetableEntrySyncAt:new Date().toISOString()});status(`Saved ${players.length} entry records. Search + Judge timetable entries synced (${syncedTimetable.entrySyncChanges||0} timetable rows updated). Restore points: ${versions.length}/10.`)}catch(err){console.error(err);status('SAVE FAILED. Please check internet connection and try again.')}};
document.addEventListener('click',e=>{if(!e.target.closest('.event-no-wrap')&&!e.target.classList.contains('picker-trigger-input'))document.querySelectorAll('.event-menu').forEach(m=>m.classList.add('hidden'))});
