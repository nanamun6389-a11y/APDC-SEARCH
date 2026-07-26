
const gate=document.getElementById('ttPasswordGate');
const protectedBox=document.getElementById('ttProtected');
const input=document.getElementById('ttPasswordInput');
const btn=document.getElementById('ttPasswordBtn');
const msg=document.getElementById('ttPasswordMessage');
const ACCESS_KEY='apdc_judge_access_ok';
const LOCAL_KEY='apdc_timetable_manager_backup_v4';

let TT=[];
let firebaseReady=false;
let ttDb=null;
let ttRef=null;
let ttOnValue=null;
let searchEntryCounts=null;
let latestPlayers=[];
let backNumbersByEvent=new Map();
let currentFloorIndex=-1;
let currentFloorStatus={};
let QUALIFIERS={};

const APDC_FIREBASE_PLAYERS_URL='https://apdc-judge-default-rtdb.asia-southeast1.firebasedatabase.app/apdcPublic/players.json';
const APDC_SEARCH_PLAYERS_URL='https://nanamun6389-a11y.github.io/APDC-SEARCH/players.json';
async function fetchLatestPlayers(){
  const urls=[APDC_FIREBASE_PLAYERS_URL,APDC_SEARCH_PLAYERS_URL,'./players.json'];
  let lastError=null;
  for(const url of urls){
    try{
      const r=await fetch(`${url}?v=${Date.now()}`,{cache:'no-store'});
      if(!r.ok) throw new Error(`${url} HTTP ${r.status}`);
      const data=await r.json();
      if(Array.isArray(data)&&data.length)return data;
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
    for(const p of data){
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
      if(ev){const k=`event:${ev.toLowerCase()}`;counts.set(k,(counts.get(k)||0)+1);}
    }
    return counts;
  }catch(e){
    console.warn('Entry auto-sync unavailable; keeping timetable values',e);
    return null;
  }
}
function applySearchEntryCounts(rows,counts){
  if(!Array.isArray(rows)||!counts) return rows;
  const seen=new Set();
  return rows.map(row=>{
    const sourceNo=String(row?.sourceEventNo??'').trim();
    const linkedBackNos=sourceNo&&backNumbersByEvent.has(sourceNo)
      ? Array.from(backNumbersByEvent.get(sourceNo)).sort((a,b)=>Number(a)-Number(b))
      : (Array.isArray(row?.backNumbers)?row.backNumbers:[]);
    row={...row,backNumbers:linkedBackNos};
    const eventName=String(row?.event??'').trim();
    if(eventName.includes('+')){
      const parts=eventName.split('+').map(x=>x.trim().toLowerCase()).filter(Boolean);
      const vals=parts.map(x=>counts.get(`event:${x}`));
      if(parts.length&&vals.every(v=>Number.isFinite(v))) return {...row,entries:String(vals.reduce((a,b)=>a+b,0))};
      return row;
    }
    if(!sourceNo||seen.has(sourceNo)||!counts.has(sourceNo)) return row;
    seen.add(sourceNo);
    return {...row,entries:String(counts.get(sourceNo))};
  });
}


function normalizeRows(value){
  if(Array.isArray(value)) return value.filter(Boolean);
  if(value && typeof value==='object'){
    return Object.keys(value).sort((a,b)=>Number(a)-Number(b)).map(k=>value[k]).filter(Boolean);
  }
  return [];
}

function unlock(){
  sessionStorage.setItem(ACCESS_KEY,'1');
  gate.style.display='none';
  protectedBox.hidden=false;
  protectedBox.style.display='block';
  protectedBox.classList.remove('hidden');
  loadTimetable();
}
function check(){
  if(input.value.trim()==='0808'){unlock()}
  else{msg.textContent='Incorrect password';input.value='';input.focus();}
}
btn.addEventListener('click',check);
input.addEventListener('keydown',e=>{if(e.key==='Enter')check()});
if(sessionStorage.getItem(ACCESS_KEY)==='1') unlock();

function esc(s){
  return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}

function sourceKey(row){
  return String(row?.sourceEventNo||row?.event||'').trim();
}
function sameSource(a,b){
  return sourceKey(a)===sourceKey(b);
}
function roundText(row){
  return String(row?.round||'').toLowerCase();
}
function qualifierStateForRow(row,index){
  const source=sourceKey(row);
  const round=roundText(row);
  const prior=TT.slice(0,index).filter(r=>sameSource(r,row));
  let key='';

  // A Semi Final needs saved qualifiers only when a Quarter Final for the same
  // event was actually held earlier. A Semi that is the first round uses the
  // original entry list.
  if(round.includes('semi') && prior.some(r=>roundText(r).includes('quarter'))){
    key='semi';
  }
  // A Final/Grand Final needs saved finalists only when a Semi Final for the
  // same event was held earlier. Direct Finals keep their original entry list.
  if(round.includes('final') && prior.some(r=>roundText(r).includes('semi'))){
    key='final';
  }

  if(!key){
    const nums=Array.isArray(row?.backNumbers)?row.backNumbers.map(String).filter(Boolean):[];
    return {requiresSaved:false,saved:true,numbers:nums.sort((a,b)=>Number(a)-Number(b))};
  }

  const bucket=QUALIFIERS?.[encodeURIComponent(source)]||QUALIFIERS?.[source]||{};
  const saved=Object.prototype.hasOwnProperty.call(bucket,key) && Array.isArray(bucket[key]);
  const nums=saved?bucket[key].map(String).filter(Boolean).sort((a,b)=>Number(a)-Number(b)):[];
  return {requiresSaved:true,saved,numbers:nums};
}

function liveRoundLabel(v){
  const s=String(v||'').toLowerCase();
  if(s.includes('quarter')) return 'QUARTER FINAL';
  if(s.includes('semi')) return 'SEMI FINAL';
  if(s.includes('grand')) return 'GRAND FINAL';
  if(s.includes('final')) return 'FINAL';
  return String(v||'').toUpperCase();
}
function renderLiveNow(){
  const eventEl=document.getElementById('ttLiveEvent');
  const roundEl=document.getElementById('ttLiveRound');
  const bar=document.getElementById('ttLiveNow');
  if(!eventEl||!roundEl||!bar)return;
  const row=(Number.isInteger(currentFloorIndex)&&currentFloorIndex>=0)?TT[currentFloorIndex]:null;
  const now=String(currentFloorStatus?.now||row?.event||'').trim();
  const round=String(currentFloorStatus?.round||row?.round||'').trim();
  const no=String(row?.no||'').trim();
  if(!now){
    eventEl.textContent='WAITING';
    roundEl.textContent='';
    bar.classList.remove('is-live');
    return;
  }
  eventEl.textContent=`${no?`EVENT ${no} · `:''}${now}`;
  roundEl.textContent=liveRoundLabel(round);
  bar.classList.add('is-live');
}
function scrollToCurrent(){
  if(!Number.isInteger(currentFloorIndex)||currentFloorIndex<0)return;
  const card=document.querySelector(`.tt-card[data-index="${currentFloorIndex}"]`);
  if(card)card.scrollIntoView({behavior:'smooth',block:'center'});
}

function render(){
  const q=(document.getElementById('ttSearch').value||'').trim();
  const qLower=q.toLowerCase();
  let wantedBackNos=null;

  if(q){
    if(/^\d+$/.test(q)){
      // Numeric searches are BACK NUMBER only. Do not match event number, time, entries, etc.
      wantedBackNos=new Set([String(Number(q))]);
    }else{
      // Text searches are PLAYER NAME only. Resolve matching players to their back numbers.
      wantedBackNos=new Set(
        (latestPlayers||[])
          .filter(p=>String(p?.competitor??'').toLowerCase().includes(qLower))
          .map(p=>String(p?.backNo??'').trim())
          .filter(Boolean)
      );
    }
  }

  const rows=TT.map((x,index)=>({x,index})).filter(({x,index})=>{
    if(!q) return true;
    if(!wantedBackNos || wantedBackNos.size===0) return false;
    // For staged Semi/Final rounds, do not expose/search a result until the
    // previous round's qualifiers have actually been saved.
    const state=qualifierStateForRow(x,index);
    if(state.requiresSaved && !state.saved) return false;
    return state.numbers.some(n=>wantedBackNos.has(String(n).trim()));
  });

  const host=document.getElementById('ttCards');
  host.innerHTML=rows.map(({x,index})=>{
    const qualifierState=qualifierStateForRow(x,index);
    const rowBackNos=qualifierState.numbers.map(n=>String(n).trim());
    const matchedBackNos=q ? rowBackNos.filter(n=>wantedBackNos?.has(n)) : [];
    const searchLabel=q && matchedBackNos.length ? `BACK NO. ${matchedBackNos.map(esc).join(' · ')}` : '';
    const displayEntries=(qualifierState.requiresSaved&&qualifierState.saved) ? String(rowBackNos.length) : String(x.entries||'');
    const backNoLine=qualifierState.requiresSaved&&!qualifierState.saved
      ? '<div class="tt-info tt-pending"><b>BACK NO.</b> WAITING FOR RESULTS</div>'
      : (rowBackNos.length?`<div class="tt-info tt-backnos"><b>BACK NO.</b> ${rowBackNos.map(esc).join(' · ')}</div>`:'');
    return `
    <article class="tt-card ${q?'tt-search-result':''} ${index===currentFloorIndex?'tt-current':''}" data-index="${index}" data-start="${esc(x.start)}">
      ${q ? '' : `<div class="tt-time">${esc(x.start)}</div>`}
      <div class="tt-main">
        <div class="tt-topline">
          <span class="tt-run">${q ? searchLabel : (x.no ? `EVENT ${esc(x.no)}` : '')}</span>
          ${index===currentFloorIndex?'<span class="tt-now-badge">NOW</span>':''}
          <span class="tt-round">${esc(x.round)}</span>
        </div>
        <h2>${esc(x.event).replace(/\n/g,'<br>')}</h2>
        <div class="tt-meta">${[x.section,x.division,x.style].filter(Boolean).map(esc).join(' · ')}</div>
        ${displayEntries?`<div class="tt-info"><b>ENTRIES</b> ${esc(displayEntries)}</div>`:''}
        ${x.danceOrder?`<div class="tt-info"><b>DANCE</b> ${esc(x.danceOrder)}</div>`:''}
        ${backNoLine}
        ${x.note?`<div class="tt-note">${esc(x.note)}</div>`:''}
      </div>
      ${q ? '' : `<div class="tt-duration">${esc(x.durationText||x.duration)}${x.durationText?'':(x.duration?' min':'')}</div>`}
    </article>
  `;
  }).join('') || '<div class="message">No timetable results.</div>';
  renderLiveNow();
}

function loadLocal(){
  try{
    const saved=JSON.parse(localStorage.getItem(LOCAL_KEY)||'null');
    const rows=normalizeRows(saved?.rows);
    return rows.length ? rows : null;
  }catch(e){ return null; }
}

async function loadDefault(){
  const urls=[
    'timetable-data.json?v=20260722-unified-v2',
    './timetable-data.json?v=20260722-unified-v2'
  ];
  for(const url of urls){
    try{
      const r=await fetch(url,{cache:'no-store'});
      if(!r.ok) throw new Error('HTTP '+r.status);
      const d=await r.json();
      const rows=normalizeRows(d.rows);
      if(rows.length){
        document.getElementById('ttSummary').textContent=d.summary||'';
        return rows;
      }
    }catch(e){
      console.warn('Default timetable load failed',url,e);
    }
  }
  return null;
}

async function connectFirebase(){
  try{
    const [{initializeApp,getApps},{getDatabase,ref,get,onValue},{firebaseConfig}] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js"),
      import("./firebase-config.js?v=20260722-unified-v2")
    ]);
    const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);
    ttDb=getDatabase(app);
    ttRef=ref;
    ttOnValue=onValue;
    firebaseReady=true;

    let loadedRemote=false;
    try{
      const s=await get(ref(ttDb,'timetableOverride'));
      const v=s.val();
      const rows=normalizeRows(v?.rows);
      if(rows.length){
        TT=applySearchEntryCounts(rows,searchEntryCounts);
        render();
        loadedRemote=true;
      }
    }catch(e){
      console.warn('Firebase timetable initial read failed',e);
    }

    onValue(ref(ttDb,'timetableOverride'),snap=>{
      const v=snap.val();
      const rows=normalizeRows(v?.rows);
      if(rows.length){
        TT=applySearchEntryCounts(rows,searchEntryCounts);
        render();
      }
    });

    try{const qs=await get(ref(ttDb,'qualifiers'));QUALIFIERS=qs.val()||{};render();}catch(_){QUALIFIERS={};}
    onValue(ref(ttDb,'qualifiers'),snap=>{QUALIFIERS=snap.val()||{};render();});

    try{
      const fs=await get(ref(ttDb,'floorStatus'));
      currentFloorStatus=fs.val()||{};
      const idx=Number(currentFloorStatus?.timetableIndex);
      if(Number.isInteger(idx))currentFloorIndex=idx;
      render();
    }catch(e){console.warn('Current floor position read failed',e)}

    onValue(ref(ttDb,'floorStatus'),snap=>{
      currentFloorStatus=snap.val()||{};
      const idx=Number(currentFloorStatus?.timetableIndex);
      if(Number.isInteger(idx))currentFloorIndex=idx;
      render();
    });
    return loadedRemote;
  }catch(e){
    console.warn('Firebase unavailable; showing local/default timetable',e);
    return false;
  }
}

