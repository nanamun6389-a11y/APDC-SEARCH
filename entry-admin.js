import {db,ref,get,set,PASSWORD,loadPlayers,loadTimetable,playerGroups,flattenGroups} from './data-common.js';
let groups=[],selected=-1,eventCatalog=[];
const $=id=>document.getElementById(id),status=t=>$('status').textContent=t;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function deviceInfo(){const ua=navigator.userAgent;let device=/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':/Android/i.test(ua)?(/Samsung|SM-/i.test(ua)?'Samsung Android':'Android device'):/Windows/i.test(ua)?'Windows PC':/Macintosh/i.test(ua)?'Mac':'Unknown device';let browser=/SamsungBrowser/i.test(ua)?'Samsung Internet':/Edg/i.test(ua)?'Edge':/CriOS|Chrome/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'Browser';return `${device} · ${browser}`}
function unlock(){const worker=$('workerName').value.trim();if(!worker){$('loginMsg').textContent='ENTER WORKER NAME';return}sessionStorage.setItem('apdcEntryAdmin','yes');sessionStorage.setItem('apdcWorkerName',worker);sessionStorage.setItem('apdcDeviceInfo',deviceInfo());$('loginBox').classList.add('hidden');$('adminBox').classList.remove('hidden');$('sessionInfo').textContent=`Worker: ${worker} · ${deviceInfo()}`;loadAll()}
$('loginBtn').onclick=()=>{$('password').value===PASSWORD?unlock():$('loginMsg').textContent='WRONG PASSWORD'};
$('password').onkeydown=e=>{if(e.key==='Enter')$('loginBtn').click()};
if(sessionStorage.getItem('apdcEntryAdmin')==='yes'){ $('workerName').value=sessionStorage.getItem('apdcWorkerName')||''; unlock(); }
async function loadAll(){
 status('Loading…');
 const [players,timetable]=await Promise.all([loadPlayers(),loadTimetable()]);
 groups=playerGroups(players); eventCatalog=buildEventCatalog(players,timetable); selected=groups.length?0:-1;
 renderList(); renderEditor(); status(`Loaded ${groups.length} players and ${eventCatalog.length} saved sections.`)
}
function buildEventCatalog(players,timetable){
 const map=new Map();
 const add=e=>{
  const eventNo=String(e.eventNo||e.sourceEventNo||e.no||'').trim();
  const event=String(e.event||e.title||'').trim();
  const section=String(e.section||'').trim();
  const style=String(e.style||'').trim();
  const division=String(e.division||'').trim();
  if(!eventNo||!event||/break|lunch|opening|award/i.test(event))return;
  const key=[eventNo,event,section,style,division].join('|');
  if(!map.has(key))map.set(key,{eventNo,event,section,style,division,entryType:e.entryType||division||''});
 };
 (players||[]).forEach(add); ((timetable?.rows)||[]).forEach(add);
 return [...map.values()].sort((a,b)=>Number(a.eventNo)-Number(b.eventNo)||(`${a.section} ${a.event}`).localeCompare(`${b.section} ${b.event}`)));
}
function renderList(){
 const q=String($('filter').value||'').toLowerCase();
 $('playerList').innerHTML=groups.map((g,i)=>({g,i})).filter(x=>`${x.g.backNo} ${x.g.competitor}`.toLowerCase().includes(q)).map(x=>`<button data-i="${x.i}" class="${x.i===selected?'active':''}">${esc(x.g.backNo)} · ${esc(x.g.competitor)}</button>`).join('');
 $('playerList').querySelectorAll('button').forEach(b=>b.onclick=()=>{selected=Number(b.dataset.i);renderList();renderEditor()})
}
function rowHtml(e,i){return `<div class="entry-row entry-picker-row" data-i="${i}">
 <div class="event-no-wrap"><input class="event-no-input" value="${esc(e.eventNo||'')}" placeholder="Event No." readonly><button type="button" class="event-open" title="Select saved section">▾</button><div class="event-menu hidden"></div></div>
 <input data-k="event" value="${esc(e.event||'')}" placeholder="Event" readonly>
 <input data-k="section" value="${esc(e.section||'')}" placeholder="Section" readonly>
 <input data-k="style" value="${esc(e.style||'')}" placeholder="Style" readonly>
 <input data-k="division" value="${esc(e.division||'')}" placeholder="Division" readonly>
 <button data-del="${i}">×</button></div>`}
