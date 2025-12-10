/************************************************************
 *  SUPPORT FINDER v3 — 정적 UI 전용 (Blogger 본 블로그용)
 *  - HTML/CSS 이미 존재하는 페이지 기준
 *  - JS는 데이터 로딩 + 검색 + 정렬 + 모달 + 상세 출력만 담당
 ************************************************************/

/* =========================================================
   CONFIG
========================================================= */
const DATA_URL = "https://support-data.pages.dev/support-data.json";

const CTA1_URL = "https://govfundplus.ddaengddaenge.com/p/blog-page_1.html";
const CTA2_URL = "https://govfundplus.ddaengddaenge.com/2025/12/5.html";

/* =========================================================
   GLOBAL
========================================================= */
let ALL_SUPPORTS = [];
let filtered = [];
let visible = 0;
let currentSort = "default";

let selectedAges = [];
let selectedRegions = [];

const PAGE_SIZE = 8;
let CURRENT = null;

const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* =========================================================
   HELPERS
========================================================= */
function parseAmountNumber(str){
  if(!str) return 0;
  const num = parseInt(String(str).replace(/[^0-9]/g,""),10);
  if(isNaN(num)) return 0;
  if(str.includes("억")) return num * 100000000;
  if(str.includes("천만")) return num * 10000000;
  if(str.includes("만")) return num * 10000;
  return num;
}

function parseDeadlineDays(str){
  if(!str) return null;
  if(str.startsWith("D-")){
    const n = parseInt(str.replace("D-",""),10);
    return isNaN(n) ? null : n;
  }
  return null;
}

/* =========================================================
   SUMMARY
========================================================= */
function calcChanceText(item){
  let score = 0;
  const ageMatch = !selectedAges.length || (item.ages || []).some(a => selectedAges.includes(a));
  const regionMatch = !selectedRegions.length || selectedRegions.includes(item.region);

  if(ageMatch) score += 40;
  if(regionMatch) score += 40;
  if(item.category) score += 20;

  if(score >= 80) return "높음";
  if(score >= 50) return "보통";
  return "낮음";
}

function calcDifficultyText(item){
  const txt = (item.detail?.method || "").toLowerCase();
  if(!txt) return "보통";

  const hasOnline = /온라인|인터넷|복지로|정부24/.test(txt);
  const hasVisit  = /방문|센터|주민센터/.test(txt);
  const hasDocs   = /서류|증빙|심사/.test(txt);

  if(hasOnline && !hasVisit) return "쉬움";
  if(hasOnline && hasVisit) return "보통";
  if(hasVisit && hasDocs) return "어려움";
  return "보통";
}

function calcDeadlineLevelText(deadline){
  if(!deadline) return "일정 확인 필요";
  const d = String(deadline).trim();

  if(["상시","연중","수시"].includes(d)) return "상시 진행";

  const days = parseDeadlineDays(d);
  if(days == null) return "마감 일정 확인 필요";
  if(days <= 7) return "매우 급함";
  if(days <= 30) return "임박";
  if(days <= 90) return "보통";
  return "여유 있음";
}

/* =========================================================
   AUTO DETAIL TEXT
========================================================= */
function detectCategoryType(item){
  const cat = (item.category || "").toLowerCase();
  const t = (item.title || "").toLowerCase();

  if(cat.includes("주거") || t.includes("월세")) return "housing";
  if(cat.includes("취업") || cat.includes("교육")) return "job";
  if(cat.includes("생활") || cat.includes("에너지")) return "living";
  if(cat.includes("의료") || cat.includes("건강")) return "medical";
  if(cat.includes("소상공인")) return "business";
  if(cat.includes("노인")) return "senior";
  if(cat.includes("가정")) return "family";
  return "generic";
}

// (❗ 그대로 유지 — 생략 가능하지만 요청 시 전체 다시 보여줌)
function buildAutoDetail(item){ /* 그대로 유지 */ }

/* =========================================================
   LOAD SUPPORTS
========================================================= */
async function loadSupportData(){
  const res = await fetch(DATA_URL);
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
        id: id++,
        code: tpl.code,
        region,
        title: `${tpl.titlePrefix || ""} ${region} ${tpl.titleSuffix || ""}`.trim(),
        summary: tpl.summary || "",
        amount: tpl.amount || "",
        deadline: tpl.deadline || "",
        ages: tplAges,
        category: tpl.category || "",
        detail: tpl.detail || {},
        overview: tpl.overview || ""
      });
    });
  });

  ALL_SUPPORTS = list;
}

