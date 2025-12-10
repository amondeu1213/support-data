/************************************************************
 *  FINDER ENGINE v1.0 (Universal Version)
 *  - Blogger / Tistory / WordPress 등 모든 사이트에서 작동
 *  - 특수문자 완전 제거
 *  - HTML 삽입형 자동 검색기 엔진
 *  - 데이터소스(JSON)만 바꿔도 다른 주제로 재사용 가능
 ************************************************************/

/* =========================================================
   GLOBAL STATE
========================================================= */
window.FINDER_ENGINE = {
  config: {
    dataUrl: "",
  },
  data: [],
  filtered: [],
  selectedAges: [],
  selectedRegions: [],
  sort: "default",
  page: 0,
  pageSize: 8,
};

/* Shortcut */
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));

/* 안전 구분자 */
const SEP = " | ";

/* =========================================================
   INITIALIZER
========================================================= */

function FinderInit() {
  const container = $(".finder");
  if (!container) {
    console.error("Finder Engine: .finder 컨테이너를 찾을 수 없음");
    return;
  }

  // 📌 HTML에 data-source="" 로 넣은 JSON 주소 읽기
  const url = container.dataset.source;
  if (!url) {
    console.error("Finder Engine: data-source 속성을 찾을 수 없습니다.");
    return;
  }

  FINDER_ENGINE.config.dataUrl = url;

  FinderLoadData().then(() => {
    FinderRenderUI();
    FinderBindEvents();
    console.log("Finder Engine 초기화 완료");
  });
}

/* =========================================================
   LOAD JSON
========================================================= */
async function FinderLoadData() {
  const url = FINDER_ENGINE.config.dataUrl;
  const res = await fetch(url);
  const json = await res.json();

  const templates = json.programTemplates || [];
  const regions = json.regions || [];
  const ages = json.ages || [];
  const ageGroups = json.ageGroups || [];

  let list = [];
  let id = 1;

  templates.forEach(tpl => {
    const tplAges = ageGroups[tpl.agesKey] || ages;

    regions.forEach(region => {
      list.push({
        id: id++,
        code: tpl.code,
        region: region,
        title: `${tpl.titlePrefix || ""} ${region} ${tpl.titleSuffix || ""}`.trim(),
        summary: tpl.summary || "",
        amount: tpl.amount || "",
        deadline: tpl.deadline || "",
        category: tpl.category || "",
        ages: tplAges,
        detail: tpl.detail || {}
      });
    });
  });

  FINDER_ENGINE.data = list;
}

/************************************************************
 * 🔵 PART 1 끝
 * 다음 메시지에서 PART 2 제공
 ************************************************************/
/************************************************************
 *  PART 2 — UI 생성 + 칩 선택 시스템
 ************************************************************/

