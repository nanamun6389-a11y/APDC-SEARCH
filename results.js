const searchEl=document.getElementById("resultSearch");
const summaryEl=document.getElementById("resultSummary");
const listEl=document.getElementById("resultList");
let RESULTS=[];

function esc(value){
  return String(value??"").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
}
function norm(value){
  return String(value??"").trim().toLowerCase().replace(/\s+/g," ");
}
function matches(row,query){
  if(!query)return true;
  if(/^\d+$/.test(query)) return String(row.backNo).trim()===query;
  const terms=query.split(" ").filter(Boolean);
  const name=norm(row.name);
  return terms.every(term=>name.includes(term));
}
function render(){
  const q=norm(searchEl.value);
  const filtered=RESULTS.filter(row=>matches(row,q));
  summaryEl.textContent=q
    ? `${filtered.length.toLocaleString()} RESULTS FOUND`
    : `${RESULTS.length.toLocaleString()} FINAL RESULT RECORDS`;

  if(!filtered.length){
    listEl.innerHTML='<div class="results-empty">NO RESULTS FOUND.<br>Check the back number or player name.</div>';
    return;
  }
  listEl.innerHTML=filtered.map(row=>`
    <article class="result-row">
      <div class="result-place">${esc(row.place)}</div>
      <div>
        <div class="result-name">${esc(row.name)}</div>
        <div class="result-category">${esc(row.category)}</div>
      </div>
      <div class="result-back"><span>BACK NO.</span><strong>${esc(row.backNo||"—")}</strong></div>
    </article>
  `).join("");
}

fetch("results.json",{cache:"no-store"})
  .then(r=>{if(!r.ok)throw new Error("Could not load results.json");return r.json();})
  .then(data=>{RESULTS=Array.isArray(data)?data:[];render();})
  .catch(err=>{
    console.error(err);
    summaryEl.textContent="RESULTS UNAVAILABLE";
    listEl.innerHTML='<div class="results-empty">RESULTS COULD NOT BE LOADED.</div>';
  });

searchEl.addEventListener("input",render);
searchEl.addEventListener("keydown",e=>{
  if(e.key==="Escape"){searchEl.value="";render();}
});
