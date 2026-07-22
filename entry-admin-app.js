import {db,ref,get,set,loadPlayers,playerGroups,flattenGroups,fetchJson} from './data-common.js';
let groups=[],selected=-1,eventCatalog=[];
const $=id=>document.getElementById(id),status=t=>$('status').textContent=t;
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function deviceInfo(){const ua=navigator.userAgent;let device=/iPhone/i.test(ua)?'iPhone':/iPad/i.test(ua)?'iPad':/Android/i.test(ua)?(/Samsung|SM-/i.test(ua)?'Samsung Android':'Android device'):/Windows/i.test(ua)?'Windows PC':/Macintosh/i.test(ua)?'Mac':'Unknown device';let browser=/SamsungBrowser/i.test(ua)?'Samsung Internet':/Edg/i.test(ua)?'Edge':/CriOS|Chrome/i.test(ua)?'Chrome':/Safari/i.test(ua)?'Safari':'Browser';return `${device} · ${browser}`}
function initEntryAdmin(){
  $('loginBox').classList.add('hidden'); $('adminBox').classList.remove('hidden');
  const d=sessionStorage.getItem('apdcDeviceInfo')||deviceInfo(); $('sessionInfo').textContent=`Device: ${d}`; loadAll();
}
initEntryAdmin();
async function loadAll(){
 status('Loading players and saved sections…');
 try{
   const [players,settings]=await Promise.all([loadPlayers(),fetchJson('event-settings.json')]);
   groups=playerGroups(players); eventCatalog=buildEventCatalog(players,settings); selected=-1;
   renderList(); renderEditor(); status(`Loaded ${groups.length} players · ${eventCatalog.length} saved sections.`);
 }catch(err){console.error(err);status('Could not load player/section data. Please refresh once.')}
}
function buildEventCatalog(players,settings){
 const map=new Map();
 const add=e=>{
   const eventNo=String(e.eventNo||e.eventNumber||e.sourceEventNo||e.no||'').trim();
   const event=String(e.event||e.title||'').trim(); const section=String(e.section||'').trim();
   const style=String(e.style||'').trim(); const division=String(e.division||e.entryType||'').trim();
   if(!eventNo||!event||/break|lunch|opening|award/i.test(event))return;
   const key=[eventNo,event,section,style,division].join('|');
   if(!map.has(key))map.set(key,{eventNo,event,section,style,division,entryType:e.entryType||division||''});
 };
 (players||[]).forEach(add); (Array.isArray(settings)?settings:Object.values(settings||{})).forEach(add);
 return [...map.values()].sort((a,b)=>Number(a.eventNo)-Number(b.eventNo)||(`${a.section} ${a.event}`).localeCompare(`${b.section} ${b.event}`)));
}
function renderList(){
 const q=String($('filter').value||'').trim().toLowerCase();
 const visible=groups.map((g,i)=>({g,i})).filter(x=>`${x.g.backNo} ${x.g.competitor}`.toLowerCase().includes(q));
 $('playerList').innerHTML=visible.map(({g,i})=>`<div class="player-edit-item ${i===selected?'active':''}" data-i="${i}"><div class="player-edit-info"><b>NO. ${esc(g.backNo)}</b><span>${esc(g.competitor)}</span><small>${g.entries.length} entries</small></div><button type="button" class="player-edit-btn" data-edit="${i}">EDIT</button></div>`).join('')||'<p class="empty-note">No player found.</p>';
 $('playerList').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openPlayer(Number(b.dataset.edit)));
}
function openPlayer(i){commitEditor();selected=i;renderList();renderEditor();$('playerEditor').scrollIntoView({behavior:'smooth',block:'start'})}
function closePlayer(){commitEditor();selected=-1;renderList();renderEditor()}
function rowHtml(e,i){return `<div class="entry-row entry-picker-row" data-i="${i}">
 <div class="event-no-wrap picker-trigger"><input class="event-no-input" value="${esc(e.eventNo||'')}" placeholder="Event No." readonly><button type="button" class="event-open" title="Select saved section">▾</button><div class="event-menu hidden"></div></div>
 <input class="picker-trigger-input" data-k="event" value="${esc(e.event||'')}" placeholder="Event" readonly>
 <input class="picker-trigger-input" data-k="section" value="${esc(e.section||'')}" placeholder="Section" readonly>
 <input data-k="style" value="${esc(e.style||'')}" placeholder="Style" readonly>
 <input data-k="division" value="${esc(e.division||'')}" placeholder="Division" readonly>
 <button type="button" class="entry-delete" data-del="${i}">×</button></div>`}