/* =========================================================
   RENDER FILTER CHIPS
========================================================= */
async function renderChipsFromConfig(){
  const res = await fetch(DATA_URL);
  const json = await res.json();

  const ages = json.ages || [];
  const regions = json.regions || [];

  $("ageChips").innerHTML = ages
    .map(a => `<button class="sf3-chip" data-age="${a}">${a}</button>`).join("");

  $("regionChips").innerHTML = regions
    .map(r => `<button class="sf3-chip" data-region="${r}">${r}</button>`).join("");

  $$(".sf3-chip").forEach(chip => {
    chip.onclick = () => {
      chip.classList.toggle("active");

      if(chip.dataset.age){
        const v = chip.dataset.age;
        if(chip.classList.contains("active")){
          if(!selectedAges.includes(v)) selectedAges.push(v);
        } else {
          selectedAges = selectedAges.filter(x => x !== v);
        }
      }

      if(chip.dataset.region){
        const v = chip.dataset.region;
        if(chip.classList.contains("active")){
          if(!selectedRegions.includes(v)) selectedRegions.push(v);
        } else {
          selectedRegions = selectedRegions.filter(x => x !== v);
        }
      }

      renderTags();
    };
  });
}

function renderTags(){
  let txt = "";
  if(selectedAges.length) txt += `연령: ${selectedAges.join(", ")}`;
  if(selectedRegions.length){
    if(txt) txt += "\n";
    txt += `지역: ${selectedRegions.join(", ")}`;
  }
  $("selectedTags").textContent = txt;
}

/* =========================================================
   SORT
========================================================= */
function parseDeadlineForSort(d){
  if(!d) return 9999;
  if(String(d).startsWith("D-")){
    const n = parseInt(d.replace("D-",""),10);
    return isNaN(n) ? 9999 : n;
  }
  return 9999;
}

function applySort(){
  if(currentSort === "deadline"){
    filtered.sort((a,b)=>parseDeadlineForSort(a.deadline) - parseDeadlineForSort(b.deadline));
  } else if(currentSort === "amount"){
    filtered.sort((a,b)=>parseAmountNumber(b.amount) - parseAmountNumber(a.amount));
  }
}

/* =========================================================
   SEARCH
========================================================= */
function search(){
  filtered = ALL_SUPPORTS.filter(item=>{
    const ageOK = !selectedAges.length || item.ages.some(a=>selectedAges.includes(a));
    const regionOK = !selectedRegions.length || selectedRegions.includes(item.region);
    return ageOK && regionOK;
  });

  applySort();
  visible = 0;
  $("cardGrid").innerHTML = "";

  if(!filtered.length){
    $("cardGrid").innerHTML = `
      <div class="sf3-empty">
        <div class="emoji">😢</div>
        <p><b>조건에 맞는 지원금이 없습니다.</b></p>
        <p style="font-size:12px;margin-top:4px;">연령 또는 지역을 넓혀 다시 검색하세요.</p>
      </div>
    `;
    $("resultCount").textContent = "0개";
    $("loadMore").style.display = "none";
    $("sf3DetailSection").style.display = "none";
    return;
  }

  renderMore();
  $("resultCount").textContent = `${filtered.length}개`;
}

/* =========================================================
   CARD RENDER
========================================================= */
function renderMore(){
  const grid = $("cardGrid");
  const slice = filtered.slice(visible, visible + PAGE_SIZE);

  slice.forEach(item=>{
    const card = document.createElement("div");
    card.className = "sf3-card";

    const showDeadline = item.deadline?.startsWith("D-");

    card.innerHTML = `
      <div class="sf3-badge-region">${item.region}</div>
      ${showDeadline ? `<div class="sf3-badge-deadline">${item.deadline}</div>` : ""}
      <div class="sf3-card-content">
        <div class="sf3-card-title">${item.title}</div>
        <div class="sf3-card-desc">${item.summary}</div>
      </div>
      <div class="sf3-card-footer">
        <div class="sf3-card-amount">${item.amount}</div>
        <div class="sf3-card-deadline">마감: ${item.deadline || "확인 필요"}</div>
        <div class="sf3-card-cta">자세히 보기 →</div>
      </div>
    `;

    card.onclick = ()=> openModal(item);
    grid.appendChild(card);
  });

  visible += slice.length;
  $("loadMore").style.display = visible < filtered.length ? "block" : "none";
}

