/************************************************************
 *  FINDER ENGINE v2.0 (Clean & Stable)
 *  - Blogger / Tistory / WordPress 호환
 *  - 중복 INIT 제거
 *  - 칩/검색/모달/상세 100% 정상 동작 버전
 ************************************************************/

/* =========================================================
   GLOBAL STATE
========================================================= */
window.FINDER = {
  dataUrl: "",
  supports: [],
  filtered: [],
  selectedAges: [],
  selectedRegions: [],
  currentSort: "default",
  visible: 0,
  pageSize: 8,
  currentItem: null
};

const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

/* =========================================================
   LOAD DATA
========================================================= */
async function loadData() {
  const url = window.FINDER.dataUrl;
  const res = await fetch(url);
  const json = await res.json();

  const templates = json.programTemplates || [];
  const regions   = json.regions || [];
  const ages      = json.ages || [];
  const groups    = json.ageGroups || {};

  let id = 1;
  let list = [];

  templates.forEach(tpl => {
    const tplAges = groups[tpl.agesKey] || ages;

    regions.forEach(region => {
      list.push({
        id: id++,
        region,
        code: tpl.code,
        title: `${tpl.titlePrefix || ""} ${region} ${tpl.titleSuffix || ""}`.trim(),
        summary: tpl.summary || "",
        amount: tpl.amount || "",
        deadline: tpl.deadline || "",
        ages: tplAges,
        category: tpl.category || "",
        overview: tpl.overview || "",
        detail: tpl.detail || {}
      });
    });
  });

  window.FINDER.supports = list;
}

/* =========================================================
   RENDER UI
========================================================= */
function renderUI() {
  const root = $(".finder");

  root.innerHTML = `
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
        <div class="fe-result-title">검색 결과 <span id="feResultCount">0개</span></div>

        <div class="fe-sort-group">
          <button data-sort="default" class="fe-sort-btn active">추천순</button>
          <button data-sort="deadline" class="fe-sort-btn">마감임박순</button>
          <button data-sort="amount" class="fe-sort-btn">지원금액순</button>
        </div>
      </div>

      <div id="feSelectedTags" class="fe-selected-tags"></div>
      <div id="feGrid" class="fe-grid"></div>
      <button id="feLoadMore" class="fe-loadmore">더 보기</button>
    </div>

    <div id="feModalBackdrop" class="fe-modal-backdrop">
      <div class="fe-modal">
        <h3 id="feModalTitle"></h3>
        <p id="feModalDesc"></p>
        <div id="feModalMeta" class="fe-modal-meta"></div>

        <button id="feModalDetailBtn" class="fe-modal-btn-main">상세 보기 →</button>
        <button id="feModalCloseBtn"  class="fe-modal-btn-sub">닫기</button>
      </div>
    </div>

    <div id="feDetailSection" class="fe-detail" style="display:none;">
      <button id="feDetailBackBtn" class="fe-detail-back">← 목록으로 돌아가기</button>
      <h2 id="feDetailTitle"></h2>

      <div id="feDetailMeta"></div>

      <h3>지원 개요</h3>      <div id="feDetailOverview"></div>
      <h3>지원 대상</h3>      <div id="feDetailTarget"></div>
      <h3>지원 내용</h3>      <div id="feDetailBenefit"></div>
      <h3>신청 방법</h3>      <div id="feDetailMethod"></div>
      <h3>주의사항</h3>      <div id="feDetailCaution"></div>
    </div>
  `;
}

/* =========================================================
   RENDER CHIPS
========================================================= */
async function renderChips() {
  const url = window.FINDER.dataUrl;
  const json = await (await fetch(url)).json();

  $("#feAgeChips").innerHTML =
    json.ages.map(a => `<button class="fe-chip" data-age="${a}">${a}</button>`).join("");

  $("#feRegionChips").innerHTML =
    json.regions.map(r => `<button class="fe-chip" data-region="${r}">${r}</button>`).join("");

  $$(".fe-chip").forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle("active");

      // age
      if (chip.dataset.age) {
        const v = chip.dataset.age;
        chip.classList.contains("active")
          ? window.FINDER.selectedAges.push(v)
          : window.FINDER.selectedAges = window.FINDER.selectedAges.filter(x => x !== v);
      }

      // region
      if (chip.dataset.region) {
        const v = chip.dataset.region;
        chip.classList.contains("active")
          ? window.FINDER.selectedRegions.push(v)
          : window.FINDER.selectedRegions = window.FINDER.selectedRegions.filter(x => x !== v);
      }

      renderTags();
    };
  });
}

/* =========================================================
   SELECTED TAG VIEW
========================================================= */
function renderTags() {
  let txt = "";

  if (window.FINDER.selectedAges.length)
    txt += `연령: ${window.FINDER.selectedAges.join(", ")}`;

  if (window.FINDER.selectedRegions.length) {
    if (txt) txt += "\n";
    txt += `지역: ${window.FINDER.selectedRegions.join(", ")}`;
  }

  $("#feSelectedTags").textContent = txt;
}

