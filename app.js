let rows=[];
const input=document.getElementById('searchInput');
const results=document.getElementById('results');
const summary=document.getElementById('summary');
const clearBtn=document.getElementById('clearBtn');

const text=v=>String(v??'');
const norm=v=>text(v).toLowerCase().replace(/\s+/g,' ').trim();

function groupRows(list){
  const map=new Map();
  for(const r of list){
    const key=`${r.backNo}||${r.competitor}`;
    if(!map.has(key)) map.set(key,{backNo:r.backNo,competitor:r.competitor,entries:[]});
    map.get(key).entries.push(r);
  }
  return [...map.values()].sort((a,b)=>{
    const an=Number(a.backNo),bn=Number(b.backNo);
    if(Number.isFinite(an)&&Number.isFinite(bn)&&an!==bn)return an-bn;
    return a.competitor.localeCompare(b.competitor);
  });
}
function escapeHtml(s){return text(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
function render(){
  const q=norm(input.value);
  const filtered=!q?rows:rows.filter(r=>norm([r.eventNo,r.section,r.style,r.division,r.event,r.backNo,r.competitor,r.entryType].join(' ')).includes(q));
  const groups=groupRows(filtered);
  summary.textContent=q?`${groups.length} competitor(s) · ${filtered.length} entry record(s)`:`${groups.length} competitor(s) · ${filtered.length} entry record(s)`;
  if(!groups.length){results.innerHTML='<div class="empty">No matching entry found.</div>';return;}
  results.innerHTML=groups.map(g=>`<article class="group"><div class="group-head"><div class="name">${escapeHtml(g.competitor)}</div><div class="back">BACK NO. ${escapeHtml(g.backNo||'-')}</div></div>${g.entries.sort((a,b)=>(Number(a.eventNo)||9999)-(Number(b.eventNo)||9999)).map(r=>`<div class="entry"><div class="event-no">${r.eventNo?`#${escapeHtml(r.eventNo)}`:'-'}</div><div><div class="event-title">${escapeHtml(r.event)}</div><div class="meta">${escapeHtml(r.section)} · ${escapeHtml(r.style)} · ${escapeHtml(r.entryType)}</div></div></div>`).join('')}</article>`).join('');
}
fetch('players.json').then(r=>{if(!r.ok)throw new Error('players.json load failed');return r.json()}).then(data=>{rows=data;render()}).catch(()=>{summary.textContent='';results.innerHTML='<div class="empty">Data could not be loaded. Upload all files together to the web server.</div>'});
input.addEventListener('input',render);
clearBtn.addEventListener('click',()=>{input.value='';input.focus();render()});
