/************************************************************
 *  FINDER ENGINE v3 (단일 파일 완성본)
 *  - .finder[data-source="JSON_URL"] 에 삽입하면 동작
 ************************************************************/

/* =============== 공통 유틸 =============== */

const FE = {
  config: {
    dataUrl: ""
  },
  raw: null,
  supports: [],
  ages: [],
  regions: [],
  ageGroups: {},
  selectedAges: [],
  selectedRegions: [],
  filtered: [],
  currentSort: "default",
  visible: 0,
  pageSize: 8,
  currentItem: null
};

const $  = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

/* 금액/마감 파싱 */
function FE_parseAmount(str) {
  if (!str) return 0;
  const num = parseInt(String(str).replace(/[^0-9]/g, ""), 10);
  if (isNaN(num)) return 0;
  if (str.indexOf("억")   > -1) return num * 100000000;
  if (str.indexOf("천만") > -1) return num * 10000000;
  if (str.indexOf("만")   > -1) return num * 10000;
  return num;
}

function FE_parseDeadlineDays(str) {
  if (!str) return 9999;
  str = String(str).trim();
  if (str.indexOf("D-") === 0) {
    const n = parseInt(str.replace("D-", ""), 10);
    return isNaN(n) ? 9999 : n;
  }
  return 9999; // 상시 등은 맨 뒤
}

/* 메타 텍스트 */
function FE_buildMeta(item) {
  const region = item.region || "-";
  const ages   = (item.ages || []).join(", ") || "-";
  const cat    = item.category || "-";
  return `${region} | ${ages} | ${cat}`;
}

/* =============== 데이터 로딩 =============== */

async function FE_loadData() {
  if (!FE.config.dataUrl) {
    throw new Error("dataUrl 없음");
  }

  const res = await fetch(FE.config.dataUrl);
  if (!res.ok) throw new Error("JSON 로드 실패: " + res.status);
  const json = await res.json();

  FE.raw       = json;
  FE.ages      = json.ages || [];
  FE.regions   = json.regions || [];
  FE.ageGroups = json.ageGroups || {};

  const templates = json.programTemplates || [];
  let id = 1;
  const list = [];

  templates.forEach(tpl => {
    const tplAges = FE.ageGroups[tpl.agesKey] || FE.ages;

    FE.regions.forEach(region => {
      list.push({
        id:       id++,
        code:     tpl.code,
        region:   region,
        title:    `${tpl.titlePrefix || ""} ${region} ${tpl.titleSuffix || ""}`.trim(),
        summary:  tpl.summary  || "",
        amount:   tpl.amount   || "",
        deadline: tpl.deadline || "",
        ages:     tplAges,
        category: tpl.category || "",
        overview: tpl.overview || "",
        detail:   tpl.detail   || {}
      });
    });
  });

  FE.supports = list;
}

/* =============== UI 렌더링 =============== */

