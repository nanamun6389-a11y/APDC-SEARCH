import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getDatabase, ref, set, onValue, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

const JUDGES = {"T1": "Raymond KIM", "T2": "Lorencia", "T3": "Marcus", "T4": "Crystal", "T5": "Tomohiro", "T6": "Annie Oo", "T7": "Nancy Chang", "T8": "Max Yim", "W1": "이종률", "W2": "김도영", "W3": "엄혜리", "W4": "구채림", "W5": "고재호", "W6": "임채성", "W7": "은일", "W8": "블라디", "W9": "이세영"};
const JUDGE_LIST = [{"code": "T1", "name": "Raymond KIM"}, {"code": "T2", "name": "Lorencia"}, {"code": "T3", "name": "Marcus"}, {"code": "T4", "name": "Crystal"}, {"code": "T5", "name": "Tomohiro"}, {"code": "T6", "name": "Annie Oo"}, {"code": "T7", "name": "Nancy Chang"}, {"code": "T8", "name": "Max Yim"}, {"code": "W1", "name": "이종률"}, {"code": "W2", "name": "김도영"}, {"code": "W3", "name": "엄혜리"}, {"code": "W4", "name": "구채림"}, {"code": "W5", "name": "고재호"}, {"code": "W6", "name": "임채성"}, {"code": "W7", "name": "은일"}, {"code": "W8", "name": "블라디"}, {"code": "W9", "name": "이세영"}];

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let entries = [];
let eventSettings = {events:[]};
let selected = new Set();
let currentJudge = "";

const judgeGate = document.getElementById("judgeGate");
const scoreScreen = document.getElementById("scoreScreen");
const eventSelect = document.getElementById("eventSelect");
const roundSelect = document.getElementById("roundSelect");
const ballot = document.getElementById("ballot");
const eventTitle = document.getElementById("eventTitle");
const roundTitle = document.getElementById("roundTitle");
const counter = document.getElementById("counter");
const message = document.getElementById("message");


const ACCESS_PASSWORD = "0070";
const passwordGate = document.getElementById("passwordGate");
const judgeProtected = document.getElementById("judgeProtected");
const passwordInput = document.getElementById("passwordInput");
const passwordBtn = document.getElementById("passwordBtn");
const passwordMessage = document.getElementById("passwordMessage");

