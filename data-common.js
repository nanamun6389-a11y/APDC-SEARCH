import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, get, set } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
const app=getApps().length?getApps()[0]:initializeApp(firebaseConfig);export const db=getDatabase(app);export {ref,get,set};
export const PASSWORD="0070fill";
export async function fetchJson(path){const r=await fetch(`${path}?v=${Date.now()}`,{cache:"no-store"});if(!r.ok)throw new Error(path);return r.json()}
export async function loadPlayers(){const s=await get(ref(db,"apdcPublic/players"));if(s.exists()&&Array.isArray(s.val()))return s.val();return fetchJson("players.json")}
export async function loadTimetable(){const s=await get(ref(db,"apdcPublic/timetable"));if(s.exists()&&s.val()?.rows)return s.val();return fetchJson("timetable-data.json")}
export function playerGroups(players){const m=new Map();for(const p of players){const key=`${p.backNo}||${p.competitor}`;if(!m.has(key))m.set(key,{backNo:String(p.backNo??""),competitor:p.competitor||"",entries:[]});m.get(key).entries.push({...p})}return[...m.values()].sort((a,b)=>Number(a.backNo)-Number(b.backNo)||a.competitor.localeCompare(b.competitor))}
export function flattenGroups(groups){return groups.flatMap(g=>g.entries.map(e=>({...e,backNo:String(g.backNo),competitor:g.competitor}))) }
export function syncTimetable(tt,players){const rows=(tt.rows||[]).map(r=>({...r}));for(const r of rows){const matches=players.filter(p=>String(p.eventNo||"")===String(r.sourceEventNo||"") || (p.event===r.event&&p.section===r.section));const uniq=new Set(matches.map(p=>`${p.backNo}|${p.competitor}`));if(uniq.size){r.entries=String(uniq.size);const n=uniq.size;if(!String(r.round||"").toLowerCase().includes("grand"))r.round=n>=15?"Quarter Final":n>=8?"Semi Final":"Final";r.backNumbers=[...new Set(matches.map(p=>String(p.backNo)).filter(Boolean))].sort((a,b)=>Number(a)-Number(b)).join(", ")}}
return {...tt,rows,updatedAt:new Date().toISOString()}}