async function loadTimetable(){
  if(TT.length){render();return;}
  searchEntryCounts=await loadSearchEntryCounts();

  // SOURCE OF TRUTH: the timetable edited on the live JUDGE website.
  // Read Firebase first so SEARCH never prefers an older packaged/local order.
  const loadedRemote=await connectFirebase();

  // Emergency fallback only when the live Firebase timetable cannot be read.
  if(!loadedRemote){
    const localRows=loadLocal();
    if(localRows?.length){
      TT=applySearchEntryCounts(localRows,searchEntryCounts);
      render();
    }

    if(!TT.length){
      const defaultRows=await loadDefault();
      if(defaultRows?.length){
        TT=applySearchEntryCounts(defaultRows,searchEntryCounts);
        render();
      }
    }
  }

  if(!TT.length){
    document.getElementById('ttCards').innerHTML=
      '<div class="message">TIMETABLE LOAD ERROR · Please refresh once.</div>';
  }
}

// PUBLIC TIMETABLE: read-only. Nothing on this page writes MC/LIVE/Floor state.
const ttSearchInput=document.getElementById('ttSearch');
const ttSearchBtn=document.getElementById('ttSearchBtn');
function runTimetableSearch(){render();}
ttSearchBtn.addEventListener('click',runTimetableSearch);
ttSearchInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runTimetableSearch();}});
ttSearchInput.addEventListener('search',()=>{if(!ttSearchInput.value)render();});
document.getElementById('ttLiveNow')?.addEventListener('click',scrollToCurrent);