function FE_renderUI(container) {
  container.innerHTML = `
    <div class="fe-filter-wrap">
      <div class="fe-section-title">조건 선택</div>

      <div class="fe-filter-block">
        <div class="fe-filter-label">연령대</div>
        <div class="fe-chip-group" id="feAgeChips"></div>
      </div>

      <div class="fe-filter-block">
        <div class="fe-filter-label">지역</div>
        <div class="fe-chip-group" id="feRegionChips"></div>
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
      <button id="feLoadMore" class="fe-loadmore" style="display:none;">더 보기</button>
    </div>

    <div id="feDetailSection" class="fe-detail" style="display:none;">
      <button id="feDetailBackBtn" class="fe-detail-back">← 목록으로 돌아가기</button>
      <h2 id="feDetailTitle"></h2>
      <div id="feDetailMeta" class="fe-detail-meta"></div>

      <h3>지원 개요</h3>
      <div id="feDetailOverview"></div>

      <h3>지원 대상</h3>
      <div id="feDetailTarget"></div>

      <h3>지원 내용</h3>
      <div id="feDetailBenefit"></div>

      <h3>신청 방법</h3>
      <div id="feDetailMethod"></div>

      <h3>주의사항</h3>
      <div id="feDetailCaution"></div>
    </div>
  `;

  // 모달은 body에 1개만 추가
  if (!$("#feModal")) {
    const modal = document.createElement("div");
    modal.id = "feModal";
    modal.className = "fe-modal-backdrop";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="fe-modal">
        <h3 id="feModalTitle"></h3>
        <p id="feModalDesc"></p>
        <div id="feModalMeta" class="fe-modal-meta"></div>

        <button id="feModalDetailBtn" class="fe-modal-btn-main">상세 보기 →</button>
        <button id="feModalCloseBtn" class="fe-modal-btn-sub">닫기</button>
      </div>
    `;
    document.body.appendChild(modal);
  }
}

/* 칩 렌더링 */
function FE_renderChips() {
  const ageBox    = $("#feAgeChips");
  const regionBox = $("#feRegionChips");
  if (!ageBox || !regionBox) return;

  ageBox.innerHTML = FE.ages
    .map(a => `<button class="fe-chip" data-age="${a}">${a}</button>`)
    .join("");

  regionBox.innerHTML = FE.regions
    .map(r => `<button class="fe-chip" data-region="${r}">${r}</button>`)
    .join("");

  $$(".fe-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      chip.classList.toggle("active");

      if (chip.dataset.age) {
        const v = chip.dataset.age;
        if (chip.classList.contains("active")) {
          if (!FE.selectedAges.includes(v)) FE.selectedAges.push(v);
        } else {
          FE.selectedAges = FE.selectedAges.filter(x => x !== v);
        }
      }

      if (chip.dataset.region) {
        const v = chip.dataset.region;
        if (chip.classList.contains("active")) {
          if (!FE.selectedRegions.includes(v)) FE.selectedRegions.push(v);
        } else {
          FE.selectedRegions = FE.selectedRegions.filter(x => x !== v);
        }
      }

      FE_renderTags();
    });
  });
}

/* 선택된 태그 텍스트 */
function FE_renderTags() {
  const box = $("#feSelectedTags");
  if (!box) return;

  let parts = [];
  if (FE.selectedAges.length) {
    parts.push(`연령: ${FE.selectedAges.join(", ")}`);
  }
  if (FE.selectedRegions.length) {
    parts.push(`지역: ${FE.selectedRegions.join(", ")}`);
  }
  box.textContent = parts.join(" / ");
}

/* =============== 검색 / 정렬 / 카드 =============== */

function FE_applySort() {
  const key = FE.currentSort || "default";
  const list = FE.filtered;

  if (key === "deadline") {
    list.sort((a, b) => FE_parseDeadlineDays(a.deadline) - FE_parseDeadlineDays(b.deadline));
  } else if (key === "amount") {
    list.sort((a, b) => FE_parseAmount(b.amount) - FE_parseAmount(a.amount));
  }
  // default 는 원래 순서 유지
}

function FE_search() {
  const supports = FE.supports;
  const selAges  = FE.selectedAges;
  const selRegs  = FE.selectedRegions;

  FE.filtered = supports.filter(item => {
    const ageOK =
      !selAges.length ||
      (item.ages || []).some(a => selAges.includes(a));

    const regOK =
      !selRegs.length ||
      selRegs.includes(item.region);

    return ageOK && regOK;
  });

  FE_applySort();

  FE.visible = 0;
  const grid = $("#feGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (!FE.filtered.length) {
    grid.innerHTML = `
      <div class="fe-empty">
        <div style="font-size:32px;">😢</div>
        <p><b>조건에 맞는 지원금이 없습니다.</b></p>
        <p style="font-size:12px; margin-top:4px;">연령 또는 지역을 넓혀서 다시 검색해 보세요.</p>
      </div>
    `;
    $("#feResultCount").textContent = "0개";
    $("#feLoadMore").style.display = "none";
    $("#feDetailSection").style.display = "none";
    return;
  }

  FE_renderMore();
  $("#feResultCount").textContent = FE.filtered.length + "개";
}

function FE_renderMore() {
  const grid = $("#feGrid");
  if (!grid) return;

  const start = FE.visible;
  const end   = start + FE.pageSize;
  const slice = FE.filtered.slice(start, end);

  slice.forEach(item => {
    const card = document.createElement("div");
    card.className = "sf3-card";

    card.innerHTML = `
      <div class="sf3-badge-region">${item.region}</div>
      <div class="sf3-card-title">${item.title}</div>
      <div class="sf3-card-desc">${item.summary || ""}</div>
      <div class="sf3-card-footer">
        <div class="sf3-card-amount">${item.amount || ""}</div>
        <div class="sf3-card-deadline">마감: ${item.deadline || "확인 필요"}</div>
        <div class="sf3-card-cta">자세히 보기 →</div>
      </div>
    `;

    card.addEventListener("click", () => FE_openModal(item));

    grid.appendChild(card);
  });

  FE.visible += slice.length;
  const moreBtn = $("#feLoadMore");
  if (moreBtn) {
    moreBtn.style.display = FE.visible < FE.filtered.length ? "block" : "none";
  }
}

/* =============== 모달 / 상세 =============== */

function FE_openModal(item) {
  FE.currentItem = item;

  $("#feModalTitle").textContent = item.title || "";
  $("#feModalDesc").textContent  = item.summary || "";
  $("#feModalMeta").textContent  = FE_buildMeta(item);

  $("#feModal").style.display = "flex";
}

function FE_closeModal() {
  const m = $("#feModal");
  if (m) m.style.display = "none";
}

function FE_openDetail(item) {
  FE.currentItem = item;

  $("#feDetailSection").style.display = "block";

  $("#feDetailTitle").textContent = item.title || "";
  $("#feDetailMeta").textContent  = FE_buildMeta(item);

  $("#feDetailOverview").textContent =
    item.overview || item.summary || "";

  $("#feDetailTarget").textContent =
    (item.detail && item.detail.target) ||
    "상세 지원 대상은 공식 공고문을 참고해 주세요.";

  $("#feDetailBenefit").textContent =
    (item.detail && item.detail.benefit) ||
    (item.amount || "지원 금액은 지자체 공고문을 참고해 주세요.");

  $("#feDetailMethod").textContent =
    (item.detail && item.detail.method) ||
    "정부24, 복지로 또는 지자체 홈페이지, 주민센터를 통해 신청할 수 있습니다.";

  $("#feDetailCaution").textContent =
    (item.detail && item.detail.caution) ||
    "지원 조건, 기간, 예산은 매년 변경될 수 있으니 신청 전 반드시 최신 공고문을 확인해 주세요.";

  $("#feDetailSection").scrollIntoView({ behavior: "smooth", block: "start" });
}

/* =============== 이벤트 바인딩 =============== */

function FE_bindEvents() {
  const searchBtn = $("#feSearchBtn");
  if (searchBtn) {
    searchBtn.onclick = () => FE_search();
  }

  const loadMore = $("#feLoadMore");
  if (loadMore) {
    loadMore.onclick = () => FE_renderMore();
  }

  $$(".fe-sort-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      $$(".fe-sort-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      FE.currentSort = btn.dataset.sort || "default";
      if (FE.filtered && FE.filtered.length) {
        FE_search();
      }
    });
  });

  const modalClose = $("#feModalCloseBtn");
  const modalDetail = $("#feModalDetailBtn");
  if (modalClose) {
    modalClose.onclick = () => FE_closeModal();
  }
  if (modalDetail) {
    modalDetail.onclick = () => {
      FE_closeModal();
      if (FE.currentItem) FE_openDetail(FE.currentItem);
    };
  }

  const backBtn = $("#feDetailBackBtn");
  if (backBtn) {
    backBtn.onclick = () => {
      $("#feDetailSection").style.display = "none";
      $("#feGrid").scrollIntoView({ behavior: "smooth", block: "start" });
    };
  }
}

/* =============== INIT =============== */

async function SupportFinderInit() {
  try {
    const container = $(".finder");
    if (!container) return;

    const url = container.dataset.source;
    if (!url) {
      console.error("finder-engine: data-source 속성이 없습니다.");
      return;
    }

    FE.config.dataUrl = url;

    FE_renderUI(container);
    await FE_loadData();
    FE_renderChips();
    FE_bindEvents();

    console.log("finder-engine 초기화 완료");
  } catch (e) {
    console.error("finder-engine 초기화 실패:", e);
    const grid = $("#feGrid") || $(".finder");
    if (grid) {
      grid.innerHTML = `<div class="fe-empty">데이터를 불러오는 중 오류가 발생했습니다.</div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", SupportFinderInit);
