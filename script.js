let entries = [];

const queryEl = document.getElementById("query");
const sectionEl = document.getElementById("sectionFilter");
const styleEl = document.getElementById("styleFilter");
const resultsEl = document.getElementById("results");
const resultTitleEl = document.getElementById("resultTitle");
const resultCountEl = document.getElementById("resultCount");

function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function naturalSort(a, b) {
  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function populateFilters() {
  const sections = [...new Set(entries.map(x => x.section).filter(Boolean))].sort(naturalSort);
  const styles = [...new Set(entries.map(x => x.style).filter(Boolean))].sort(naturalSort);

  sections.forEach(value => {
    sectionEl.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`
    );
  });

  styles.forEach(value => {
    styleEl.insertAdjacentHTML(
      "beforeend",
      `<option value="${escapeHTML(value)}">${escapeHTML(value)}</option>`
    );
  });
}

function getFilteredEntries() {
  const query = normalize(queryEl.value);
  const section = sectionEl.value;
  const style = styleEl.value;

  return entries.filter(item => {
    if (section && item.section !== section) return false;
    if (style && item.style !== style) return false;
    if (!query) return true;

    if (normalize(item.backNo) === query) return true;

    const searchable = normalize([
      item.backNo,
      item.competitor,
      item.eventNo,
      item.event,
      item.section,
      item.division,
      item.style,
      item.entryType
    ].join(" "));

    return searchable.includes(query);
  });
}

function groupEntries(list) {
  const grouped = new Map();

  list.forEach(item => {
    const key = `${item.backNo}||${item.competitor}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        backNo: item.backNo,
        competitor: item.competitor,
        section: item.section,
        entryType: item.entryType,
        events: []
      });
    }
    grouped.get(key).events.push(item);
  });

  return [...grouped.values()].sort((a, b) =>
    naturalSort(a.backNo, b.backNo) ||
    naturalSort(a.competitor, b.competitor)
  );
}

function renderResults() {
  const hasInput = queryEl.value.trim() || sectionEl.value || styleEl.value;

  if (!hasInput) {
    resultTitleEl.textContent = "검색해 주세요";
    resultCountEl.textContent = "";
    resultsEl.innerHTML =
      '<div class="empty-state">백넘버, 선수명 또는 이벤트를 입력해 주세요.</div>';
    return;
  }

  const matched = getFilteredEntries();
  const groups = groupEntries(matched);
  const query = queryEl.value.trim();

  resultTitleEl.textContent = query ? `"${query}" 검색 결과` : "필터 검색 결과";
  resultCountEl.textContent = `${groups.length}명 · ${matched.length}건`;

  if (!groups.length) {
    resultsEl.innerHTML =
      '<div class="empty-state">검색 결과가 없습니다.<br>백넘버 또는 이름 철자를 확인해 주세요.</div>';
    return;
  }

  resultsEl.innerHTML = groups.map(group => {
    const events = group.events
      .sort((a, b) =>
        naturalSort(a.eventNo, b.eventNo) ||
        naturalSort(a.event, b.event)
      )
      .map(event => `
        <div class="event-row">
          <div class="event-no">No. ${escapeHTML(event.eventNo)}</div>
          <div>
            <div class="event-name">${escapeHTML(event.event)}</div>
            <div class="event-meta">
              ${escapeHTML(event.section)} ·
              ${escapeHTML(event.style)} ·
              ${escapeHTML(event.division)}
            </div>
          </div>
        </div>
      `).join("");

    return `
      <article class="player-card">
        <div class="player-top">
          <div class="back-number">
            <small>BACK NO.</small>
            <strong>${escapeHTML(group.backNo)}</strong>
          </div>
          <div class="player-info">
            <h2>${escapeHTML(group.competitor)}</h2>
            <div class="player-meta">
              ${escapeHTML(group.section)} ·
              ${escapeHTML(group.entryType || "Entry")}
            </div>
          </div>
        </div>
        <div class="event-list">${events}</div>
      </article>
    `;
  }).join("");
}

async function loadData() {
  try {
    const response = await fetch("players.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    entries = await response.json();
    populateFilters();

    const competitorCount = new Set(
      entries.map(x => `${x.backNo}||${x.competitor}`)
    ).size;

    resultCountEl.textContent = `${competitorCount}명 등록`;
  } catch (error) {
    console.error(error);
    resultTitleEl.textContent = "데이터 불러오기 오류";
    resultsEl.innerHTML =
      '<div class="empty-state">players.json 파일을 불러오지 못했습니다.<br>네 파일을 모두 같은 폴더에 올렸는지 확인해 주세요.</div>';
  }
}

document.getElementById("searchForm").addEventListener("submit", event => {
  event.preventDefault();
  renderResults();
  queryEl.blur();
});

document.getElementById("resetBtn").addEventListener("click", () => {
  queryEl.value = "";
  sectionEl.value = "";
  styleEl.value = "";
  renderResults();
  queryEl.focus();
});

sectionEl.addEventListener("change", renderResults);
styleEl.addEventListener("change", renderResults);

loadData();