/* =========================================================
   SEARCH + SORT
========================================================= */
function parseAmount(str) {
  if (!str) return 0;
  const n = parseInt(str.replace(/[^0-9]/g, ""));
  if (isNaN(n)) return 0;
  if (str.includes("억")) return n * 100000000;
  if (str.includes("천만")) return n * 10000000;
  if (str.includes("만")) return n * 10000;
  return n;
}

function parseDeadline(str) {
  if (!str) return 9999;
  if (str.startsWith("D-")) return parseInt(str.replace("D-", "")) || 9999;
  return 9999;
}

function applySort() {
  const list = window.FINDER.filtered;
  const sort = window.FINDER.currentSort;

  if (sort === "deadline") {
    list.sort((a, b) => parseDeadline(a.deadline) - parseDeadline(b.deadline));
  } else if (sort === "amount") {
    list.sort((a, b) => parseAmount(b.amount) - parseAmount(a.amount));
  }
}

function search() {
  let list = window.FINDER.supports;
  const ages = window.FINDER.selectedAges;
  const regions = window.FINDER.selectedRegions;

  window.FINDER.filtered = list.filter(item => {
    const okAge = !ages.length || item.ages.some(a => ages.includes(a));
    const okRegion = !regions.length || regions.includes(item.region);
    return okAge && okRegion;
  });

  applySort();
  window.FINDER.visible = 0;

  $("#feGrid").innerHTML = "";
  $("#feResultCount").textContent = window.FINDER.filtered.length + "개";

  if (window.FINDER.filtered.length === 0) {
    $("#feGrid").innerHTML = `<div class="fe-empty">조건에 맞는 지원금이 없습니다.</div>`;
    $("#feLoadMore").style.display = "none";
    return;
  }

  renderMore();
}

/* =========================================================
   CARD RENDER
========================================================= */
function renderMore() {
  const grid = $("#feGrid");
  const S = window.FINDER;
  const slice = S.filtered.slice(S.visible, S.visible + S.pageSize);

  slice.forEach(item => {
    const card = document.createElement("div");
    card.className = "sf3-card";

    card.innerHTML = `
      <div class="sf3-badge-region">${item.region}</div>
      <div class="sf3-card-title">${item.title}</div>
      <div class="sf3-card-desc">${item.summary}</div>
      <div class="sf3-card-footer">
        <div class="sf3-card-amount">${item.amount}</div>
        <div class="sf3-card-deadline">마감: ${item.deadline}</div>
        <div class="sf3-card-cta">자세히 보기 →</div>
      </div>`;

    card.onclick = () => openModal(item);
    grid.appendChild(card);
  });

  S.visible += slice.length;

  $("#feLoadMore").style.display =
    S.visible < S.filtered.length ? "block" : "none";
}

/* =========================================================
   MODAL
========================================================= */
function openModal(item) {
  window.FINDER.currentItem = item;

  $("#feModalTitle").textContent = item.title;
  $("#feModalDesc").textContent = item.summary;
  $("#feModalMeta").textContent =
    `${item.region} | ${item.ages.join(", ")} | ${item.category}`;

  $("#feModalBackdrop").style.display = "flex";
}

function closeModal() {
  $("#feModalBackdrop").style.display = "none";
}

/* =========================================================
   DETAIL VIEW
========================================================= */
function openDetail(item) {
  $("#feDetailSection").style.display = "block";

  $("#feDetailTitle").textContent = item.title;
  $("#feDetailMeta").textContent =
    `${item.region} | ${item.ages.join(", ")} | ${item.category}`;

  $("#feDetailOverview").textContent = item.overview || item.summary;
  $("#feDetailTarget").textContent = item.detail.target || "-";
  $("#feDetailBenefit").textContent = item.detail.benefit || item.amount;
  $("#feDetailMethod").textContent = item.detail.method || "-";
  $("#feDetailCaution").textContent = item.detail.caution || "-";

  $("#feDetailSection").scrollIntoView({ behavior: "smooth" });
}

/* =========================================================
   EVENT BIND
========================================================= */
function bindEvents() {
  $("#feSearchBtn").onclick = search;

  $("#feLoadMore").onclick = renderMore;

  $$(".fe-sort-btn").forEach(btn => {
    btn.onclick = () => {
      $$(".fe-sort-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      window.FINDER.currentSort = btn.dataset.sort;
      search();
    };
  });

  $("#feModalDetailBtn").onclick = () => {
    closeModal();
    openDetail(window.FINDER.currentItem);
  };
  $("#feModalCloseBtn").onclick = closeModal;

  $("#feDetailBackBtn").onclick = () => {
    $("#feDetailSection").style.display = "none";
  };
}

/* =========================================================
   INIT
========================================================= */
async function FinderInit() {
  const root = $(".finder");
  if (!root) return;

  window.FINDER.dataUrl = root.dataset.source;

  renderUI();
  await renderChips();
  await loadData();
  bindEvents();

  console.log("finder-engine.js 정상 초기화 완료");
}

document.addEventListener("DOMContentLoaded", FinderInit);
