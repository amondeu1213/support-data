/************************************************************
 * SUPPORT FINDER v3 — Blogger 전용 자동 UI 생성 버전
 * - HTML은 #sf3-app 하나만 필요
 * - 전체 UI(히어로/필터/카드/상세/모달) JS로 생성
 * - Blogger 구조 변조 무력화
 ************************************************************/
(function(){
  // 중복 로딩 방지
  if (window.SF3_LOADED) return;
  window.SF3_LOADED = true;

  /* =========================================================
     CONFIG
  ========================================================= */
  const DATA_URL   = "https://support-data.pages.dev/support-data.json"; 
  // 필요하면 위를 GitHub JSON 주소로 교체:
  // const DATA_URL = "https://amondeu1213.github.io/support-data/support-data.json";

  const SEARCH_URL = "https://govfundplus.ddaengddaenge.com/p/ai.html";

  /** 카테고리별 링크 매핑 */
  const CATEGORY_LINK_MAP = {
    housing:  "https://govfundplus.ddaengddaenge.com/2025/12/2025-youth-jeonse-loan-guide.html",
    job:      "https://govfundplus.ddaengddaenge.com/2025/12/2025-middleaged-reemployment-training-support-guide.html",
    living:   "https://govfundplus.ddaengddaenge.com/2025/12/2025-low-income-stability-fund.html",
    medical:  "https://govfundplus.ddaengddaenge.com/2025/12/2025-dental-health-insurance-coverage-guide.html",
    family:   "https://govfundplus.ddaengddaenge.com/2025/12/2025-pregnancy-birth-benefit-guide.html",
    senior:   "https://govfundplus.ddaengddaenge.com/2025/12/2025-emergency-welfare-guide.html",
    business: "https://govfundplus.ddaengddaenge.com/2025/12/2025-disabled-support-guide.html",
    generic:  "https://govfundplus.ddaengddaenge.com/p/blog-page_9.html"
  };

  function getButton2Label(cat){
    switch(cat){
      case "housing":  return "주거 지원 자세히 보기";
      case "job":      return "취업·교육 지원 확인하기";
      case "living":   return "생활·바우처 혜택 보기";
      case "medical":  return "의료비 지원 자세히 보기";
      case "family":   return "가족·출산 지원 보기";
      case "senior":   return "노인 지원 안내 보기";
      case "business": return "소상공인·자영업자 지원 보기";
      default:         return "이 지원금 상세 정보 보기";
    }
  }

  /* =========================================================
     GLOBAL STATE
  ========================================================= */
  let ALL_SUPPORTS   = [];
  let filtered       = [];
  let visible        = 0;
  let currentSort    = "default";

  let selectedAges   = [];
  let selectedRegions= [];

  let CURRENT        = null;
  const PAGE_SIZE    = 8;

  const $  = id  => document.getElementById(id);
  const $$ = sel => Array.from(document.querySelectorAll(sel));

  /* =========================================================
     자동 UI 생성 (현재 ai.html UI 그대로 복원)
  ========================================================= */
  function buildSF3UI(){
    const root = document.getElementById("sf3-app") || document.body;
    root.innerHTML = `
      <div class="sf3-container">

        <!-- HERO -->
        <section class="sf3-hero">
          <div>
            <div class="sf3-badge">AI 자동 분석</div>
            <h1>내가 받을 수 있는<br>정부 · 지자체 지원금 한 번에 찾기</h1>
            <p>연령과 거주지만 선택하면<br><b>지원금이 자동으로 추천됩니다.</b></p>
            <button id="scrollToFilter" class="sf3-primary-btn">지원금 조회 시작하기</button>
          </div>

          <div>
            <b>예시 결과</b>
            <ul style="margin:8px 0 6px 18px; font-size:13px;">
              <li>서울 청년 월세 지원 – 월 30만 원</li>
              <li>경기도 취업지원금 – 월 50만 원</li>
              <li>에너지 바우처 – 최대 18만 원</li>
            </ul>
            <p style="font-size:11px; color:#6B7280; margin:0;">※ 실제 결과는 조건에 따라 달라집니다.</p>
          </div>
        </section>

        <!-- FILTER + RESULT -->
        <section class="sf3-main">

          <!-- FILTER -->
          <div class="sf3-filter-panel">
            <h3>1. 조건 선택</h3>
            <small>연령·지역을 넓게 선택할수록 더 많은 지원금이 나옵니다.</small>

            <div style="margin-top:14px; font-size:13px;">연령대</div>
            <div id="ageChips" class="sf3-chip-group"></div>

            <div style="margin-top:18px; font-size:13px;">지역</div>
            <div id="regionChips" class="sf3-chip-group"></div>

            <button id="searchBtn" class="sf3-primary-btn" style="width:100%; margin-top:18px;">
              검색하기 🔍
            </button>
          </div>

          <!-- RESULT -->
          <div class="sf3-result-panel">
            <div class="sf3-result-header">
              <div>
                <div class="sf3-result-title">
                  검색 결과 <span id="resultCount">0개</span>
                </div>
                <div id="selectedTags"></div>
              </div>

              <div class="sf3-sort-group">
                <button class="sf3-sort-btn active" data-sort="default">추천순</button>
                <button class="sf3-sort-btn" data-sort="deadline">마감임박순</button>
                <button class="sf3-sort-btn" data-sort="amount">지원금액순</button>
              </div>
            </div>

            <div id="cardGrid" class="sf3-card-grid">
              <div class="sf3-empty">
                <div class="emoji">🔎</div>
                <p><b>왼쪽에서 연령·지역을 선택한 뒤 검색을 눌러주세요.</b></p>
                <p style="font-size:12px; margin-top:4px;">조건에 맞는 정부·지자체 지원금을 자동으로 찾아드립니다.</p>
              </div>
            </div>

            <button id="loadMore" class="sf3-loadmore">지원금 더 보기 ↓</button>
          </div>
        </section>

        <!-- DETAIL SECTION -->
        <section id="sf3DetailSection" class="sf3-detail" style="display:none;">
          <div class="sf3-detail-inner">

            <h2 id="sf3DetailTitle" class="sf3-detail-title"></h2>
            <div id="sf3DetailMeta" class="sf3-detail-meta"></div>

            <!-- 요약 박스 -->
            <div class="sf3-summary-box">
              <div class="sf3-summary-grid">
                <div class="sf3-summary-item">
                  <span class="sf3-summary-label">받을 확률</span>
                  <span id="sf3SummaryChance" class="sf3-summary-value"></span>
                </div>
                <div class="sf3-summary-item">
                  <span class="sf3-summary-label">예상 지원금</span>
                  <span id="sf3SummaryAmount" class="sf3-summary-value"></span>
                </div>
                <div class="sf3-summary-item">
                  <span class="sf3-summary-label">신청 난이도</span>
                  <span id="sf3SummaryDifficulty" class="sf3-summary-value"></span>
                </div>
                <div class="sf3-summary-item">
                  <span class="sf3-summary-label">마감 상태</span>
                  <span id="sf3SummaryDeadlineLevel" class="sf3-summary-value"></span>
                </div>
              </div>
            </div>

            <!-- CTA 버튼 -->
            <div class="sf3-detail-cta-wrap">
              <button id="sf3DetailCtaMain" class="sf3-cta-btn sf3-cta-main">
                내가 받을 수 있는 지원금 더 찾아보기 💰
              </button>
              <button id="sf3DetailCtaSub" class="sf3-cta-btn sf3-cta-sub">
                상세 안내 보기
              </button>
            </div>

            <!-- 상세내용 -->
            <div class="sf3-detail-block">
              <h3>지원 개요</h3>
              <div id="sf3DetailOverview"></div>
            </div>

            <div class="sf3-detail-block">
              <h3>지원 대상</h3>
              <div id="sf3DetailTarget"></div>
            </div>

            <div class="sf3-detail-block">
              <h3>지원 내용 · 금액</h3>
              <div id="sf3DetailBenefit"></div>
            </div>

            <div class="sf3-detail-block">
              <h3>신청 방법</h3>
              <div id="sf3DetailMethod"></div>
            </div>

            <div class="sf3-detail-block">
              <h3>유의 사항</h3>
              <div id="sf3DetailCaution"></div>
            </div>

            <div class="sf3-detail-block">
              <h3>문의처 · 공식 링크</h3>
              <div id="sf3DetailEtc"></div>
            </div>

            <!-- 추천 지원금 TOP3 -->
            <h3 class="sf3-detail-section-title">
              💡 비슷한 사람들이 함께 많이 신청한 지원금 TOP 3
            </h3>
            <div id="sf3DetailRecommends" class="sf3-detail-reco-list"></div>

            <!-- 수익형 안내 박스 -->
            <h3 class="sf3-detail-section-title">지금 같이 많이 신청하는 혜택</h3>
            <div class="sf3-income-box">
              <div>💡 아래 혜택까지 함께 확인하면, 실제로 손에 들어오는 돈이 더 커질 수 있어요.</div>
              <ul>
                <li>청년·직장인 전용 저금리 대출 한도 조회</li>
                <li>소상공인·프리랜서를 위한 긴급 운영자금</li>
                <li>보험료·이자·고정지출 절감 무료 진단</li>
              </ul>
            </div>

            <!-- 목록으로 -->
            <button id="sf3DetailBackBtn" class="sf3-detail-back-btn">
              ← 목록으로 돌아가기
            </button>
          </div>
        </section>

      </div>

      <!-- MODAL -->
      <div id="sf3ModalBackdrop" class="sf3-modal-backdrop">
        <div class="sf3-modal">
          <h3 id="sf3ModalTitle" class="sf3-modal-title"></h3>
          <p id="sf3ModalDesc" class="sf3-modal-desc"></p>
          <div id="sf3ModalMeta" class="sf3-modal-meta"></div>

          <div class="sf3-modal-cta-wrap">
            <button id="sf3ModalCtaMain" class="sf3-cta-btn sf3-cta-main">
              내가 받을 수 있는 지원금 더 찾아보기 💰
            </button>
            <button id="sf3ModalCtaSub" class="sf3-cta-btn sf3-cta-sub">
              상세 페이지로 이동
            </button>
          </div>

          <button id="sf3ModalDetailBtn" class="sf3-modal-footer-btn">
            이 지원금 상세 보기 →
          </button>
          <button id="sf3ModalCloseBtn" class="sf3-modal-footer-btn">
            닫기
          </button>
        </div>
      </div>
    `;
  }

  /* =========================================================
     CATEGORY DETECT
  ========================================================= */
  function detectCategoryType(item){
    const c = (item.category || "").toLowerCase();
    const t = (item.title || "").toLowerCase();

    if(c.includes("주거") || t.includes("월세") || t.includes("전세")) return "housing";
    if(c.includes("일자리") || c.includes("취업") || t.includes("국민내일배움카드")) return "job";
    if(c.includes("생활") || c.includes("공공요금") || t.includes("에너지")) return "living";
    if(c.includes("의료") || c.includes("건강") || t.includes("의료비")) return "medical";
    if(c.includes("가족") || c.includes("출산") || t.includes("임신")) return "family";
    if(c.includes("노인") || t.includes("기초연금")) return "senior";
    if(c.includes("소상공인") || c.includes("창업")) return "business";

    return "generic";
  }

  /* =========================================================
     PARSERS
  ========================================================= */
  function parseAmountNumber(str){
    if(!str) return 0;
    const num = parseInt(String(str).replace(/[^0-9]/g,""));
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
      const n = parseInt(str.replace("D-",""));
      return isNaN(n)? null : n;
    }
    if(["상시","연중","수시"].includes(str)) return null;
    return null;
  }

  /* =========================================================
     SUMMARY LOGIC
  ========================================================= */
  function calcChanceText(item){
    let score = 0;
    const ageOK    = !selectedAges.length    || item.ages.some(a=>selectedAges.includes(a));
    const regionOK = !selectedRegions.length || selectedRegions.includes(item.region);
    if(ageOK)    score += 40;
    if(regionOK) score += 40;
    if(item.category) score += 20;
    if(score >= 80) return "높음";
    if(score >= 50) return "보통";
    return "낮음";
  }

  function calcDifficultyText(item){
    const txt = (item.detail?.method || item.method || "").toLowerCase();
    if(/온라인/.test(txt) && !/방문/.test(txt)) return "쉬움";
    if(/온라인/.test(txt) &&  /방문/.test(txt)) return "보통";
    if(/서류|증빙/.test(txt))                   return "어려움";
    return "보통";
  }

  function calcDeadlineLevelText(deadline){
    if(!deadline) return "일정 확인 필요";
    const d = String(deadline).trim();
    if(["상시","수시","연중"].includes(d)) return "상시 진행";
    const days = parseDeadlineDays(d);
    if(days == null)  return "마감 일정 확인 필요";
    if(days <= 7)     return "매우 급함";
    if(days <= 30)    return "임박";
    if(days <= 90)    return "보통";
    return "여유 있음";
  }

  /* =========================================================
     LOAD SUPPORT DATA
  ========================================================= */
  async function loadSupportData(){
    const json      = await (await fetch(DATA_URL)).json();
    const templates = json.programTemplates || [];
    const regions   = json.regions || [];
    const ages      = json.ages || [];
    const ageGroups = json.ageGroups || {};

    let id = 1;
    const list = [];

    templates.forEach(tpl=>{
      const tplAges = ageGroups[tpl.agesKey] || ages;

      regions.forEach(region=>{
        list.push({
          id:       id++,
          code:     tpl.code,
          region,
          title:    `${tpl.titlePrefix || ""} ${region} ${tpl.titleSuffix || ""}`.trim(),
          summary:  tpl.summary || "",
          amount:   tpl.amount || "",
          deadline: tpl.deadline || "",
          ages:     tplAges,
          category: tpl.category || "",
          overview: tpl.overview || "",
          detail:   tpl.detail || {}
        });
      });
    });

    ALL_SUPPORTS = list;
  }

  /* =========================================================
     RENDER CHIPS
  ========================================================= */
  async function renderChipsFromConfig(){
    const json    = await (await fetch(DATA_URL)).json();
    const ages    = json.ages || [];
    const regions = json.regions || [];

    $("ageChips").innerHTML =
      ages.map(a=>`<button class="sf3-chip" data-age="${a}">${a}</button>`).join("");

    $("regionChips").innerHTML =
      regions.map(r=>`<button class="sf3-chip" data-region="${r}">${r}</button>`).join("");

    $$(".sf3-chip").forEach(chip=>{
      chip.onclick = ()=>{
        chip.classList.toggle("active");

        if(chip.dataset.age){
          const v = chip.dataset.age;
          chip.classList.contains("active")
            ? !selectedAges.includes(v) && selectedAges.push(v)
            : selectedAges = selectedAges.filter(x=>x!==v);
        }
        if(chip.dataset.region){
          const v = chip.dataset.region;
          chip.classList.contains("active")
            ? !selectedRegions.includes(v) && selectedRegions.push(v)
            : selectedRegions = selectedRegions.filter(x=>x!==v);
        }

        renderTags();
      };
    });
  }

  function renderTags(){
    let txt = "";
    if(selectedAges.length)   txt += `연령: ${selectedAges.join(", ")}`;
    if(selectedRegions.length){
      if(txt) txt += "\n";
      txt += `지역: ${selectedRegions.join(", ")}`;
    }
    $("selectedTags").textContent = txt;
  }

  /* =========================================================
     SORT
  ========================================================= */
  function parseDeadlineForSort(deadline){
    if(!deadline) return 9999;
    if(String(deadline).startsWith("D-")){
      const n = parseInt(deadline.replace("D-",""));
      return isNaN(n)? 9999 : n;
    }
    return 9999;
  }

  function applySort(){
    if(currentSort==="deadline"){
      filtered.sort((a,b)=> parseDeadlineForSort(a.deadline)-parseDeadlineForSort(b.deadline));
    }else if(currentSort==="amount"){
      filtered.sort((a,b)=> parseAmountNumber(b.amount)-parseAmountNumber(a.amount));
    }
  }

  /* =========================================================
     SEARCH
  ========================================================= */
  function search(){
    filtered = ALL_SUPPORTS.filter(item=>{
      const ageOK    = !selectedAges.length    || item.ages.some(a=>selectedAges.includes(a));
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
        </div>`;
      $("resultCount").textContent = "0개";
      $("loadMore").style.display = "none";
      $("sf3DetailSection").style.display = "none";
      return;
    }

    renderMore();
    $("resultCount").textContent = `${filtered.length}개`;
  }

  /* =========================================================
     RENDER CARDS
  ========================================================= */
  function renderMore(){
    const grid  = $("cardGrid");
    const slice = filtered.slice(visible, visible + PAGE_SIZE);

    slice.forEach(item=>{
      const card = document.createElement("div");
      card.className = "sf3-card";
      card.dataset.id = item.id;

      const showDeadline = item.deadline && String(item.deadline).trim().startsWith("D-");

      card.innerHTML = `
        <div class="sf3-badge-region">${item.region}</div>
        ${showDeadline ? `<div class="sf3-badge-deadline">${item.deadline}</div>` : ""}
        <div class="sf3-card-content">
          <div class="sf3-card-title">${item.title}</div>
          <div class="sf3-card-desc">${item.summary || ""}</div>
        </div>
        <div class="sf3-card-footer">
          <div class="sf3-card-amount">${item.amount}</div>
          <div class="sf3-card-deadline">마감: ${item.deadline || "확인 필요"}</div>
          <div class="sf3-card-cta">자세히 보기 →</div>
        </div>
      `;

      grid.appendChild(card);
    });

    visible += slice.length;
    $("loadMore").style.display = visible < filtered.length ? "block" : "none";
  }

  /* =========================================================
     CARD CLICK — EVENT DELEGATION
  ========================================================= */
  document.addEventListener("click", e=>{
    const card = e.target.closest(".sf3-card");
    if(!card) return;

    const id   = Number(card.dataset.id);
    const item = ALL_SUPPORTS.find(x=>x.id === id);
    if(item) openModal(item);
  });

  /* =========================================================
     MODAL
  ========================================================= */
  function openModal(item){
    CURRENT = item;

    $("sf3ModalTitle").textContent = item.title;
    $("sf3ModalDesc").textContent  = item.summary || "";
    $("sf3ModalMeta").textContent  =
      `${item.region} · ${(item.ages||[]).join(", ")} · ${item.category}`;

    $("sf3ModalCtaSub").textContent = getButton2Label(detectCategoryType(item));
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
      <p>📍 지역: ${item.region}</p>
      <p>👤 연령: ${(item.ages||[]).join(", ")}</p>
      <p>🏷 분야: ${item.category}</p>
      <p>📅 마감일: ${item.deadline || "확인 필요"}</p>
    `;

    $("sf3SummaryChance").textContent        = calcChanceText(item);
    $("sf3SummaryAmount").textContent        = item.amount || "-";
    $("sf3SummaryDifficulty").textContent    = calcDifficultyText(item);
    $("sf3SummaryDeadlineLevel").textContent = calcDeadlineLevelText(item.deadline);

    const auto = buildAutoDetail(item);

    $("sf3DetailOverview").innerHTML = `<p>${auto.overview}</p>`;
    $("sf3DetailTarget").innerHTML   = `<p>${auto.target}</p>`;
    $("sf3DetailBenefit").innerHTML  = `
      <p><strong>지원 금액</strong>: ${item.amount}</p>
      <p>${auto.benefit}</p>
    `;
    $("sf3DetailMethod").innerHTML   = `<p>${auto.method}</p>`;
    $("sf3DetailCaution").innerHTML  = `<p>${auto.caution}</p>`;

    if(item.detail?.link){
      $("sf3DetailEtc").innerHTML = `
        <p>공식 링크: <a href="${item.detail.link}" target="_blank">바로가기</a></p>
      `;
    }else{
      $("sf3DetailEtc").innerHTML = `<p>세부 내용은 지자체 공고 참고</p>`;
    }

    document.querySelector("#sf3DetailSection")
      .scrollIntoView({behavior:"smooth"});

    renderRecommendations(item);
  }

  function buildAutoDetail(item){
    const region = item.region;
    const ages   = (item.ages||[]).join(", ");
    detectCategoryType(item); // 현재는 텍스트에 크게 안 씀, 필요시 확장

    return {
      overview: `${region}에 거주하는 ${ages} 대상의 지원 제도입니다.`,
      target:   `연령/소득 조건을 충족하는 주민이 신청할 수 있습니다.`,
      benefit:  `금액은 지원 유형에 따라 달라집니다.`,
      method:   `정부24 또는 지자체 홈페이지를 통해 신청할 수 있습니다.`,
      caution:  `신청 기간 및 서류 요건은 공고문을 반드시 확인하세요.`
    };
  }

  /* =========================================================
     RECOMMENDATIONS
  ========================================================= */
  function renderRecommendations(current){
    const box = $("sf3DetailRecommends");
    let list  = ALL_SUPPORTS.filter(it=> it.code !== current.code);

    function score(item){
      return parseAmountNumber(item.amount);
    }

    list = list.sort((a,b)=> score(b)-score(a)).slice(0,3);

    box.innerHTML = list.map(it=>`
      <div class="sf3-detail-reco-item" data-id="${it.id}">
        <div class="sf3-detail-reco-title">${it.title}</div>
        <div class="sf3-detail-reco-meta">${it.region} · ${it.amount}</div>
      </div>
    `).join("");

    $$(".sf3-detail-reco-item").forEach(el=>{
      el.onclick = ()=>{
        const id = Number(el.dataset.id);
        const t  = ALL_SUPPORTS.find(x=>x.id===id);
        if(t) openDetail(t);
      };
    });
  }

  /* =========================================================
     CTA BINDING
  ========================================================= */
  function bindModalCtas(){
    $("sf3ModalCtaMain").onclick =
      ()=> window.location.href = SEARCH_URL;

    $("sf3DetailCtaMain").onclick =
      ()=> window.location.href = SEARCH_URL;

    $("sf3ModalCtaSub").onclick = ()=>{
      if(!CURRENT) return;
      window.location.href =
        CATEGORY_LINK_MAP[detectCategoryType(CURRENT)];
    };

    $("sf3DetailCtaSub").onclick = ()=>{
      if(!CURRENT) return;
      window.location.href =
        CATEGORY_LINK_MAP[detectCategoryType(CURRENT)];
    };

    $("sf3ModalDetailBtn").onclick = ()=>{
      closeModal();
      if(CURRENT) openDetail(CURRENT);
    };

    $("sf3ModalCloseBtn").onclick = closeModal;
  }

  /* =========================================================
     BIND EVENTS
  ========================================================= */
  function bindEvents(){
    $("searchBtn").onclick   = search;
    $("loadMore").onclick    = renderMore;

    $$(".sf3-sort-btn").forEach(btn=>{
      btn.onclick = ()=>{
        $$(".sf3-sort-btn").forEach(x=>x.classList.remove("active"));
        btn.classList.add("active");
        currentSort = btn.dataset.sort;

        applySort();
        visible = 0;
        $("cardGrid").innerHTML = "";
        renderMore();
      };
    });

    $("scrollToFilter").onclick = ()=>{
      document.querySelector(".sf3-main")
        .scrollIntoView({behavior:"smooth"});
    };

    $("sf3DetailBackBtn").onclick = ()=>{
      $("sf3DetailSection").style.display = "none";
      $("cardGrid").scrollIntoView({behavior:"smooth"});
    };
  }

  /* =========================================================
     INIT
  ========================================================= */
  async function initSF3(){
    try{
      await renderChipsFromConfig();
      await loadSupportData();
      bindEvents();
      bindModalCtas();
      console.log("🔥 support-finder.js 초기화 완료");
    }catch(e){
      console.error("검색기 초기화 오류:", e);
    }
  }

  document.addEventListener("DOMContentLoaded", ()=>{
    buildSF3UI();
    initSF3();
  });

})(); // IIFE 끝