/* =========================================================
   DETAIL PAGE
========================================================= */
function openDetail(item){
  CURRENT = item;

  const auto = buildAutoDetail(item);

  $("sf3DetailSection").style.display = "block";

  $("sf3DetailTitle").textContent = item.title;

  /* 🔥 특수문자 구분자 통일 — HTML 엔티티 제거 */
  $("sf3DetailMeta").innerHTML = `
    <p>📍 지역: ${item.region}</p>
    <p>👤 연령: ${item.ages.join(", ")}</p>
    <p>🏷 분야: ${item.category}</p>
    <p>📅 마감일: ${item.deadline}</p>
  `;

  $("sf3SummaryChance").textContent = calcChanceText(item);
  $("sf3SummaryAmount").textContent = item.amount;
  $("sf3SummaryDifficulty").textContent = calcDifficultyText(item);
  $("sf3SummaryDeadlineLevel").textContent = calcDeadlineLevelText(item.deadline);

  $("sf3DetailOverview").innerHTML = `<p>${item.overview || auto.overview}</p>`;
  $("sf3DetailTarget").innerHTML = `<p>${item.detail?.target || auto.target}</p>`;
  $("sf3DetailBenefit").innerHTML = `<p><strong>지원 금액:</strong> ${item.amount}</p><p>${item.detail?.benefit || auto.benefit}</p>`;
  $("sf3DetailMethod").innerHTML = `<p>${item.detail?.method || auto.method}</p>`;
  $("sf3DetailCaution").innerHTML = `<p>${item.detail?.caution || auto.caution}</p>`;

  $("sf3DetailEtc").innerHTML =
    item.detail?.link
      ? `<p>공식 링크: <a href="${item.detail.link}" target="_blank">바로가기</a></p>`
      : `<p>자세한 내용은 공고문 참고</p>`;

  renderRecommendations(item);
}

/* =========================================================
   RECOMMENDATIONS
========================================================= */
function renderRecommendations(current){
  const box = $("sf3DetailRecommends");

  const unique = {};
  ALL_SUPPORTS.forEach(item=>{ if(!unique[item.code]) unique[item.code] = item; });

  let list = Object.values(unique).filter(it => it.code !== current.code);

  function score(item){
    let s = 0;
    s += parseAmountNumber(item.amount);
    if(calcChanceText(item)==="높음") s+=50;
    return s;
  }

  list = list.map(it=>({...it,score:score(it)}))
             .sort((a,b)=>b.score - a.score)
             .slice(0,3);

  box.innerHTML = list.map(it => `
    <div class="sf3-detail-reco-item" data-id="${it.id}">
      <div>${it.title}</div>
      <div style="font-size:11px;color:#6B7280;">${it.region} · ${it.amount}</div>
    </div>
  `).join("");

  $$(".sf3-detail-reco-item").forEach(el=>{
    el.onclick = ()=>{
      const id = Number(el.dataset.id);
      const t = ALL_SUPPORTS.find(x=>x.id===id);
      if(t) openDetail(t);
    };
  });
}

/* =========================================================
   MODAL
========================================================= */
function openModal(item){
  CURRENT = item;

  $("sf3ModalTitle").textContent = item.title;
  $("sf3ModalDesc").textContent = item.summary;

  /* 🔥 여기 특수문자· 통일 */
  $("sf3ModalMeta").textContent =
    `${item.region} · ${item.ages.join(", ")} · ${item.category}`;

  $("sf3ModalBackdrop").style.display = "flex";
}

function closeModal(){
  $("sf3ModalBackdrop").style.display = "none";
}

/* =========================================================
   CTA
========================================================= */
function bindModalCtas(){
  $("sf3ModalCtaMain").onclick = ()=> window.open(CTA1_URL);
  $("sf3ModalCtaSub").onclick  = ()=> window.open(CTA2_URL);

  $("sf3DetailCtaMain").onclick = ()=> window.open(CTA1_URL);
  $("sf3DetailCtaSub").onclick  = ()=> window.open(CTA2_URL);

  $("sf3ModalDetailBtn").onclick = ()=>{
    closeModal();
    if(CURRENT) openDetail(CURRENT);
  };

  $("sf3ModalCloseBtn").onclick = closeModal;
}

/* =========================================================
   EVENTS
========================================================= */
function bindEvents(){
  $("searchBtn").onclick = search;
  $("loadMore").onclick = renderMore;

  $$(".sf3-sort-btn").forEach(btn=>{
    btn.onclick = ()=>{
      $$(".sf3-sort-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;

      if(filtered.length){
        applySort();
        visible = 0;
        $("cardGrid").innerHTML = "";
        renderMore();
      }
    };
  });

  $("scrollToFilter").onclick = ()=>{
    document.querySelector(".sf3-main").scrollIntoView({behavior:"smooth"});
  };

  $("sf3DetailBackBtn").onclick = ()=>{
    $("sf3DetailSection").style.display = "none";
    $("cardGrid").scrollIntoView({behavior:"smooth"});
  };
}

/* =========================================================
   INIT
========================================================= */
async function init(){
  await renderChipsFromConfig();
  await loadSupportData();
  bindEvents();
  bindModalCtas();
  console.log("✅ Support Finder 정적 UI 초기화 완료");
}

document.addEventListener("DOMContentLoaded", init);
