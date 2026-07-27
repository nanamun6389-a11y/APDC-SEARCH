let TT=[];
let latestPlayers=[];
let backNumbersByEvent=new Map();
let currentFloorIndex=-1;
let QUALIFIERS={};
let searchEntryCounts=null;
let remoteTimetableLoaded=false;
let localTimingVersion='';

const APDC_FIREBASE_PLAYERS_URL='https://apdc-judge-default-rtdb.asia-southeast1.firebasedatabase.app/apdcPublic/players.json';
const APDC_SEARCH_PLAYERS_URL='https://nanamun6389-a11y.github.io/APDC-SEARCH/players.json';

const $=id=>document.getElementById(id);
const TIMETABLE_ACCESS_PASSWORD='0070';
let timetableStarted=false;
function unlockTimetable(){
  sessionStorage.setItem('apdcTimetableUnlocked','yes');
  const gate=$('ttPasswordGate');
  const protectedArea=$('ttProtected');
  if(gate){ gate.classList.add('hidden'); gate.hidden=true; }
  if(protectedArea){ protectedArea.classList.remove('hidden'); protectedArea.hidden=false; }
  if($('ttPasswordMessage')) $('ttPasswordMessage').textContent='';
  if(!timetableStarted){ timetableStarted=true; init(); }
}
function lockTimetable(){
  const gate=$('ttPasswordGate');
  const protectedArea=$('ttProtected');
  if(gate){ gate.classList.remove('hidden'); gate.hidden=false; }
  if(protectedArea){ protectedArea.classList.add('hidden'); protectedArea.hidden=true; }
}
function checkTimetablePassword(){
  const input=$('ttPasswordInput');
  const msg=$('ttPasswordMessage');
  if((input?.value||'').trim()===TIMETABLE_ACCESS_PASSWORD){ unlockTimetable(); }
  else {
    if(msg) msg.textContent='INCORRECT PASSWORD';
    if(input){ input.value=''; input.focus(); }
  }
}

