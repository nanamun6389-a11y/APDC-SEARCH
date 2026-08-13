const ROOT="https://apdc-judge-default-rtdb.asia-southeast1.firebasedatabase.app";
const host=document.getElementById("competitionChooser"),list=document.getElementById("competitionList");
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
async function load(){
  try{
    const r=await fetch(`${ROOT}/publishedCompetitions.json?v=${Date.now()}`,{cache:"no-store"});
    if(!r.ok)return; const obj=await r.json()||{};
    const rows=Object.values(obj).filter(x=>x&&x.published).sort((a,b)=>Number(b.publishedAt||0)-Number(a.publishedAt||0));
    if(!rows.length)return;
    host.style.display="block";
    list.innerHTML=rows.map(c=>`<a href="entry.html?competition=${encodeURIComponent(c.id)}" style="display:flex;justify-content:space-between;align-items:center;border:1px solid #111;padding:13px 14px;color:#000;text-decoration:none;background:#fff"><span><strong>${esc(c.name||c.id)}</strong><br><small>${esc(c.date||"")}${c.venue?" · "+esc(c.venue):""}</small></span><span style="font-weight:900">→</span></a>`).join("");
  }catch(e){console.warn(e)}
}
load();
