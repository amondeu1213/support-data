/************************************************************
 *  FINDER ENGINE v2 — 완전 안정 버전 (Blogger 100% 호환)
 *  - 모든 사이트 공통 사용 가능
 *  - 중복 Init 제거 / JSON 1회만 로드 / 칩 정상 렌더
 ************************************************************/

const FE = {
  dataUrl: "",
  supports: [],
  filtered: [],
  selectedAges: [],
  selectedRegions: [],
  currentSort: "default",
  pageSize: 8,
  visible: 0,
  currentItem: null,
};

/* Shortcut */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/************************************************************
 * INIT
 ************************************************************/
document.addEventListener("DOMContentLoaded", () => {
  const root = $(".finder");
  if (!root) return console.error("finder root not found");

  FE.dataUrl = root.dataset.source;
  if (!FE.dataUrl) {
    console.error("data-source 속성 없음");
    return;
  }

  FinderLoadJSON().then(() => {
    FinderRenderUI();
    FinderRenderChips();
    FinderBindEvents();
    console.log("Finder Engine Ready");
  });
});

/************************************************************
 * JSON LOAD
 ************************************************************/
async function FinderLoadJSON() {
  const res = await fetch(FE.dataUrl);
  const json = await res.json();

  FE._ages = json.ages || [];
  FE._regions = json.regions || [];
  FE._templates = json.programTemplates || [];
  FE._ageGroups = json.ageGroups || {};

  let list = [];
  let id = 1;

  FE._templates.forEach(tpl => {
    const tplAges = FE._ageGroups[tpl.agesKey] || FE._ages;

    FE._regions.forEach(region => {
      list.push({
        id: id++,
        code: tpl.code,
        region,
        ages: tplAges,
        title: `${tpl.titlePrefix || ""} ${region} ${tpl.titleSuffix || ""}`,
        summary: tpl.summary,
        amount: tpl.amount,
        deadline: tpl.deadline,
        category: tpl.category,
        overview: tpl.overview,
        detail: tpl.detail
      });
    });
  });

  FE.supports = list;
}

/************************************************************
 * UI TEMPLATE
 ************************************************************/
function FinderRenderUI() {
  $(".finder").innerHTML = `
    <div class="fe-filter-wrap">
      <div class="fe-section-title">조건 선택</div>

      <div class="fe-filter-block">
        <div class="fe-filter-label">연령대</div>
        <div id="feAgeChips" class="fe-chip-group"></div>
      </div>

      <div class="fe-filter-block">
        <div class="fe-filter-label">지역</div>
        <div id="feRegionChips" class="fe-chip-group"></div>
      </div>

      <button id="feSearchBtn" class="fe-btn-search">검색하기 🔍</button>
    </div>

    <div class="fe-result-wrap">
      <div class="fe-result-header">
        <div class="fe-result-title">
          검색 결과 <span id="feResultCount">0개</span>
        </div>

        <div class="fe-sort-group">
          <button class="fe-sort-btn active" data-sort="default">추천순</button>
          <button class="fe-sort-btn" data-sort="deadline">마감임박순</button>
          <button class="fe-sort-btn" data-sort="amount">지원금액순</button>
        </div>
      </div>

      <div id="feSelectedTags" class="fe-selected-tags"></div>
      <div id="feGrid" class="fe-grid"></div>
      <button id="feLoadMore" class="fe-loadmore">더 보기</button>
    </div>
  `;
}

/************************************************************
 * CHIPS
 ************************************************************/
function FinderRenderChips() {
  $("#feAgeChips").innerHTML =
    FE._ages.map(a => `<button class="fe-chip" data-age="${a}">${a}</button>`).join("");

  $("#feRegionChips").innerHTML =
    FE._regions.map(r => `<button class="fe-chip" data-region="${r}">${r}</button>`).join("");

  $$(".fe-chip").forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle("active");

      if (chip.dataset.age) {
        toggleSelect(FE.selectedAges, chip.dataset.age, chip.classList.contains("active"));
      }
      if (chip.dataset.region) {
        toggleSelect(FE.selectedRegions, chip.dataset.region, chip.classList.contains("active"));
      }

      FinderRenderTags();
    };
  });
}

function toggleSelect(list, value, add) {
  if (add) {
    if (!list.includes(value)) list.push(value);
  } else {
    const i = list.indexOf(value);
    if (i > -1) list.splice(i, 1);
  }
}

function FinderRenderTags() {
  let text = "";
  if (FE.selectedAges.length)
    text += `연령: ${FE.selectedAges.join(", ")}`;
  if (FE.selectedRegions.length) {
    if (text) text += " | ";
    text += `지역: ${FE.selectedRegions.join(", ")}`;
  }
  $("#feSelectedTags").textContent = text;
}

/************************************************************
 * SEARCH
 ************************************************************/
function FinderSearch() {
  FE.filtered = FE.supports.filter(s => {
    const ageOK = !FE.selectedAges.length ||
      s.ages.some(a => FE.selectedAges.includes(a));

    const regionOK = !FE.selectedRegions.length ||
      FE.selectedRegions.includes(s.region);

    return ageOK && regionOK;
  });

  FE.visible = 0;
  $("#feGrid").innerHTML = "";

  $("#feResultCount").textContent = `${FE.filtered.length}개`;

  if (FE.filtered.length === 0) {
    $("#feGrid").innerHTML = `<div class="fe-empty">조건에 맞는 결과 없음</div>`;
    $("#feLoadMore").style.display = "none";
    return;
  }

  FinderApplySort();
  FinderRenderMore();
}

/************************************************************
 * SORT
 ************************************************************/
function FinderApplySort() {
  if (FE.currentSort === "deadline") {
    FE.filtered.sort((a, b) => parseDeadline(a.deadline) - parseDeadline(b.deadline));
  } else if (FE.currentSort === "amount") {
    FE.filtered.sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount));
  }
}

function parseDeadline(str) {
  if (!str) return 9999;
  if (str.startsWith("D-")) return parseInt(str.replace("D-", ""), 10);
  return 9999;
}

function parseAmount(str) {
  if (!str) return 0;
  const num = parseInt(str.replace(/[^0-9]/g, ""), 10) || 0;
  if (str.includes("억")) return num * 100000000;
  if (str.includes("천만")) return num * 10000000;
  if (str.includes("만")) return num * 10000;
  return num;
}

/************************************************************
 * MORE CARD
 ************************************************************/
function FinderRenderMore() {
  const grid = $("#feGrid");
  const slice = FE.filtered.slice(FE.visible, FE.visible + FE.pageSize);

  slice.forEach(item => {
    const el = document.createElement("div");
    el.className = "sf3-card";
    el.innerHTML = `
      <div class="sf3-badge-region">${item.region}</div>
      <div class="sf3-card-title">${item.title}</div>
      <div class="sf3-card-desc">${item.summary}</div>
      <div class="sf3-card-footer">
        <div class="sf3-card-amount">${item.amount}</div>
        <div class="sf3-card-deadline">마감: ${item.deadline}</div>
      </div>
    `;
    grid.appendChild(el);
  });

  FE.visible += slice.length;
  $("#feLoadMore").style.display =
    FE.visible < FE.filtered.length ? "block" : "none";
}

/************************************************************
 * EVENTS
 ************************************************************/
function FinderBindEvents() {
  $("#feSearchBtn").onclick = () => FinderSearch();

  $("#feLoadMore").onclick = () => FinderRenderMore();

  $$(".fe-sort-btn").forEach(btn => {
    btn.onclick = () => {
      $$(".fe-sort-btn").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      FE.currentSort = btn.dataset.sort;
      FinderSearch();
    };
  });
}
