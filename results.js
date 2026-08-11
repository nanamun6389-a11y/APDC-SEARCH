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
function sectionOf(category){
  const c=String(category||"");
  if(c.startsWith("Formation")) return "FORMATION";
  if(c.startsWith("Under 10")) return "UNDER 10";
  if(c.startsWith("Under 12")) return "UNDER 12";
  if(c.startsWith("Under 15")) return "UNDER 15";
  if(c.startsWith("Under 18")) return "UNDER 18";
  if(c.startsWith("Over 19")) return "OVER 19";
  if(c.startsWith("Over 35")) return "OVER 35";
  if(c.startsWith("Asia Pacific Amateur")||c.startsWith("Amateur")||c.startsWith("Korea Closed Amateur")) return "AMATEUR";
  if(c.startsWith("Senior")) return "SENIOR";
  if(c.startsWith("Mania")) return "MANIA";
  if(c.startsWith("Pro-Am")) return "PRO-AM";
  return "OTHER";
}
const SECTION_ORDER=["FORMATION","UNDER 10","UNDER 12","UNDER 15","UNDER 18","OVER 19","OVER 35","AMATEUR","SENIOR","MANIA","PRO-AM","OTHER"];

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

  const groups=new Map();
  filtered.forEach(row=>{
    const sec=sectionOf(row.category);
    if(!groups.has(sec)) groups.set(sec,new Map());
    const eventName=String(row.category||"OTHER").trim()||"OTHER";
    if(!groups.get(sec).has(eventName)) groups.get(sec).set(eventName,[]);
    groups.get(sec).get(eventName).push(row);
  });

  listEl.innerHTML=SECTION_ORDER.filter(sec=>groups.has(sec)).map(sec=>{
    const events=groups.get(sec);
    const sectionCount=[...events.values()].reduce((sum,rows)=>sum+rows.length,0);
    return `
      <section class="result-section">
        <div class="result-section-head"><h2>${esc(sec)}</h2><span>${events.size} EVENTS · ${sectionCount} RESULTS</span></div>
        <div class="result-event-list">
          ${[...events.entries()].map(([eventName,rows])=>`
            <section class="result-event">
              <div class="result-event-head">
                <h3>${esc(eventName)}</h3>
                <span>${rows.length} PLACES</span>
              </div>
              <div class="result-section-list">
                ${rows.map(row=>`
                  <article class="result-row">
                    <div class="result-place">${esc(row.place)}</div>
                    <div class="result-name">${esc(row.name)}</div>
                    <div class="result-back"><span>BACK NO.</span><strong>${esc(row.backNo||"—")}</strong></div>
                  </article>
                `).join("")}
              </div>
            </section>
          `).join("")}
        </div>
      </section>`;
  }).join("");
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
