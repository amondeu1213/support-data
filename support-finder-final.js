/************************************************************
 * SUPPORT FINDER FINAL — Blogger 최적화 완성본
 * - 특수문자 완전 제거 (· • → " | ")
 * - 칩 정상동작 / 검색·정렬 정상 / 상세페이지 + TOP3 정상
 ************************************************************/

/* ========================= CONFIG ========================= */
const DATA_URL = "https://support-data.pages.dev/support-data.json";

const CTA1_URL = "https://govfundplus.ddaengddaenge.com/p/blog-page_1.html";
const CTA2_URL = "https://govfundplus.ddaengddaenge.com/2025/12/5.html";

const SEP = " | "; // 안전한 ASCII 구분자

/* ========================= GLOBAL ========================= */
let ALL_SUPPORTS = [];
let filtered = [];
let visible = 0;

let selectedAges = [];
let selectedRegions = [];
let currentSort = "default";

let CURRENT = null;

const PAGE_SIZE = 8;

const $  = id  => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ========================= HELPERS ========================= */
function parseAmount(str){
  if(!str) return 0;
  const num = parseInt(str.replace(/[^0-9]/g,""),10);
  if(isNaN(num)) return 0;
  if(str.includes("억")) return num * 100000000;
  if(str.includes("천만")) return num * 10000000;
  if(str.includes("만"))   return num * 10000;
  return num;
}

function parseDeadlineDays(str){
  if(!str) return 9999;
  str = String(str).trim();
  if(str.startsWith("D-")) return parseInt(str.replace("D-",""),10);
  return 9999;
}

function buildMeta(item){
  return `${item.region}${SEP}${(item.ages || []).join(", ")}${SEP}${item.category || "-"}`;
}

/* ========================= LOAD SUPPORT DATA ========================= */
async function loadSupports(){
  const res = await fetch(DATA_URL);
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
        id: id++,
        region,
        code: tpl.code,
        title: `${tpl.titlePrefix || ""} ${region} ${tpl.titleSuffix || ""}`.trim(),
        summary: tpl.summary || "",
        amount: tpl.amount || "",
        deadline: tpl.deadline || "",
        category: tpl.category || "",
        ages: tplAges,
        overview: tpl.overview || "",
        detail: tpl.detail || {}
      });
    });
  });

  ALL_SUPPORTS = list;
}

/* ========================= CHIP RENDER ========================= */
async function renderChips(){
  const res = await fetch(DATA_URL);
  const json = await res.json();

  $("ageChips").innerHTML =
    json.ages.map(a => `<button class="sf3-chip" data-age="${a}">${a}</button>`).join("");

  $("regionChips").innerHTML =
    json.regions.map(r => `<button class="sf3-chip" data-region="${r}">${r}</button>`).join("");

  $$(".sf3-chip").forEach(chip=>{
    chip.onclick = () => {
      chip.classList.toggle("active");

      if(chip.dataset.age){
        const v = chip.dataset.age;
        chip.classList.contains("active")
          ? (!selectedAges.includes(v) && selectedAges.push(v))
          : selectedAges = selectedAges.filter(x=>x!==v);
      }

      if(chip.dataset.region){
        const v = chip.dataset.region;
        chip.classList.contains("active")
          ? (!selectedRegions.includes(v) && selectedRegions.push(v))
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

/* ========================= SORT ========================= */
function applySort(){
  if(currentSort === "deadline"){
    filtered.sort((a,b)=> parseDeadlineDays(a.deadline) - parseDeadlineDays(b.deadline));
  } else if(currentSort === "amount"){
    filtered.sort((a,b)=> parseAmount(b.amount) - parseAmount(a.amount));
  }
}

/* ========================= SEARCH ========================= */
function search(){
  filtered = ALL_SUPPORTS.filter(item=>{
    const ageOK = !selectedAges.length || item.ages.some(a => selectedAges.includes(a));
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
        조건에 맞는 지원금이 없습니다.
      </div>`;
    $("resultCount").textContent = "0개";
    $("loadMore").style.display = "none";
    return;
  }

  renderMore();
  $("resultCount").textContent = `${filtered.length}개`;
}

/* ========================= CARD RENDER ========================= */
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
      <div class="sf3-card-deadline">마감: ${item.deadline || "확인 필요"}</div>
    `;

    card.onclick = ()=> openModal(item);
    grid.appendChild(card);
  });

  visible += slice.length;
  $("loadMore").style.display = visible < filtered.length ? "block" : "none";
}

/* ========================= MODAL ========================= */
function openModal(item){
  CURRENT = item;

  $("sf3ModalTitle").textContent = item.title;
  $("sf3ModalDesc").textContent = item.summary;
  $("sf3ModalMeta").textContent = buildMeta(item);

  $("sf3ModalBackdrop").style.display = "flex";
}

function closeModal(){
  $("sf3ModalBackdrop").style.display = "none";
}

/* ========================= DETAIL ========================= */
function openDetail(item){
  CURRENT = item;

  $("sf3DetailSection").style.display = "block";

  $("sf3DetailSection").innerHTML = `
    <h2>${item.title}</h2>
    <p>${buildMeta(item)}</p>

    <h3>지원 개요</h3>
    <p>${item.overview || item.summary}</p>

    <h3>지원 대상</h3>
    <p>${item.detail.target || "상세 공고문에서 확인 필요"}</p>

    <h3>지원 내용</h3>
    <p>${item.detail.benefit || item.amount}</p>

    <h3>신청 방법</h3>
    <p>${item.detail.method || "정부24 / 지자체 페이지에서 신청"}</p>

    <h3>유의사항</h3>
    <p>${item.detail.caution || "정확한 내용은 공식 공고문 반드시 확인"}</p>

    <h3>비슷한 사람들이 함께 신청한 지원금 TOP 3</h3>
    <div id="sf3DetailRecommends"></div>

    <button id="sf3DetailBackBtn" class="sf3-primary-btn" style="margin-top:20px;">← 목록으로</button>
  `;

  $("sf3DetailBackBtn").onclick = ()=>{
    $("sf3DetailSection").style.display = "none";
    $("cardGrid").scrollIntoView({behavior:"smooth"});
  };

  renderRecommendations(item);
}

/* ========================= RECOMMENDATIONS ========================= */
function renderRecommendations(current){
  const box = $("sf3DetailRecommends");

  let list = ALL_SUPPORTS.filter(x => x.code !== current.code);

  list = list
    .map(item => ({...item, score: parseAmount(item.amount)}))
    .sort((a,b)=> b.score - a.score)
    .slice(0,3);

  box.innerHTML = list.map(item=>`
    <div class="sf3-card" style="padding:12px;" onclick="openDetail(ALL_SUPPORTS.find(x=>x.id==${item.id}))">
      <b>${item.title}</b>
      <p style="font-size:12px;">${item.region} | ${item.amount}</p>
    </div>
  `).join("");
}

/* ========================= EVENTS ========================= */
function bindEvents(){
  $("searchBtn").onclick = search;
  $("loadMore").onclick = renderMore;

  $("scrollToFilter").onclick = ()=>{
    document.querySelector(".sf3-main").scrollIntoView({behavior:"smooth"});
  };

  $("sf3ModalCloseBtn").onclick = closeModal;
  $("sf3ModalDetailBtn").onclick = ()=>{
    closeModal();
    openDetail(CURRENT);
  };
}

/* ========================= INIT ========================= */
async function init(){
  await renderChips();
  await loadSupports();
  bindEvents();
  console.log("지원금 검색기 FINAL 로드 완료");
}

document.addEventListener("DOMContentLoaded", init);
