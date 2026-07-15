import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, onValue, remove } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
const JUDGES=[
{code:"T1",name:"Raymond KIM"},{code:"T2",name:"Lorencia"},{code:"T3",name:"Marcus"},{code:"T4",name:"Crystal"},{code:"T5",name:"Tomohiro"},{code:"T6",name:"Annie Oo"},{code:"T7",name:"Nancy Chang"},{code:"T8",name:"Max Yim"},
{code:"W1",name:"이종률"},{code:"W2",name:"김도영"},{code:"W3",name:"엄혜리"},{code:"W4",name:"구채림"},{code:"W5",name:"고재호"},{code:"W6",name:"임채성"},{code:"W7",name:"은일"},{code:"W8",name:"블라디"},{code:"W9",name:"이세영"}];
const app=initializeApp(firebaseConfig),db=getDatabase(app);
let entries=[],eventSettings={events:[]},unsubscribe=null,currentData={};
const eventSelect=document.getElementById("adminEvent"),roundSelect=document.getElementById("adminRound"),groupSelect=document.getElementById("judgeGroup");
const natural=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:"base"});
function getSetting(key){return eventSettings.events?.find(item=>item.eventKey===key)||null}
function eventLabel(key,section,event){
 const number=String(getSetting(key)?.eventNumber||"").trim();
 return `${number?`EVENT ${number} · `:""}${section} · ${event}`;
}
function events(data){
 const m=new Map();
 data.forEach(x=>{
   const key=[x.event,x.section,x.style].join("||");
   if(!m.has(key))m.set(key,{key,section:x.section,event:x.event});
 });
 return [...m.values()].sort((a,b)=>{
   const na=Number(getSetting(a.key)?.eventNumber),nb=Number(getSetting(b.key)?.eventNumber);
   const ha=String(getSetting(a.key)?.eventNumber||"").trim()!=="";
   const hb=String(getSetting(b.key)?.eventNumber||"").trim()!=="";
   if(ha&&hb&&na!==nb)return na-nb;
   if(ha!==hb)return ha?-1:1;
   return natural(a.section,b.section)||natural(a.event,b.event);
 });
} · ${x.event}`})});return[...m.values()].sort((a,b)=>natural(a.label,b.label))}
function roundKey(){return btoa(unescape(encodeURIComponent(eventSelect.value))).replaceAll("=","")+"_"+roundSelect.value}
function activeJudges(){return groupSelect.value==="ALL"?JUDGES:JUDGES.filter(j=>j.code.startsWith(groupSelect.value))}
function listen(){if(unsubscribe)unsubscribe();document.getElementById("adminTitle").textContent=eventSelect.selectedOptions[0]?.textContent||"";unsubscribe=onValue(ref(db,`submissions/${roundKey()}`),snap=>{currentData=snap.val()||{};render()})}
function aggregate(data){
 const scores={};
 Object.values(data).forEach(ballot=>{
   if(ballot.round==="final"){ballot.result.forEach(x=>{scores[x.backNo]=(scores[x.backNo]||0)+x.rank})}
   else{ballot.result.forEach(n=>{scores[n]=(scores[n]||0)+1})}
 });
 return Object.entries(scores).sort((a,b)=>roundSelect.value==="final"?(a[1]-b[1]||natural(a[0],b[0])):(b[1]-a[1]||natural(a[0],b[0])));
}
function render(){
 const judges=activeJudges(),filtered={};
 judges.forEach(j=>{if(currentData[j.code])filtered[j.code]=currentData[j.code]});
 const submitted=Object.keys(filtered).length,total=judges.length;
 document.getElementById("submissionCount").textContent=`${submitted} / ${total} SUBMITTED`;
 const complete=submitted===total&&total>0;
 document.getElementById("completeBadge").textContent=complete?"COMPLETE":"IN PROGRESS";
 document.getElementById("completeBadge").className=`complete-badge ${complete?"complete":""}`;
 document.getElementById("judgeStatus").innerHTML=judges.map(j=>`<div class="status-row"><div class="status-judge">${j.code}<br><span class="judge-name">${j.name}</span></div><div>${currentData[j.code]?.eventLabel||""}</div><div class="${currentData[j.code]?"submitted":"pending"}">${currentData[j.code]?"SUBMITTED":"PENDING"}</div></div>`).join("");
 const rows=aggregate(filtered);
 document.getElementById("aggregateResults").innerHTML=rows.length?rows.map(([back,score],i)=>`<div class="result-row"><div class="result-back">${back}</div><div>${roundSelect.value==="final"?`Provisional place ${i+1}`:"Total checks"}</div><div class="result-score">${score}</div></div>`).join(""):`<div class="message">No submissions yet.</div>`;
}
function exportCSV(){
 const judges=activeJudges(),rows=[["Judge","Judge Name","Section","Round","Back No.","Value"]];
 judges.forEach(j=>{const b=currentData[j.code];if(!b)return;if(b.round==="final"){b.result.forEach(x=>rows.push([j.code,j.name,b.eventLabel,b.round,x.backNo,x.rank]))}else{b.result.forEach(n=>rows.push([j.code,j.name,b.eventLabel,b.round,n,1]))}});
 const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
 const blob=new Blob([csv],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download=`APDC_${roundSelect.value}_${groupSelect.value}.csv`;a.click();URL.revokeObjectURL(url);
}
onValue(ref(db,".info/connected"),s=>{const online=s.val()===true;document.getElementById("connectionDot").classList.toggle("online",online);document.getElementById("connectionText").textContent=online?"ONLINE":"OFFLINE"});
eventSelect.onchange=listen;roundSelect.onchange=listen;groupSelect.onchange=render;
document.getElementById("clearBtn").onclick=()=>{if(confirm("Clear all submissions for this section and round?"))remove(ref(db,`submissions/${roundKey()}`))};
document.getElementById("exportBtn").onclick=exportCSV;
document.getElementById("printBtn").onclick=()=>window.print();
Promise.all([
 fetch("players.json",{cache:"no-store"}).then(r=>r.json()),
 fetch("event-settings.json",{cache:"no-store"}).then(r=>r.json()).catch(()=>({events:[]}))
]).then(([d,s])=>{
 entries=d;eventSettings=s||{events:[]};
 eventSelect.innerHTML=events(d).map(e=>`<option value="${e.key}">${eventLabel(e.key,e.section,e.event)}</option>`).join("");
 listen();
});