/* =========================================================
   CREATE UI INSIDE .finder
========================================================= */
function FinderRenderUI() {
  const wrap = $(".finder");

  wrap.innerHTML = `
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

      <button id="feLoadMore" class="fe-loadmore">더 보기</button>
    </div>

    <div id="feModalBackdrop" class="fe-modal-backdrop">
      <div class="fe-modal">
        <h3 id="feModalTitle"></h3>
        <p id="feModalDesc"></p>
        <div id="feModalMeta" class="fe-modal-meta"></div>

        <button id="feModalDetailBtn" class="fe-modal-btn-main">상세 보기 →</button>
        <button id="feModalCloseBtn" class="fe-modal-btn-sub">닫기</button>
      </div>
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

  FinderRenderChips();
}

/* =========================================================
   CHIPS: AGE + REGION
========================================================= */

async function FinderRenderChips() {
  const url = FINDER_ENGINE.config.dataUrl;
  const json = await (await fetch(url)).json();

  const ageBox = $("#feAgeChips");
  const regionBox = $("#feRegionChips");

  ageBox.innerHTML = json.ages
    .map(a => `<button class="fe-chip" data-age="${a}">${a}</button>`)
    .join("");

  regionBox.innerHTML = json.regions
    .map(r => `<button class="fe-chip" data-region="${r}">${r}</button>`)
    .join("");

  // === CHIP CLICK BIND ===
  $$(".fe-chip").forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle("active");

      // AGE
      if (chip.dataset.age) {
        const v = chip.dataset.age;
        chip.classList.contains("active")
          ? !FINDER_ENGINE.selectedAges.includes(v) && FINDER_ENGINE.selectedAges.push(v)
          : FINDER_ENGINE.selectedAges = FINDER_ENGINE.selectedAges.filter(x => x !== v);
      }

      // REGION
      if (chip.dataset.region) {
        const v = chip.dataset.region;
        chip.classList.contains("active")
          ? !FINDER_ENGINE.selectedRegions.includes(v) && FINDER_ENGINE.selectedRegions.push(v)
          : FINDER_ENGINE.selectedRegions = FINDER_ENGINE.selectedRegions.filter(x => x !== v);
      }

      FinderRenderTags();
    };
  });
}

/* =========================================================
   SELECTED TAGS 출력
========================================================= */
function FinderRenderTags() {
  let txt = "";

  if (FINDER_ENGINE.selectedAges.length)
    txt += `연령: ${FINDER_ENGINE.selectedAges.join(", ")}`;

  if (FINDER_ENGINE.selectedRegions.length) {
    if (txt) txt += "\n";
    txt += `지역: ${FINDER_ENGINE.selectedRegions.join(", ")}`;
  }

  $("#feSelectedTags").textContent = txt;
}

/************************************************************
 * 🔵 PART 2 끝
 *  → 다음 메시지에서 PART 3 (검색 + 정렬 + 카드 출력 전체)
 ************************************************************/
/************************************************************
 *  PART 3 — 데이터 로딩 / 검색 / 정렬 / 카드 / 모달
 ************************************************************/

/* =========================================================
   STATE SHORTCUT
========================================================= */
function FE_state() {
  // PART 1 에서 만든 전역 객체
  if (!window.FINDER_ENGINE) window.FINDER_ENGINE = {};
  const S = window.FINDER_ENGINE;

  // 기본값 세팅
  if (!S.supports)        S.supports = [];
  if (!S.filtered)        S.filtered = [];
  if (!S.selectedAges)    S.selectedAges = [];
  if (!S.selectedRegions) S.selectedRegions = [];
  if (!S.currentSort)     S.currentSort = "default";
  if (!S.pageSize)        S.pageSize = 8;
  if (!S.currentItem)     S.currentItem = null;

  return S;
}

/* =========================================================
   PARSE HELPERS
========================================================= */
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
  // 상시, 연중 등은 최하위 정렬
  return 9999;
}

/* =========================================================
   SUPPORT DATA 로딩 (JSON → 전개)
========================================================= */
async function FinderLoadSupports() {
  const S = FE_state();
  const url = S.config && S.config.dataUrl
    ? S.config.dataUrl
    : "https://support-data.pages.dev/support-data.json";

  const res  = await fetch(url);
  const json = await res.json();

  const templates = json.programTemplates || [];
  const regions   = json.regions || [];
  const ages      = json.ages || [];
  const ageGroups = json.ageGroups || {};

  let id = 1;
  const list = [];

  templates.forEach(tpl => {
    const tplAges = ageGroups[tpl.agesKey] || ages;

    regions.forEach(region => {
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

  S.supports = list;
}

/* =========================================================
   META 라인 생성 (특수문자 대신 ASCII 구분자 사용)
========================================================= */
function FinderBuildMeta(item) {
  const S = FE_state();
  const sep = (S.config && S.config.separator) || " | ";

  const region = item.region || "-";
  const ages   = (item.ages || []).join(", ") || "-";
  const cat    = item.category || "-";

  return region + sep + ages + sep + cat;
}

/* =========================================================
   검색 + 정렬
========================================================= */
function FinderApplySort() {
  const S = FE_state();
  const sortKey = S.currentSort || "default";
  const list = S.filtered;

  if (sortKey === "deadline") {
    list.sort((a, b) => FE_parseDeadlineDays(a.deadline) - FE_parseDeadlineDays(b.deadline));
  } else if (sortKey === "amount") {
    list.sort((a, b) => FE_parseAmount(b.amount) - FE_parseAmount(a.amount));
  }
  // default 는 템플릿 순서 유지
}

function FinderSearch() {
  const S = FE_state();
  const supports       = S.supports;
  const selectedAges   = S.selectedAges;
  const selectedRegion = S.selectedRegions;

  S.filtered = supports.filter(item => {
    const ageOK =
      !selectedAges.length ||
      (item.ages || []).some(a => selectedAges.indexOf(a) > -1);

    const regionOK =
      !selectedRegion.length ||
      selectedRegion.indexOf(item.region) > -1;

    return ageOK && regionOK;
  });

  FinderApplySort();

  S.visible = 0;
  const grid = $("#feGrid");
  grid.innerHTML = "";

  if (!S.filtered.length) {
    grid.innerHTML = `
      <div class="fe-empty">
        <div style="font-size:32px;">😢</div>
        <p><b>조건에 맞는 지원금이 없습니다.</b></p>
        <p style="font-size:12px; margin-top:4px;">연령 또는 지역을 조금 넓혀서 다시 검색해 보세요.</p>
      </div>
    `;
    $("#feResultCount").textContent = "0개";
    $("#feLoadMore").style.display = "none";
    $("#feDetailSection").style.display = "none";
    return;
  }

  FinderRenderMore();
  $("#feResultCount").textContent = S.filtered.length + "개";
}

/* =========================================================
   카드 렌더링
========================================================= */
function FinderRenderMore() {
  const S = FE_state();
  const grid  = $("#feGrid");
  const start = S.visible;
  const end   = start + S.pageSize;
  const slice = S.filtered.slice(start, end);

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

    card.onclick = () => FinderOpenModal(item);
    grid.appendChild(card);
  });

  S.visible += slice.length;
  $("#feLoadMore").style.display =
    S.visible < S.filtered.length ? "block" : "none";
}

/* =========================================================
   모달
========================================================= */
function FinderOpenModal(item) {
  const S = FE_state();
  S.currentItem = item;

  $("#feModalTitle").textContent = item.title || "";
  $("#feModalDesc").textContent  = item.summary || "";
  $("#feModalMeta").textContent  = FinderBuildMeta(item);

  $("#feModalBackdrop").style.display = "flex";
}

function FinderCloseModal() {
  $("#feModalBackdrop").style.display = "none";
}

/* =========================================================
   상세 페이지
========================================================= */
function FinderOpenDetail(item) {
  const S = FE_state();
  S.currentItem = item;

  $("#feDetailSection").style.display = "block";

  $("#feDetailTitle").textContent = item.title || "";
  $("#feDetailMeta").textContent  = FinderBuildMeta(item);

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

/************************************************************
 * 🟡 PART 3 끝
 ************************************************************/
/************************************************************
 *  PART 4 — 이벤트 바인딩 / CTA / INIT
 ************************************************************/

/* =========================================================
   CTA (옵션: config에 url 있으면 사용)
========================================================= */
function FinderBindCtas() {
  const S = FE_state();
  const cfg = S.config || {};

  // 만약 나중에 모달/상세 CTA 버튼을 추가한다면 여기서 열기 처리
  // 예시:
  // const mainUrl = cfg.ctaMainUrl;
  // if (mainUrl && $("#feCtaMain")) {
  //   $("#feCtaMain").onclick = () => window.open(mainUrl, "_blank");
  // }
}

/* =========================================================
   이벤트 바인딩
========================================================= */
function FinderBindEvents() {
  const S = FE_state();

  // 검색 버튼
  $("#feSearchBtn").onclick = () => FinderSearch();

  // 더보기 버튼
  $("#feLoadMore").onclick = () => FinderRenderMore();

  // 정렬 버튼
  $$(".fe-sort-btn").forEach(btn => {
    btn.onclick = () => {
      $$(".fe-sort-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      S.currentSort = btn.dataset.sort || "default";

      if (S.filtered && S.filtered.length) {
        FinderSearch();
      }
    };
  });

  // 모달 버튼
  $("#feModalDetailBtn").onclick = () => {
    FinderCloseModal();
    if (S.currentItem) FinderOpenDetail(S.currentItem);
  };
  $("#feModalCloseBtn").onclick = () => FinderCloseModal();

  // 상세 → 목록
  $("#feDetailBackBtn").onclick = () => {
    $("#feDetailSection").style.display = "none";
    $("#feGrid").scrollIntoView({ behavior: "smooth", block: "start" });
  };
}

/* =========================================================
   INIT
========================================================= */
async function FinderInit() {
  // 1) UI 생성
  FinderRenderUI();

  // 2) 칩 렌더
  await FinderRenderChips();

  // 3) 데이터 로딩
  await FinderLoadSupports();

  // 4) 이벤트, CTA 바인딩
  FinderBindEvents();
  FinderBindCtas();

  console.log("finder-engine.js 초기화 완료");
}

/* 페이지 로드 시 자동 초기화 */
document.addEventListener("DOMContentLoaded", FinderInit);

/************************************************************
 * 🟣 PART 4 끝 — finder-engine.js 전체 완성
 ************************************************************/