function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function normalizeRows(value){
  if(Array.isArray(value)) return value.filter(Boolean);
  if(value&&typeof value==='object') return Object.keys(value).sort((a,b)=>Number(a)-Number(b)).map(k=>value[k]).filter(Boolean);
  return [];
}
async function fetchLatestPlayers(){
  const urls=[APDC_FIREBASE_PLAYERS_URL,APDC_SEARCH_PLAYERS_URL,'./players.json'];
  let lastError=null;
  for(const url of urls){
    try{
      const r=await fetch(`${url}?v=${Date.now()}`,{cache:'no-store'});
      if(!r.ok) throw new Error(`${url} HTTP ${r.status}`);
      const data=await r.json();
      if(Array.isArray(data)&&data.length) return data;
      throw new Error(`${url} returned empty/non-array data`);
    }catch(e){lastError=e;}
  }
  throw lastError||new Error('No player source available');
}
async function loadSearchEntryCounts(){
  try{
    const data=await fetchLatestPlayers();
    latestPlayers=Array.isArray(data)?data:[];
    const counts=new Map();
    backNumbersByEvent=new Map();
    for(const p of latestPlayers){
      const no=String(p?.eventNo??'').trim();
      const ev=String(p?.event??'').trim();
      const backNo=String(p?.backNo??'').trim();
      if(no){
        counts.set(no,(counts.get(no)||0)+1);
        if(backNo){
          if(!backNumbersByEvent.has(no)) backNumbersByEvent.set(no,new Set());
          backNumbersByEvent.get(no).add(backNo);
        }
      }
      if(ev) counts.set(`event:${ev.toLowerCase()}`,(counts.get(`event:${ev.toLowerCase()}`)||0)+1);
    }
    return counts;
  }catch(e){console.warn('Entry sync unavailable',e);return null;}
}
function applySearchEntryCounts(rows,counts){
  if(!Array.isArray(rows)) return [];
  if(!counts) return rows.map(r=>({...r}));
  const seen=new Set();
  return rows.map(original=>{
    let row={...original};
    const sourceNo=String(row?.sourceEventNo??'').trim();
    if(sourceNo&&backNumbersByEvent.has(sourceNo)) row.backNumbers=Array.from(backNumbersByEvent.get(sourceNo)).sort((a,b)=>Number(a)-Number(b));
    else if(typeof row.backNumbers==='string') row.backNumbers=row.backNumbers.split(',').map(x=>x.trim()).filter(Boolean);
    const eventName=String(row?.event??'').trim();
    if(eventName.includes('+')){
      const vals=eventName.split('+').map(x=>counts.get(`event:${x.trim().toLowerCase()}`));
      if(vals.length&&vals.every(Number.isFinite)) row.entries=String(vals.reduce((a,b)=>a+b,0));
    }else if(sourceNo&&!seen.has(sourceNo)&&counts.has(sourceNo)){
      seen.add(sourceNo); row.entries=String(counts.get(sourceNo));
    }
    return row;
  });
}
function sourceKey(row){return String(row?.sourceEventNo||row?.event||'').trim();}
function roundText(row){return String(row?.round||'').toLowerCase();}
function qualifierStateForRow(row,index){
  const source=sourceKey(row), round=roundText(row);
  const prior=TT.slice(0,index).filter(r=>sourceKey(r)===source);
  let key='';
  if(round.includes('semi')&&prior.some(r=>roundText(r).includes('quarter'))) key='semi';
  if(round.includes('final')&&prior.some(r=>roundText(r).includes('semi'))) key='final';
  let base=Array.isArray(row?.backNumbers)?row.backNumbers:(typeof row?.backNumbers==='string'?row.backNumbers.split(','):[]);
  if(!key) return {requiresSaved:false,saved:true,numbers:base.map(String).map(x=>x.trim()).filter(Boolean).sort((a,b)=>Number(a)-Number(b))};
  const bucket=QUALIFIERS?.[encodeURIComponent(source)]||QUALIFIERS?.[source]||{};
  const saved=Object.prototype.hasOwnProperty.call(bucket,key)&&Array.isArray(bucket[key]);
  return {requiresSaved:true,saved,numbers:saved?bucket[key].map(String).filter(Boolean).sort((a,b)=>Number(a)-Number(b)):[]};
}
function render(){
  const q=($('ttSearch')?.value||'').trim();
  const qLower=q.toLowerCase();
  let wantedBackNos=null;
  if(q){
    if(/^\d+$/.test(q)) wantedBackNos=new Set([String(Number(q))]);
    else wantedBackNos=new Set(latestPlayers.filter(p=>String(p?.competitor??'').toLowerCase().includes(qLower)).map(p=>String(p?.backNo??'').trim()).filter(Boolean));
  }
  const rows=TT.map((x,index)=>({x,index})).filter(({x,index})=>{
    if(!q) return true;
    if(!wantedBackNos?.size) return false;
    const state=qualifierStateForRow(x,index);
    if(state.requiresSaved&&!state.saved) return false;
    return state.numbers.some(n=>wantedBackNos.has(String(n).trim()));
  });
  $('ttCards').innerHTML=rows.map(({x,index})=>{
    const state=qualifierStateForRow(x,index);
    const matched=q?state.numbers.filter(n=>wantedBackNos?.has(String(n).trim())):[];
    const current=index===currentFloorIndex;
    return `<article class="tt-card ${q?'tt-search-result':''} ${current?'tt-current':''}" data-index="${index}" data-start="${esc(x.start)}">
      ${q?'':`<div class="tt-time">${esc(x.start)}</div>`}
      <div class="tt-main">
        <div class="tt-topline">
          <span class="tt-run">${q&&matched.length?`BACK NO. ${matched.map(esc).join(' · ')}`:(x.no?`EVENT ${esc(x.no)}`:'')}</span>
          <span class="tt-round">${esc(x.round)}</span>
          ${current?'<span class="tt-now-badge">NOW</span>':''}
        </div>
        <h2>${esc(x.event).replace(/\n/g,'<br>')}</h2>
        <div class="tt-meta">${[x.section,x.division,x.style].filter(Boolean).map(esc).join(' · ')}</div>
        ${x.entries?`<div class="tt-info"><b>ENTRIES</b> ${esc(x.entries)}</div>`:''}
        ${x.danceOrder?`<div class="tt-info"><b>DANCE</b> ${esc(x.danceOrder)}</div>`:''}
        ${state.numbers.length?`<div class="tt-info tt-backnos"><b>BACK NO.</b> ${state.numbers.map(esc).join(' · ')}</div>`:''}
        ${x.note?`<div class="tt-note">${esc(x.note)}</div>`:''}
      </div>
      ${q?'':`<div class="tt-duration">${esc(x.durationText||x.duration)}${x.durationText?'':(x.duration?' min':'')}</div>`}
    </article>`;
  }).join('')||'<div class="message">No timetable results.</div>';
}
async function loadDefault(){
  try{
    const r=await fetch(`./timetable-data.json?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok) throw new Error(`HTTP ${r.status}`);
    const d=await r.json();
    if(d.summary) $('ttSummary').textContent=d.summary;
    localTimingVersion=String(d.timingVersion||'');
    return normalizeRows(d.rows);
  }catch(e){console.warn('Default timetable load failed',e);return [];}
}
function updateCurrentFromState(state){
  if(!state||typeof state!=='object') return;
  let idx=Number(state.timetableIndex);
  if(!Number.isInteger(idx)||idx<0||idx>=TT.length){
    const ev=String(state.eventNo??'').trim();
    if(ev) idx=TT.findIndex(r=>String(r.no??'').trim()===ev||String(r.sourceEventNo??'').trim()===ev);
  }
  if(Number.isInteger(idx)&&idx>=0&&idx<TT.length&&idx!==currentFloorIndex){currentFloorIndex=idx;render();}
}
async function connectFirebase(){
  try{
    const [{initializeApp,getApps},{getDatabase,ref,get,onValue},{firebaseConfig}]=await Promise.all([
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js'),
      import('./firebase-config.js?v=20260727-live-sync-v3')
    ]);
    const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
    const db=getDatabase(app);

    const ttRef=ref(db,'apdcPublic/timetable');
    const first=await get(ttRef);
    if(first.exists()){
      const val=first.val()||{};
      const rows=normalizeRows(val.rows??val);
      const remoteVersion=String(val.timingVersion||'');
      const remoteIsCurrent=!localTimingVersion || (remoteVersion && remoteVersion>=localTimingVersion);
      if(rows.length && remoteIsCurrent){TT=applySearchEntryCounts(rows,searchEntryCounts);remoteTimetableLoaded=true;if(val.summary)$('ttSummary').textContent=val.summary;render();}
    }
    onValue(ttRef,snap=>{
      if(!snap.exists()) return;
      const val=snap.val()||{};
      const rows=normalizeRows(val.rows??val);
      if(!rows.length) return;
      const remoteVersion=String(val.timingVersion||'');
      const remoteIsCurrent=!localTimingVersion || (remoteVersion && remoteVersion>=localTimingVersion);
      if(!remoteIsCurrent) return;
      TT=applySearchEntryCounts(rows,searchEntryCounts); remoteTimetableLoaded=true;
      if(val.summary) $('ttSummary').textContent=val.summary;
      render();
    });

    onValue(ref(db,'qualifiers'),snap=>{QUALIFIERS=snap.val()||{};render();});
    onValue(ref(db,'floorStatus'),snap=>updateCurrentFromState(snap.val()));
    onValue(ref(db,'apdcPublic/liveState'),snap=>{if(currentFloorIndex<0)updateCurrentFromState(snap.val());});
    return remoteTimetableLoaded;
  }catch(e){console.warn('Firebase unavailable',e);return false;}
}
async function init(){
  searchEntryCounts=await loadSearchEntryCounts();
  // Load the packaged timetable first. This prevents an older Firebase timetable
  // from masking a newly deployed timing update.
  const fallback=await loadDefault();
  TT=applySearchEntryCounts(fallback,searchEntryCounts);
  render();
  await connectFirebase();
  if(!TT.length) $('ttCards').innerHTML='<div class="message">TIMETABLE LOAD ERROR · Please refresh once.</div>';
}
$('ttSearch')?.addEventListener('input',render);
$('ttNowBtn')?.addEventListener('click',()=>{
  const current=document.querySelector('.tt-card.tt-current');
  if(current){current.scrollIntoView({behavior:'smooth',block:'center'});current.classList.add('tt-highlight');setTimeout(()=>current.classList.remove('tt-highlight'),1600);return;}
  $('ttCards')?.scrollIntoView({behavior:'smooth',block:'start'});
});
$('ttPasswordBtn')?.addEventListener('click',checkTimetablePassword);
$('ttPasswordInput')?.addEventListener('keydown',e=>{if(e.key==='Enter')checkTimetablePassword();});
if(sessionStorage.getItem('apdcTimetableUnlocked')==='yes') unlockTimetable();
else { lockTimetable(); setTimeout(()=>$('ttPasswordInput')?.focus(),0); }