function fillMenu(row,query=''){
 const menu=row.querySelector('.event-menu'); const q=query.toLowerCase();
 const list=eventCatalog.filter(e=>`${e.eventNo} ${e.event} ${e.section} ${e.style} ${e.division}`.toLowerCase().includes(q));
 menu.innerHTML=`<div class="event-menu-search"><input placeholder="Search event no. / event / section" value="${esc(query)}"></div><div class="event-menu-list">${list.map(e=>`<button type="button" data-key="${esc([e.eventNo,e.event,e.section,e.style,e.division].join('|'))}"><b>EVENT ${esc(e.eventNo)}</b><span>${esc(e.event)}</span><small>${esc(e.section)} · ${esc(e.style)}${e.division?' · '+esc(e.division):''}</small></button>`).join('')||'<p>No saved section found.</p>'}</div>`;
 const search=menu.querySelector('input'); search.oninput=()=>fillMenu(row,search.value); setTimeout(()=>search.focus(),0);
 menu.querySelectorAll('[data-key]').forEach(btn=>btn.onclick=()=>{
  const picked=eventCatalog.find(e=>[e.eventNo,e.event,e.section,e.style,e.division].join('|')===btn.dataset.key); if(!picked)return;
  const idx=Number(row.dataset.i); groups[selected].entries[idx]={...groups[selected].entries[idx],...picked,backNo:groups[selected].backNo,competitor:groups[selected].competitor}; renderEditor();
 });
}
function openMenu(row){document.querySelectorAll('.event-menu').forEach(m=>m.classList.add('hidden'));const menu=row.querySelector('.event-menu');menu.classList.remove('hidden');fillMenu(row,'')}
function renderEditor(){
 const editor=$('playerEditor');
 if(selected<0||!groups[selected]){editor.classList.add('hidden');$('backNo').value='';$('competitor').value='';$('entryRows').innerHTML='';return}
 editor.classList.remove('hidden'); const g=groups[selected]; $('editorName').textContent=g.competitor||'NEW PLAYER'; $('backNo').value=g.backNo; $('competitor').value=g.competitor;
 $('entryRows').innerHTML=g.entries.map(rowHtml).join('')||'<p class="empty-note">No entries. Press ADD ENTRY and select a saved section.</p>';
 $('entryRows').querySelectorAll('.entry-picker-row').forEach(row=>{
   row.querySelector('.event-no-input').onclick=()=>openMenu(row); row.querySelector('.event-open').onclick=()=>openMenu(row);
   row.querySelectorAll('.picker-trigger-input').forEach(inp=>inp.onclick=()=>openMenu(row));
 });
 $('entryRows').querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{commitEditor();groups[selected].entries.splice(Number(b.dataset.del),1);renderEditor();renderList()});
}
function commitEditor(){
 if(selected<0||!groups[selected]||$('playerEditor').classList.contains('hidden'))return;
 const g=groups[selected];g.backNo=$('backNo').value.trim();g.competitor=$('competitor').value.trim();
 g.entries=[...$('entryRows').querySelectorAll('.entry-row')].map(row=>{const old=g.entries[Number(row.dataset.i)]||{};const out={...old};row.querySelectorAll('[data-k]').forEach(inp=>out[inp.dataset.k]=inp.value.trim());out.eventNo=row.querySelector('.event-no-input')?.value.trim()||old.eventNo||'';out.backNo=g.backNo;out.competitor=g.competitor;out.entryType=out.entryType||out.division||'';return out}).filter(e=>e.event&&e.section);
}
$('filter').oninput=renderList;
$('backNo').oninput=()=>{if(selected>=0){groups[selected].backNo=$('backNo').value;renderList()}};
$('competitor').oninput=()=>{if(selected>=0){groups[selected].competitor=$('competitor').value;$('editorName').textContent=$('competitor').value||'NEW PLAYER';renderList()}};
$('closeEditor').onclick=closePlayer;
$('newPlayer').onclick=()=>{commitEditor();groups.push({backNo:'',competitor:'',entries:[]});openPlayer(groups.length-1)};
$('addEntry').onclick=()=>{if(selected<0)return;commitEditor();groups[selected].entries.push({eventNo:'',event:'',section:'',style:'',division:'',entryType:''});renderEditor();setTimeout(()=>{const rows=$('entryRows').querySelectorAll('.entry-row');if(rows.length)openMenu(rows[rows.length-1])},0)};
$('deletePlayer').onclick=()=>{if(selected>=0&&confirm('Delete this player and all entries?')){groups.splice(selected,1);selected=-1;renderList();renderEditor()}};
$('loadBase').onclick=loadAll;
$('saveAll').onclick=async()=>{
 commitEditor();const players=flattenGroups(groups).filter(x=>x.backNo&&x.competitor&&x.event&&x.section);const worker='Admin';const device=sessionStorage.getItem('apdcDeviceInfo')||deviceInfo();status('Saving entries and creating restore point…');
 try{const currentSnap=await get(ref(db,'apdcPublic/players'));const current=currentSnap.exists()&&Array.isArray(currentSnap.val())?currentSnap.val():[];const versionsSnap=await get(ref(db,'apdcPublic/entryVersions'));let versions=versionsSnap.exists()&&Array.isArray(versionsSnap.val())?versionsSnap.val():[];versions.unshift({id:Date.now(),createdAt:new Date().toISOString(),worker,device,records:current.length,players:current});versions=versions.slice(0,10);await set(ref(db,'apdcPublic/entryVersions'),versions);await set(ref(db,'apdcPublic/players'),players);await set(ref(db,'apdcPublic/meta'),{updatedAt:new Date().toISOString(),updatedBy:worker,device});status(`Saved ${players.length} entry records. Restore point created (${versions.length}/10).`)}catch(err){console.error(err);status('SAVE FAILED. Check Firebase connection and try again.')}
};
document.addEventListener('click',e=>{if(!e.target.closest('.event-no-wrap')&&!e.target.classList.contains('picker-trigger-input'))document.querySelectorAll('.event-menu').forEach(m=>m.classList.add('hidden'))});
