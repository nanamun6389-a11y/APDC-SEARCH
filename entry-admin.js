import {db,ref,get,set,PASSWORD,loadPlayers,loadTimetable,playerGroups,flattenGroups,syncTimetable} from './data-common.js';
let groups=[],selected=-1,eventCatalog=[];
const $=id=>document.getElementById(id),status=t=>$('status').textContent=t;
function unlock(){sessionStorage.setItem('apdcEntryAdmin','yes');$('loginBox').classList.add('hidden');$('adminBox').classList.remove('hidden');loadAll()}
$('loginBtn').onclick=()=>{$('password').value===PASSWORD?unlock():$('loginMsg').textContent='WRONG PASSWORD'};$('password').onkeydown=e=>{if(e.key==='Enter')$('loginBtn').click()};if(sessionStorage.getItem('apdcEntryAdmin')==='yes')unlock();
async function loadAll(){
  status('Loading…');
  const [players,timetable]=await Promise.all([loadPlayers(),loadTimetable()]);
  groups=playerGroups(players);
  eventCatalog=buildEventCatalog(players,timetable);
  selected=groups.length?0:-1;
  renderList();renderEditor();
  status(`Loaded ${groups.length} players and ${eventCatalog.length} saved sections.`)
}
function buildEventCatalog(players,timetable){
  const map=new Map();
  const add=e=>{
    const eventNo=String(e.eventNo||e.sourceEventNo||'').trim();
    const event=String(e.event||'').trim();
    const section=String(e.section||'').trim();
    const style=String(e.style||'').trim();
    const division=String(e.division||'').trim();
    if(!eventNo||!event||/break|lunch|opening|award/i.test(event))return;
    const key=[eventNo,event,section,division,style].join('|');
    if(!map.has(key))map.set(key,{eventNo,event,section,style,division,entryType:e.entryType||division||''});
  };
  (players||[]).forEach(add);
  ((timetable&&timetable.rows)||[]).forEach(r=>add({...r,eventNo:r.sourceEventNo||r.eventNo||r.no}));
  return [...map.values()].sort((a,b)=>{
    const na=Number(a.eventNo),nb=Number(b.eventNo);
    if(Number.isFinite(na)&&Number.isFinite(nb)&&na!==nb)return na-nb;
    return `${a.section} ${a.event}`.localeCompare(`${b.section} ${b.event}`);
  });
}
function eventOptions(current){
  const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const selectedKey=[current.eventNo||'',current.event||'',current.section||'',current.division||'',current.style||''].join('|');
  let html='<option value="">SELECT SAVED SECTION</option>';
  eventCatalog.forEach((e,i)=>{
    const key=[e.eventNo,e.event,e.section,e.division,e.style].join('|');
    const label=`${e.eventNo} · ${e.event} · ${e.section}`;
    html+=`<option value="${i}" ${key===selectedKey?'selected':''}>${esc(label)}</option>`;
  });
  return html;
}
function renderList(){const q=String($('filter').value||'').toLowerCase();$('playerList').innerHTML=groups.map((g,i)=>({g,i})).filter(x=>`${x.g.backNo} ${x.g.competitor}`.toLowerCase().includes(q)).map(x=>`<button data-i="${x.i}" class="${x.i===selected?'active':''}">${x.g.backNo} · ${x.g.competitor}</button>`).join('');$('playerList').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.i);renderList();renderEditor()})}
function rowHtml(e,i){return `<div class="entry-row" data-i="${i}"><select class="event-picker" aria-label="Saved section">${eventOptions(e)}</select><input data-k="event" value="${e.event||''}" placeholder="Event" readonly><input data-k="section" value="${e.section||''}" placeholder="Section" readonly><input data-k="style" value="${e.style||''}" placeholder="Style" readonly><input data-k="division" value="${e.division||''}" placeholder="Division" readonly><button data-del="${i}">×</button></div>`}
function renderEditor(){
  if(selected<0||!groups[selected]){$('backNo').value='';$('competitor').value='';$('entryRows').innerHTML='';return}
  const g=groups[selected];
  $('backNo').value=g.backNo;$('competitor').value=g.competitor;
  $('entryRows').innerHTML=g.entries.map(rowHtml).join('');
  $('entryRows').querySelectorAll('.event-picker').forEach(sel=>sel.onchange=()=>{
    const row=sel.closest('.entry-row');
    const idx=Number(row.dataset.i);
    const picked=eventCatalog[Number(sel.value)];
    if(!picked)return;
    groups[selected].entries[idx]={...groups[selected].entries[idx],...picked,backNo:groups[selected].backNo,competitor:groups[selected].competitor};
    renderEditor();
  });
  $('entryRows').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{commitEditor();groups[selected].entries.splice(Number(b.dataset.del),1);renderEditor()})
}
function commitEditor(){if(selected<0||!groups[selected])return;const g=groups[selected];g.backNo=$('backNo').value.trim();g.competitor=$('competitor').value.trim();g.entries=[...$('entryRows').querySelectorAll('.entry-row')].map(row=>{const old=g.entries[Number(row.dataset.i)]||{};const out={...old};row.querySelectorAll('[data-k]').forEach(inp=>out[inp.dataset.k]=inp.value.trim());out.backNo=g.backNo;out.competitor=g.competitor;out.entryType=out.entryType||out.division||'';return out}).filter(e=>e.event&&e.section)}
$('filter').oninput=renderList;$('backNo').oninput=()=>{if(selected>=0)groups[selected].backNo=$('backNo').value;renderList()};$('competitor').oninput=()=>{if(selected>=0)groups[selected].competitor=$('competitor').value;renderList()};
$('newPlayer').onclick=()=>{commitEditor();groups.push({backNo:'',competitor:'',entries:[]});selected=groups.length-1;renderList();renderEditor()};
$('addEntry').onclick=()=>{if(selected<0)$('newPlayer').click();commitEditor();groups[selected].entries.push({eventNo:'',event:'',section:'',style:'',division:'',entryType:''});renderEditor()};
$('deletePlayer').onclick=()=>{if(selected>=0&&confirm('Delete this player and all entries?')){groups.splice(selected,1);selected=Math.min(selected,groups.length-1);renderList();renderEditor()}};
$('loadBase').onclick=loadAll;
$('saveAll').onclick=async()=>{commitEditor();const players=flattenGroups(groups).filter(x=>x.backNo&&x.competitor&&x.event&&x.section);status('Saving entries and syncing timetable…');const tt=syncTimetable(await loadTimetable(),players);await set(ref(db,'apdcPublic/players'),players);await set(ref(db,'apdcPublic/timetable'),tt);await set(ref(db,'apdcPublic/meta'),{updatedAt:new Date().toISOString(),updatedBy:'entry-admin'});status(`Saved ${players.length} entry records. Timetable synced.`)};