function fillMenu(row,query=''){
 const menu=row.querySelector('.event-menu'); const q=query.toLowerCase();
 const list=eventCatalog.filter(e=>`${e.eventNo} ${e.event} ${e.section} ${e.style} ${e.division}`.toLowerCase().includes(q));
 menu.innerHTML=`<div class="event-menu-search"><input placeholder="Search event no. or section" value="${esc(query)}"></div><div class="event-menu-list">${list.map((e)=>`<button type="button" data-key="${esc([e.eventNo,e.event,e.section,e.style,e.division].join('|'))}"><b>EVENT ${esc(e.eventNo)}</b><span>${esc(e.event)}</span><small>${esc(e.section)} · ${esc(e.style)} · ${esc(e.division)}</small></button>`).join('')||'<p>No saved section found.</p>'}</div>`;
 const search=menu.querySelector('input'); search.oninput=()=>fillMenu(row,search.value); search.focus();
 menu.querySelectorAll('[data-key]').forEach(btn=>btn.onclick=()=>{
  const key=btn.dataset.key; const picked=eventCatalog.find(e=>[e.eventNo,e.event,e.section,e.style,e.division].join('|')===key); if(!picked)return;
  const idx=Number(row.dataset.i); groups[selected].entries[idx]={...groups[selected].entries[idx],...picked,backNo:groups[selected].backNo,competitor:groups[selected].competitor};
  renderEditor();
 });
}
function openMenu(row){document.querySelectorAll('.event-menu').forEach(m=>m.classList.add('hidden'));const menu=row.querySelector('.event-menu');menu.classList.remove('hidden');fillMenu(row,'')}
function renderEditor(){
 if(selected<0||!groups[selected]){$('backNo').value='';$('competitor').value='';$('entryRows').innerHTML='';return}
 const g=groups[selected]; $('backNo').value=g.backNo; $('competitor').value=g.competitor; $('entryRows').innerHTML=g.entries.map(rowHtml).join('');
 $('entryRows').querySelectorAll('.entry-picker-row').forEach(row=>{row.querySelector('.event-no-input').onclick=()=>openMenu(row);row.querySelector('.event-open').onclick=()=>openMenu(row)});
 $('entryRows').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{commitEditor();groups[selected].entries.splice(Number(b.dataset.del),1);renderEditor()})
}
function commitEditor(){if(selected<0||!groups[selected])return;const g=groups[selected];g.backNo=$('backNo').value.trim();g.competitor=$('competitor').value.trim();g.entries=[...$('entryRows').querySelectorAll('.entry-row')].map(row=>{const old=g.entries[Number(row.dataset.i)]||{};const out={...old};row.querySelectorAll('[data-k]').forEach(inp=>out[inp.dataset.k]=inp.value.trim());out.backNo=g.backNo;out.competitor=g.competitor;out.entryType=out.entryType||out.division||'';return out}).filter(e=>e.event&&e.section)}
$('filter').oninput=renderList;$('backNo').oninput=()=>{if(selected>=0)groups[selected].backNo=$('backNo').value;renderList()};$('competitor').oninput=()=>{if(selected>=0)groups[selected].competitor=$('competitor').value;renderList()};
$('newPlayer').onclick=()=>{commitEditor();groups.push({backNo:'',competitor:'',entries:[]});selected=groups.length-1;renderList();renderEditor()};
$('addEntry').onclick=()=>{if(selected<0)$('newPlayer').click();commitEditor();groups[selected].entries.push({eventNo:'',event:'',section:'',style:'',division:'',entryType:''});renderEditor();setTimeout(()=>{const rows=$('entryRows').querySelectorAll('.entry-row');if(rows.length)openMenu(rows[rows.length-1])},0)};
$('deletePlayer').onclick=()=>{if(selected>=0&&confirm('Delete this player and all entries?')){groups.splice(selected,1);selected=Math.min(selected,groups.length-1);renderList();renderEditor()}};
$('loadBase').onclick=loadAll;
$('saveAll').onclick=async()=>{commitEditor();const players=flattenGroups(groups).filter(x=>x.backNo&&x.competitor&&x.event&&x.section);const worker=sessionStorage.getItem('apdcWorkerName')||'Unknown';const device=sessionStorage.getItem('apdcDeviceInfo')||deviceInfo();status('Saving entries and creating restore point…');const currentSnap=await get(ref(db,'apdcPublic/players'));const current=currentSnap.exists()&&Array.isArray(currentSnap.val())?currentSnap.val():[];const versionsSnap=await get(ref(db,'apdcPublic/entryVersions'));let versions=versionsSnap.exists()&&Array.isArray(versionsSnap.val())?versionsSnap.val():[];versions.unshift({id:Date.now(),createdAt:new Date().toISOString(),worker,device,records:current.length,players:current});versions=versions.slice(0,10);await set(ref(db,'apdcPublic/entryVersions'),versions);await set(ref(db,'apdcPublic/players'),players);await set(ref(db,'apdcPublic/meta'),{updatedAt:new Date().toISOString(),updatedBy:worker,device});status(`Saved ${players.length} entry records. Restore point created (${versions.length}/10).`)};
document.addEventListener('click',e=>{if(!e.target.closest('.event-no-wrap'))document.querySelectorAll('.event-menu').forEach(m=>m.classList.add('hidden'))});
