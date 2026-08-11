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

const AWARD_RULES={
  "Formation":{medal:[1,2,3]},
  "Under 10 Solo C":{medal:[1,2,3]},
  "Under 10 Solo CRJ":{medal:[1,2,3]},
  "Under 10 Solo R":{medal:[1,2,3]},
  "Under 12 Solo CR":{medal:[1,2,3]},
  "Under 12 Solo CRJ":{medal:[1,2,3]},
  "Under 15 Solo CRS":{medal:[1,2,3]},
  "Under 15 Solo CSRJ":{medal:[1,2,3]},
  "Under 15 Solo WTFQ":{medal:[1,2,3]},
  "Under 18 Solo Elite A Latin":{trophy:[1],medal:[2,3],prize:[1,2,3]},
  "Over 19 Solo Latin 5 Dance":{medal:[1,2,3]},
  "Over 19 Solo Latin CRS":{medal:[1,2,3]},
  "Over 35 Solo CRS":{medal:[1,2,3]},
  "Amateur Rising Star Latin":{medal:[1,2,3]},
  "Asia Pacific Amateur Latin":{trophy:[1],medal:[2,3],prize:[1,2,3]},
  "Asia Pacific Amateur Solo Latin":{trophy:[1],medal:[2,3],prize:[1,2,3]},
  "Korea Closed Amateur Latin":{trophy:[1],medal:[2,3]},
  "Pro-Am Latin R":{medal:[1]},
  "Pro-Am Standard 3 Dance":{medal:[1]}
};
function placeNumber(place){
  const m=String(place||"").match(/^(\d+)/);
  return m?Number(m[1]):0;
}
function awardBadges(row){
  const rule=AWARD_RULES[String(row.category||"").trim()];
  if(!rule)return "";
  const p=placeNumber(row.place);
  const badges=[];
  if(rule.trophy?.includes(p))badges.push('<span class="award-badge trophy">🏆 TROPHY</span>');
  if(rule.medal?.includes(p))badges.push('<span class="award-badge medal">🏅 MEDAL</span>');
  if(rule.prize?.includes(p))badges.push('<span class="award-badge prize">💰 PRIZE MONEY</span>');
  return badges.length?`<div class="award-badges">${badges.join("")}</div>`:"";
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
                    <div class="result-name">${esc(row.name)}${awardBadges(row)}</div>
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