function unlockJudgeSystem() {
  sessionStorage.setItem("apdcJudgeUnlocked", "yes");

  passwordGate.classList.add("hidden");
  passwordGate.hidden = true;
  passwordGate.style.display = "none";

  judgeProtected.classList.remove("hidden");
  judgeProtected.hidden = false;
  judgeProtected.style.display = "block";

  if (!currentJudge) {
    judgeGate.classList.remove("hidden");
    scoreScreen.classList.add("hidden");
  }

  passwordMessage.textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function lockJudgeSystem() {
  passwordGate.classList.remove("hidden");
  passwordGate.hidden = false;
  passwordGate.style.display = "flex";

  judgeProtected.classList.add("hidden");
  judgeProtected.hidden = true;
  judgeProtected.style.display = "none";
}

function checkPassword() {
  if (passwordInput.value.trim() === ACCESS_PASSWORD) {
    unlockJudgeSystem();
  } else {
    passwordMessage.textContent = "INCORRECT PASSWORD";
    passwordMessage.className = "message error";
    passwordInput.value = "";
    passwordInput.focus();
  }
}

passwordBtn.addEventListener("click", checkPassword);
passwordInput.addEventListener("keydown", event => {
  if (event.key === "Enter") checkPassword();
});

if (sessionStorage.getItem("apdcJudgeUnlocked") === "yes") {
  unlockJudgeSystem();
} else {
  lockJudgeSystem();
}
const natural = (a,b) => String(a).localeCompare(String(b), undefined, {numeric:true,sensitivity:"base"});

function renderJudgeButtons() {
  const make = group => JUDGE_LIST
    .filter(j => j.code.startsWith(group))
    .map(j => `<button class="judge-choice" data-code="${j.code}" type="button"><strong>${j.code}</strong><span>${j.name}</span></button>`)
    .join("");
  document.getElementById("tJudgeButtons").innerHTML = make("T");
  document.getElementById("wJudgeButtons").innerHTML = make("W");
  document.querySelectorAll(".judge-choice").forEach(btn => {
    btn.onclick = () => chooseJudge(btn.dataset.code);
  });
}

function chooseJudge(code) {
  currentJudge = code;

  document.querySelectorAll(".judge-choice").forEach(btn => {
    const selectedNow = btn.dataset.code === code;
    btn.classList.toggle("selected", selectedNow);
    btn.setAttribute("aria-pressed", selectedNow ? "true" : "false");
  });

  document.getElementById("selectedJudgeName").innerHTML =
    `<span class="current-check">✓</span> ${code} · ${JUDGES[code]}`;

  setTimeout(() => {
    judgeGate.classList.add("hidden");
    scoreScreen.classList.remove("hidden");
    const url = new URL(location.href);
    url.searchParams.set("judge", code);
    history.replaceState(null, "", url);
    populateEventsForJudge();
    render();
  }, 220);
}

document.getElementById("changeJudgeBtn").onclick = () => {
  currentJudge = "";
  document.querySelectorAll(".judge-choice").forEach(btn => {
    btn.classList.remove("selected");
    btn.setAttribute("aria-pressed", "false");
  });
  scoreScreen.classList.add("hidden");
  judgeGate.classList.remove("hidden");
  const url = new URL(location.href);
  url.searchParams.delete("judge");
  history.replaceState(null, "", url);
  window.scrollTo({ top: 0, behavior: "smooth" });
};

onValue(ref(db, ".info/connected"), snap => {
  const online = snap.val() === true;
  document.getElementById("connectionDot").classList.toggle("online", online);
  document.getElementById("connectionText").textContent = online ? "ONLINE" : "OFFLINE";
});

function getSetting(key) {
  return eventSettings.events?.find(item => item.eventKey === key) || null;
}

function eventLabel(item) {
  const setting = getSetting(item.key);
  const number = String(setting?.eventNumber || "").trim();
  return `${number ? `EVENT ${number} · ` : ""}${item.section} · ${item.event}`;
}

function uniqueEvents(data) {
  const map = new Map();
  data.forEach(x => {
    const key = [x.event, x.section, x.style].join("||");
    if (!map.has(key)) map.set(key, {key, event:x.event, section:x.section, style:x.style});
  });

  let list = [...map.values()];

  if (currentJudge) {
    list = list.filter(item => {
      const setting = getSetting(item.key);
      const assigned = setting?.assignedJudges || [];
      return assigned.length === 0 || assigned.includes(currentJudge);
    });
  }

  return list.sort((a,b) => {
    const sa = getSetting(a.key);
    const sb = getSetting(b.key);
    const na = Number(sa?.eventNumber);
    const nb = Number(sb?.eventNumber);
    const hasA = Number.isFinite(na) && String(sa?.eventNumber).trim() !== "";
    const hasB = Number.isFinite(nb) && String(sb?.eventNumber).trim() !== "";
    if (hasA && hasB && na !== nb) return na - nb;
    if (hasA !== hasB) return hasA ? -1 : 1;
    return natural(a.section,b.section) || natural(a.event,b.event);
  });
}

function currentCompetitors() {
  const [event,section,style] = eventSelect.value.split("||");
  const map = new Map();
  entries
    .filter(x => x.event===event && x.section===section && x.style===style)
    .forEach(x => map.set(x.backNo, {backNo:x.backNo,name:x.competitor}));
  return [...map.values()].sort((a,b)=>natural(a.backNo,b.backNo));
}

function roundKey() {
  return btoa(unescape(encodeURIComponent(eventSelect.value))).replaceAll("=","") + "_" + roundSelect.value;
}

function render() {
  if (!currentJudge || !eventSelect.value) return;
  selected.clear();
  message.textContent = "";
  message.className = "message";

  const comps = currentCompetitors();
  const round = roundSelect.value;
  eventTitle.textContent = eventSelect.selectedOptions[0]?.textContent || "";
  roundTitle.textContent = round==="quarter" ? "QUARTER FINAL" : round==="semi" ? "SEMI FINAL" : "FINAL";

  if (round === "final") {
    ballot.innerHTML = comps.map(c => `
      <div class="final-row">
        <div>
          <div class="final-number">${c.backNo}</div>
          <div class="competitor-name">${c.name}</div>
        </div>
        <select class="rank-select" data-back="${c.backNo}">
          <option value="">Rank</option>
          ${comps.map((_,i)=>`<option value="${i+1}">${i+1}</option>`).join("")}
        </select>
      </div>`).join("");
    counter.textContent = `${comps.length} FINALISTS`;
  } else {
    const needed = round==="quarter" ? 12 : 6;
    ballot.innerHTML = comps.map(c => `<button class="number-btn" data-back="${c.backNo}" type="button">${c.backNo}</button>`).join("");
    counter.textContent = `0 / ${needed}`;
    ballot.querySelectorAll(".number-btn").forEach(btn => {
      btn.onclick = () => {
        const n = btn.dataset.back;
        if (selected.has(n)) {
          selected.delete(n);
          btn.classList.remove("selected");
        } else if (selected.size < needed) {
          selected.add(n);
          btn.classList.add("selected");
        }
        counter.textContent = `${selected.size} / ${needed}`;
      };
    });
  }
}

async function submitBallot() {
  if (!currentJudge) return;
  const round = roundSelect.value;
  let result;

  if (round === "final") {
    const rows = [...ballot.querySelectorAll(".rank-select")];
    const values = rows.map(r => r.value);
    if (values.some(v=>!v) || new Set(values).size !== values.length) {
      message.textContent = "Complete all ranks without duplicates.";
      message.className = "message error";
      return;
    }
    result = rows.map(r => ({backNo:r.dataset.back, rank:Number(r.value)}));
  } else {
    const needed = round==="quarter" ? 12 : 6;
    if (selected.size !== needed) {
      message.textContent = `Select exactly ${needed}.`;
      message.className = "message error";
      return;
    }
    result = [...selected].sort(natural);
  }

  const payload = {
    judge: currentJudge,
    judgeName: JUDGES[currentJudge],
    eventKey: eventSelect.value,
    eventLabel: eventSelect.selectedOptions[0].textContent,
    round,
    result,
    submittedAt: serverTimestamp()
  };

  await set(ref(db, `submissions/${roundKey()}/${currentJudge}`), payload);
  message.textContent = "SUBMITTED";
  message.className = "message";
}

document.getElementById("submitBtn").onclick = submitBallot;
function returnToJudgeHome() {
  currentJudge = "";
  selected.clear();

  document.querySelectorAll(".judge-choice").forEach(btn => {
    btn.classList.remove("selected");
    btn.setAttribute("aria-pressed", "false");
  });

  scoreScreen.classList.add("hidden");
  judgeGate.classList.remove("hidden");

  const url = new URL(location.href);
  url.searchParams.delete("judge");
  history.replaceState(null, "", url);

  message.textContent = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("backBtn").onclick = returnToJudgeHome;
document.getElementById("homeTitleBtn").onclick = returnToJudgeHome;
eventSelect.onchange = render;
roundSelect.onchange = render;


function populateEventsForJudge() {
  const available = uniqueEvents(entries);
  eventSelect.innerHTML = available
    .map(item => `<option value="${item.key}">${eventLabel(item)}</option>`)
    .join("");

  if (!available.length) {
    eventSelect.innerHTML = '<option value="">NO ASSIGNED SECTIONS</option>';
    ballot.innerHTML = '<div class="message">No sections assigned to this judge.</div>';
    eventTitle.textContent = "";
    counter.textContent = "";
  }
}

Promise.all([
  fetch("players.json", {cache:"no-store"}).then(r=>r.json()),
  fetch("event-settings.json", {cache:"no-store"}).then(r=>r.json()).catch(()=>({events:[]}))
])
  .then(r=>r.json())
  .then(data=>{
    entries = data;
    eventSelect.innerHTML = uniqueEvents(data)
      .map(e=>`<option value="${e.key}">${e.section} · ${e.event}</option>`)
      .join("");
    renderJudgeButtons();
    const judgeParam = new URLSearchParams(location.search).get("judge");
    if (judgeParam && JUDGES[judgeParam]) chooseJudge(judgeParam);
  })
  .catch(()=>{
    judgeGate.innerHTML = '<div class="message error">FAILED TO LOAD PLAYERS.JSON</div>';
  });
