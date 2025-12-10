/************************************************************
 *  SUPPORT FINDER v3 — 정적 UI 전용 (Blogger 본 블로그용)
 *  - 특수문자(·) 자동 변환 문제 해결 → 안전한 bullet(•) 사용
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
let filtered     = [];
let visible      = 0;
let currentSort  = "default";
let selectedAges = [];
let selectedRegions = [];
let CURRENT = null;

const PAGE_SIZE = 8;
const $  = id  => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* 안전한 bullet 문자 */
const SEP = " • ";

/* =========================================================
   PARSE HELPERS
========================================================= */
function parseAmountNumber(str){
  if(!str) return 0;
  const num = parseInt(String(str).replace(/[^0-9]/g,""),10);
  if(isNaN(num)) return 0;
  if(str.includes("억"))   return num * 100000000;
  if(str.includes("천만")) return num * 10000000;
  if(str.includes("만"))   return num * 10000;
  return num;
}

function parseDeadlineDays(str){
  if(!str) return null;
  str = String(str).trim();
  if(str.startsWith("D-")){
    const n = parseInt(str.replace("D-",""),10);
    return isNaN(n) ? null : n;
  }
  if(["상시","수시","연중"].includes(str)) return null;
  return null;
}

/* =========================================================
   SUMMARY TEXT
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
  const hasOnline = /온라인|홈페이지|정부24|복지로|인터넷/.test(txt);
  const hasVisit  = /방문|센터|주민센터|창구/.test(txt);
  const hasDocs   = /서류|증빙|심사/.test(txt);

  if(hasOnline && !hasVisit) return "쉬움";
  if(hasOnline && hasVisit)  return "보통";
  if(hasVisit  && hasDocs)   return "어려움";
  return "보통";
}

function calcDeadlineLevelText(deadline){
  if(!deadline) return "일정 확인 필요";
  const d = String(deadline).trim();
  if(["상시","수시","연중"].includes(d)) return "상시 진행";

  const days = parseDeadlineDays(d);
  if(days == null) return "마감 일정 확인 필요";
  if(days <= 7) return "매우 급함";
  if(days <= 30) return "임박";
  if(days <= 90) return "보통";
  return "여유 있음";
}

/* =========================================================
   LOAD SUPPORT DATA
========================================================= */
async function loadSupportData(){
  const res  = await fetch(DATA_URL);
  const json = await res.json();

  const templates = json.programTemplates || [];
  const regions   = json.regions || [];
  const ages      = json.ages || [];
  const ageGroups = json.ageGroups || {};

  const list = [];
  let id = 1;

  templates.forEach(tpl=>{
    const tplAges = ageGroups[tpl.agesKey] || ages;
    regions.forEach(region=>{
      list.push({
        id:       id++,
        code:     tpl.code,
        region,
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

  ALL_SUPPORTS = list;
}

/* =========================================================
   LOAD CHIPS
========================================================= */
async function renderChipsFromConfig(){
  const res  = await fetch(DATA_URL);
  const json = await res.json();

  const ages    = json.ages || [];
  const regions = json.regions || [];

  $("ageChips").innerHTML =
    ages.map(a => `<button class="sf3-chip" data-age="${a}">${a}</button>`).join("");

  $("regionChips").innerHTML =
    regions.map(r => `<button class="sf3-chip" data-region="${r}">${r}</button>`).join("");

  $$(".sf3-chip").forEach(chip=>{
    chip.onclick = ()=>{
      chip.classList.toggle("active");

      if(chip.dataset.age){
        const v = chip.dataset.age;
        chip.classList.contains("active")
          ? selectedAges.push(v)
          : selectedAges = selectedAges.filter(x=>x!==v);
      }

      if(chip.dataset.region){
        const v = chip.dataset.region;
        chip.classList.contains("active")
          ? selectedRegions.push(v)
          : selectedRegions = selectedRegions.filter(x=>x!==v);
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
   SEARCH
========================================================= */
function applySort(){
  if(currentSort === "deadline"){
    filtered.sort((a,b)=> parseDeadlineDays(a.deadline) - parseDeadlineDays(b.deadline));
  } else if(currentSort === "amount"){
    filtered.sort((a,b)=> parseAmountNumber(b.amount) - parseAmountNumber(a.amount));
  }
}

function search(){
  filtered = ALL_SUPPORTS.filter(item=>{
    const ageOK = !selectedAges.length || (item.ages || []).some(a => selectedAges.includes(a));
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
        <b>조건에 맞는 지원금이 없습니다.</b>
      </div>
    `;
    $("loadMore").style.display = "none";
    return;
  }

  renderMore();
  $("resultCount").textContent = `${filtered.length}개`;
}

/* =========================================================
   RENDER CARDS
========================================================= */
function renderMore(){
  const grid = $("cardGrid");
  const slice = filtered.slice(visible, visible + PAGE_SIZE);

  slice.forEach(item=>{
    const card = document.createElement("div");
    card.className = "sf3-card";

    card.innerHTML = `
      <div class="sf3-badge-region">${item.region}</div>
      <div class="sf3-card-title">${item.title}</div>
      <div class="sf3-card-desc">${item.summary}</div>
      <div class="sf3-card-deadline">마감: ${item.deadline}</div>
    `;

    card.onclick = ()=> openModal(item);
    grid.appendChild(card);
  });

  visible += slice.length;
  $("loadMore").style.display = visible < filtered.length ? "block" : "none";
}

/* =========================================================
   DETAIL PAGE META 출력 개선 (• 적용)
========================================================= */
function buildMeta(item){
  const region = item.region || "-";
  const ages   = (item.ages || []).join(", ") || "-";
  const cat    = item.category || "-";

  return `${region}${SEP}${ages}${SEP}${cat}`;
}

/* =========================================================
   MODAL
========================================================= */
function openModal(item){
  CURRENT = item;

  $("sf3ModalTitle").textContent = item.title;
  $("sf3ModalDesc").textContent  = item.summary;

  /* 여기! Bullet(•) 로 표시 */
  $("sf3ModalMeta").textContent = buildMeta(item);

  $("sf3ModalBackdrop").style.display = "flex";
}

function closeModal(){
  $("sf3ModalBackdrop").style.display = "none";
}

/* =========================================================
   DETAIL PAGE
========================================================= */
function openDetail(item){
  CURRENT = item;

  $("sf3DetailSection").style.display = "block";

  $("sf3DetailTitle").textContent = item.title;

  $("sf3DetailMeta").innerHTML = `
    <p>${buildMeta(item)}</p>
    <p>마감: ${item.deadline}</p>
  `;

  $("sf3SummaryChance").textContent        = calcChanceText(item);
  $("sf3SummaryAmount").textContent        = item.amount;
  $("sf3SummaryDifficulty").textContent    = calcDifficultyText(item);
  $("sf3SummaryDeadlineLevel").textContent = calcDeadlineLevelText(item.deadline);

  $("sf3DetailOverview").innerHTML = `<p>${item.overview}</p>`;
  $("sf3DetailTarget").innerHTML   = `<p>${item.detail?.target || ""}</p>`;
  $("sf3DetailBenefit").innerHTML  = `<p>${item.detail?.benefit || ""}</p>`;
  $("sf3DetailMethod").innerHTML   = `<p>${item.detail?.method || ""}</p>`;
  $("sf3DetailCaution").innerHTML  = `<p>${item.detail?.caution || ""}</p>`;

  $("sf3DetailEtc").innerHTML = `
    ${item.detail?.contact ? `<p>문의: ${item.detail.contact}</p>` : ""}
    ${item.detail?.link ? `<p><a href="${item.detail.link}" target="_blank">공식 링크</a></p>` : ""}
  `;

  $("sf3DetailSection").scrollIntoView({behavior:"smooth"});
}

/* =========================================================
   CTA
========================================================= */
function bindModalCtas(){
  $("sf3ModalCtaMain").onclick = ()=> window.open(CTA1_URL, "_blank");
  $("sf3DetailCtaMain").onclick = ()=> window.open(CTA1_URL, "_blank");

  $("sf3ModalCtaSub").onclick = ()=> window.open(CTA2_URL, "_blank");
  $("sf3DetailCtaSub").onclick = ()=> window.open(CTA2_URL, "_blank");

  $("sf3ModalDetailBtn").onclick = ()=>{
    closeModal();
    if(CURRENT) openDetail(CURRENT);
  };

  $("sf3ModalCloseBtn").onclick = closeModal;
}

/* =========================================================
   INIT
========================================================= */
async function init(){
  await renderChipsFromConfig();
  await loadSupportData();
  bindEvents();
  bindModalCtas();
  console.log("지원금 검색기 초기화 완료");
}

function bindEvents(){
  $("searchBtn").onclick = search;
  $("loadMore").onclick = renderMore;

  $$(".sf3-sort-btn").forEach(btn=>{
    btn.onclick = ()=>{
      $$(".sf3-sort-btn").forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort;
      search();
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

document.addEventListener("DOMContentLoaded", init);
