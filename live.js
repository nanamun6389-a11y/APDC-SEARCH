import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const JUDGES=[
{code:"T1",name:"Raymond KIM"},{code:"T2",name:"Lorencia"},{code:"T3",name:"Marcus"},{code:"T4",name:"Crystal"},{code:"T5",name:"Tomohiro"},{code:"T6",name:"Annie Oo"},{code:"T7",name:"Nancy Chang"},{code:"T8",name:"Max Yim"},
{code:"W1",name:"이종률"},{code:"W2",name:"김도영"},{code:"W3",name:"엄혜리"},{code:"W4",name:"구채림"},{code:"W5",name:"고재호"},{code:"W6",name:"임채성"},{code:"W7",name:"은일"},{code:"W8",name:"블라디"},{code:"W9",name:"이세영"}];

const app=initializeApp(firebaseConfig),db=getDatabase(app);
const eventEl=document.getElementById("liveEvent"),roundEl=document.getElementById("liveRound"),groupEl=document.getElementById("liveGroup");
let eventSettings={events:[]},unsub=null;

const natural=(a,b)=>String(a).localeCompare(String(b),undefined,{numeric:true,sensitivity:"base"});
function getSetting(key){return eventSettings.events?.find(item=>item.eventKey===key)||null}
function eventLabel(key,section,event){
 const number=String(getSetting(key)?.eventNumber||"").trim();
 return `${number?`EVENT ${number} · `:""}${section} · ${event}`;
}
function eventOptions(data){
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
function key(){return btoa(unescape(encodeURIComponent(eventEl.value))).replaceAll("=","")+"_"+roundEl.value}
function judges(){return groupEl.value==="ALL"?JUDGES:JUDGES.filter(j=>j.code.startsWith(groupEl.value))}
function listen(){if(unsub)unsub();document.getElementById("liveTitle").textContent=eventEl.selectedOptions[0]?.textContent||"";unsub=onValue(ref(db,`submissions/${key()}`),snap=>render(snap.val()||{}))}
function render(data){const js=judges(),done=js.filter(j=>data[j.code]),count=done.length,total=js.length;document.getElementById("liveCount").textContent=`${count} / ${total}`;const ready=count===total&&total>0;const readyEl=document.getElementById("liveReady");readyEl.textContent=ready?"READY":"WAITING";readyEl.classList.toggle("ready",ready);document.getElementById("liveJudgeStatus").innerHTML=js.map(j=>`<div class="live-judge ${data[j.code]?"done":""}">${j.code}</div>`).join("")}
eventEl.onchange=listen;roundEl.onchange=listen;groupEl.onchange=listen;
Promise.all([
 fetch("players.json",{cache:"no-store"}).then(r=>r.json()),
 fetch("event-settings.json",{cache:"no-store"}).then(r=>r.json()).catch(()=>({events:[]}))
]).then(([d,s])=>{
 eventSettings=s||{events:[]};
 eventEl.innerHTML=eventOptions(d).map(e=>`<option value="${e.key}">${eventLabel(e.key,e.section,e.event)}</option>`).join("");
 listen();
});
