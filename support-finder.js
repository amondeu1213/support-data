/************************************************************
 *  SUPPORT FINDER v3 — Blogger 안정화 최종본 (Option A)
 *  - 테스트 블로그 UI 100% 동일 (HTML/CSS 기준)
 *  - 새 도메인 govfundplus.ddaengddaenge.com 반영
 *  - 모달/상세 CTA 버튼2: 카테고리별 다른 상세글로 이동
 *  - Cloudflare JSON (support-data.json) 연동
 ************************************************************/

/* =========================================================
   CONFIG
========================================================= */
const DATA_URL   = "https://support-data.pages.dev/support-data.json";
const SEARCH_URL = "https://govfundplus.ddaengddaenge.com/p/ai.html";

/** 카테고리별로 보내줄 상세 페이지 URL 매핑 */
const CATEGORY_LINK_MAP = {
  housing:  "https://govfundplus.ddaengddaenge.com/2025/12/2025-youth-jeonse-loan-guide.html",                    // 주거 계열
  job:      "https://govfundplus.ddaengddaenge.com/2025/12/2025-middleaged-reemployment-training-support-guide.html", // 취업·교육·재취업
  living:   "https://govfundplus.ddaengddaenge.com/2025/12/2025-low-income-stability-fund.html",                    // 생활·바우처·저소득
  medical:  "https://govfundplus.ddaengddaenge.com/2025/12/2025-dental-health-insurance-coverage-guide.html",      // 의료·건강
  family:   "https://govfundplus.ddaengddaenge.com/2025/12/2025-pregnancy-birth-benefit-guide.html",               // 임신·출산·가족
  senior:   "https://govfundplus.ddaengddaenge.com/2025/12/2025-emergency-welfare-guide.html",                     // 노인·위기
  business: "https://govfundplus.ddaengddaenge.com/2025/12/2025-disabled-support-guide.html",                     // 소상공인/장애·복지 계열 중 대표
  generic:  "https://govfundplus.ddaengddaenge.com/p/blog-page_9.html"                                             // 소개 허브 페이지
};

/* 카테고리별 버튼2 문구 */
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

const PAGE_SIZE = 8;

const $  = id  => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* =========================================================
   CATEGORY 자동 판별 (카테고리/제목 기반)
========================================================= */
function detectCategoryType(item){
  const c = (item.category || "").toLowerCase();
  const t = (item.title || "").toLowerCase();

  // 주거/전월세/보증금
  if(
    c.includes("주거") || c.includes("주거·") ||
    t.includes("월세") || t.includes("전세") || t.includes("보증금") ||
    c.includes("공공임대")
  ) return "housing";

  // 일자리/취업/교육·훈련/재취업/소득세 감면 등
  if(
    c.includes("일자리") || c.includes("취업") || c.includes("노후·일자리") ||
    c.includes("교육·훈련") || c.includes("교육") ||
    c.includes("세제") || t.includes("소득세") || t.includes("국민내일배움카드") ||
    t.includes("재취업")
  ) return "job";

  // 생활/공공요금/에너지/교통/문화·여가/체육·여가/관광·여행 등
  if(
    c.includes("생활") || c.includes("복지·생계") || c.includes("공공요금") ||
    c.includes("환경·교통") || c.includes("체육·여가") || c.includes("문화·여가") ||
    c.includes("문화·관광") || c.includes("소상공인·전통시장") ||
    t.includes("에너지 바우처") || t.includes("문화누리카드") ||
    t.includes("스포츠강좌") || t.includes("온누리상품권")
  ) return "living";

  // 의료/건강/정신건강/치과/의료급여/건강·복지
  if(
    c.includes("건강") || c.includes("의료") || c.includes("건강·복지") ||
    c.includes("건강·정신") ||
    t.includes("건강보험") || t.includes("의료비") || t.includes("치과")
  ) return "medical";

  // 가족/출산/가족·복지/가족·건강/가족·출산
  if(
    c.includes("가족") || c.includes("출산") ||
    t.includes("임신") || t.includes("출산") || t.includes("한부모")
  ) return "family";

  // 노인/노후/노인·일자리/노후·금융/노인 돌봄/고령
  if(
    c.includes("노인") || c.includes("노후") || c.includes("주거·복지") ||
    t.includes("기초연금") || t.includes("노인") || t.includes("고령자")
  ) return "senior";

  // 소상공인/창업/농업·창업/농업·농촌/농업·기술/소상공인·전통시장/창업·중장년
  if(
    c.includes("소상공인") || c.includes("창업") ||
    c.includes("농업·창업") || c.includes("농업·농촌") || c.includes("농업·기술") ||
    c.includes("창업·중장년") ||
    t.includes("소상공인") || t.includes("창업")
  ) return "business";

  return "generic";
}

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
    return isNaN(n)? null : n;
  }
  if(["상시","수시","연중"].includes(str)) return null;
  return null;
}

/* =========================================================
   SUMMARY 계산 (받을 확률/난이도/마감상태)
========================================================= */
function calcChanceText(item){
  let score = 0;
  const ageMatch =
    !selectedAges.length || (item.ages || []).some(a=>selectedAges.includes(a));
  const regionMatch =
    !selectedRegions.length || selectedRegions.includes(item.region);

  if(ageMatch) score += 40;
  if(regionMatch) score += 40;
  if(item.category) score += 20;

  if(score >= 80) return "높음";
  if(score >= 50) return "보통";
  return "낮음";
}

function calcDifficultyText(item){
  const txt = (item.detail?.method || item.method || "").toLowerCase();
  if(!txt) return "보통";

  const hasOnline = /온라인|정부24|복지로|홈페이지|인터넷/.test(txt);
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
  if(days <= 7)  return "매우 급함";
  if(days <= 30) return "임박";
  if(days <= 90) return "보통";
  return "여유 있음";
}

/* =========================================================
   AUTO DETAIL GENERATOR (카테고리별 자동 설명)
========================================================= */
function buildAutoDetail(item){
  const region = item.region || "거주 지역";
  const ages   = (item.ages || []).join(", ") || "해당 연령대";
  const amount = item.amount || "예산 범위 내에서 차등 지원";
  const type   = detectCategoryType(item);

  let overview = "";
  let target   = "";
  let benefit  = "";
  let method   = "";
  let caution  = "";

  switch(type){
    case "housing":
      overview =
        `${region}에 거주하는 ${ages} 주민의 주거비 부담을 줄이기 위해 마련된 제도입니다. ` +
        `월세·보증금·관리비 등 주거 관련 지출을 지원하여 보다 안정적인 생활을 돕는 것이 목적입니다.`;
      target =
        `일반적으로 무주택 가구이면서 소득과 자산 기준을 충족하는 가구가 주요 대상입니다. ` +
        `${ages} 청년, 신혼부부, 저소득층, 주거 취약계층 등이 우선적으로 포함되는 경우가 많습니다.`;
      benefit =
        `월세 일부를 현금 또는 바우처 형태로 지원하거나, 전세·보증금 대출에 대해 저금리 이자를 적용하는 방식으로 운영됩니다. ` +
        `지자체별로 지원 한도와 기간은 다르지만, 기본적으로 주거비로만 사용할 수 있도록 제한되는 경우가 많습니다.`;
      method =
        `정부24, 복지로 또는 ${region} 지자체 홈페이지를 통해 온라인 신청이 가능하며, ` +
        `주민센터·동 행정복지센터 방문 접수도 함께 운영되는 경우가 많습니다. ` +
        `신청 시에는 임대차계약서, 소득·재산 증빙서류, 신분증 등을 준비하는 것이 안전합니다.`;
      caution =
        `지역별 예산과 신청 기간에 따라 조기 마감될 수 있으므로, 공고문에 안내된 접수기간을 반드시 확인해야 합니다. ` +
        `다른 주거지원 제도와 중복 수급이 제한되는 경우가 있으니, 현재 받고 있는 혜택이 있다면 함께 검토하는 것이 좋습니다.`;
      break;

    case "job":
      overview =
        `${region}에 거주하는 ${ages} 구직자·재직자의 경력 개발과 취업 역량 강화를 위해 운영되는 지원 제도입니다. ` +
        `직업훈련, 교육비, 구직활동비 등을 지원하여 실제 취업 가능성을 높이는 데 초점을 맞추고 있습니다.`;
      target =
        `취업을 준비 중인 청년, 경력 전환을 고민하는 재직자, 경력단절 후 재취업을 희망하는 분, ` +
        `중장년·장기 구직자 등이 주요 대상입니다. 고용보험 가입 여부나 최근 이직·퇴사 이력에 따라 세부 조건이 달라질 수 있습니다.`;
      benefit =
        `국비로 교육비를 지원하거나, 구직활동에 필요한 비용(교통비·식비·면접 준비 비용 등)을 현금 또는 포인트 형태로 지급하는 방식이 일반적입니다. ` +
        `일부 제도는 훈련 참여 시 수당을 추가로 지급하기도 합니다.`;
      method =
        `HRD-Net, 워크넷, 고용센터 홈페이지 등 온라인 채널에서 교육과정을 선택한 뒤 신청할 수 있습니다. ` +
        `일부 지원금은 고용센터 방문 상담을 거쳐야 하므로, 가까운 고용센터에 문의 후 진행하는 것이 좋습니다.`;
      caution =
        `지원금 부정 수급을 막기 위해 출석·훈련 참여 여부를 엄격하게 관리하는 편이며, ` +
        `무단 결석이 일정 기준을 넘으면 수당이 중단되거나 환수될 수 있습니다. ` +
        `교육 이수 후에도 사후 관리(취업 여부 확인 등)가 있을 수 있습니다.`;
      break;

    case "living":
      overview =
        `필수 생활비 지출로 인한 부담을 줄이기 위해 마련된 생활안정 지원 제도입니다. ` +
        `난방·전기·가스 등 에너지 비용이나 교통비, 기타 필수 지출을 줄여 실제 가처분 소득을 높이는 데 도움이 됩니다.`;
      target =
        `저소득 가구, 차상위계층, 취약계층, 에너지 취약계층 등이 대표적인 대상이며, ` +
        `일부 제도는 청년·근로자·다자녀 가구 등 특정 조건을 만족하는 경우에도 신청할 수 있습니다.`;
      benefit =
        `전기·가스요금을 감면하거나 바우처 형태로 에너지 비용을 지원해주며, 교통비 할인·포인트 지급 등의 방식도 활용됩니다. ` +
        `지원 금액과 기간은 가구원 수·소득 수준·지역 정책에 따라 달라질 수 있습니다.`;
      method =
        `복지로, 각 에너지 공급사(전기·가스) 또는 지자체 복지 포털에서 온라인 신청이 가능하며, ` +
        `주민센터 방문을 통해서도 접수할 수 있습니다. 서류는 주민등록등본, 소득·재산 관련 서류 등이 자주 요구됩니다.`;
      caution =
        `대상 기준(소득·재산·가구원 구성 등)을 충족하지 못하면 지원이 제한될 수 있습니다. ` +
        `또한 일부는 매년 재신청이 필요하므로, 갱신 시기를 놓치지 않도록 주의해야 합니다.`;
      break;

    case "medical":
      overview =
        `갑작스러운 질병이나 사고로 의료비 부담이 커진 가구를 돕기 위해 마련된 의료비 지원 제도입니다. ` +
        `필수 진료와 치료를 포기하지 않도록 최소한의 의료 접근성을 보장하는 데 목적이 있습니다.`;
      target =
        `저소득층, 차상위계층, 긴급 위기 상황에 놓인 가구, 중증질환자·희귀질환자 등이 주요 대상입니다. ` +
        `건강보험료 납부 수준, 소득·재산 규모, 진단명·진료내역 등을 종합적으로 심사합니다.`;
      benefit =
        `입원비·수술비·중증질환 치료비·응급의료비 등 의료비 전부 또는 일부를 지원하며, ` +
        `본인부담금 경감, 비급여 항목 일부 지원 등의 방식으로 운영되기도 합니다.`;
      method =
        `보건소, 병원 사회복지팀, 복지로, 국민건강보험공단 지사 등을 통해 신청할 수 있습니다. ` +
        `진단서, 진료비 계산서, 입원·수술 기록, 소득·재산 증빙 자료를 함께 제출하는 경우가 많습니다.`;
      caution =
        `응급·긴급 지원의 경우 심사 기간이 짧은 대신, 사후에 추가 서류 제출을 요구할 수 있습니다. ` +
        `중복 지원이 제한될 수 있으므로, 이미 다른 의료지원 제도를 이용 중이라면 담당기관과 반드시 상담해야 합니다.`;
      break;

    case "business":
      overview =
        `${region}에서 사업을 운영 중인 소상공인·자영업자의 자금난 해소와 경영 안정을 위해 마련된 정책자금·지원 제도입니다. ` +
        `일시적인 매출 감소나 운영자금 부족 상황에서 고금리 대출 대신 활용할 수 있는 안전망 역할을 합니다.`;
      target =
        `사업자등록을 보유한 소상공인·자영업자, 프리랜서·플랫폼 종사자 등으로서, 매출 규모·업력·업종 제한 등을 충족해야 합니다. ` +
        `일부 자금은 특정 업종(전통시장, 관광업, 제조업 등)에 한정되기도 합니다.`;
      benefit =
        `시중은행보다 낮은 금리와 상대적으로 긴 상환 기간을 제공하며, 보증료 일부를 지원해주는 방식도 있습니다. ` +
        `운영비·임대료·인건비·재료비 등 사업 유지에 필요한 대부분의 지출에 활용할 수 있습니다.`;
      method =
        `소상공인진흥공단, 신용보증재단, 지자체 기업지원과 등의 홈페이지에서 온라인 신청 후, ` +
        `방문 상담·심사를 거쳐 대출 실행이 이뤄집니다. 사업자등록증, 매출 증빙, 임대차계약서, 재무제표 등이 필요할 수 있습니다.`;
      caution =
        `정책자금은 목적 외 사용이 제한되며, 연체·체납 발생 시 향후 지원이 어려울 수 있습니다. ` +
        `여러 기관의 정책자금을 동시에 이용하면 총 부채가 과도해질 수 있으므로, 상환 계획을 꼭 세우고 신청하는 것이 좋습니다.`;
      break;

    case "senior":
      overview =
        `65세 이상 고령층의 기본적인 소득·건강·돌봄을 지원하기 위해 마련된 제도입니다. ` +
        `노후 생활비 부담을 줄이고, 일상생활에 불편이 없도록 의료·돌봄 서비스를 함께 제공합니다.`;
      target =
        `만 65세 이상 어르신 중 소득·재산 기준을 충족하는 분, 일상생활에 도움이 필요한 분, 독거·취약 노인 등이 대상입니다. ` +
        `가구 유형과 실제 생활 여건에 따라 서비스 내용이 달라질 수 있습니다.`;
      benefit =
        `현금성 지원(연금·수당)과 더불어 방문 돌봄, 안전 확인, 가사지원, 병원 동행 서비스 등 다양한 형태의 복지서비스가 제공됩니다.`;
      method =
        `주민센터, 가까운 복지관, 노인맞춤돌봄센터 등을 통해 상담 후 신청할 수 있으며, 일부 제도는 복지로 온라인 신청도 가능합니다. ` +
        `가구 구성, 건강 상태, 소득·재산에 대한 기본 조사·상담이 함께 이뤄집니다.`;
      caution =
        `서비스 제공 기관·담당인력에 따라 세부 제공 내용·방문 횟수가 달라질 수 있습니다. ` +
        `또한 장기요양보험 등 다른 노인복지 서비스와의 중복 여부도 함께 검토됩니다.`;
      break;

    case "family":
      overview =
        `임신·출산·양육으로 인해 발생하는 경제적 부담을 덜어주고, 가정의 안정적인 생활을 돕기 위한 지원 제도입니다. ` +
        `아이를 낳고 키우는 과정에서 꼭 필요한 비용을 보조하는 역할을 합니다.`;
      target =
        `임신 중이거나 출산 예정·출산 직후 가정, 다자녀 가구, 한부모가족 등으로서, ` +
        `소득·재산·가구 특성에 따라 세부 대상이 구분됩니다.`;
      benefit =
        `출산축하금, 바우처, 양육비, 돌봄서비스 등 다양한 형태로 지원되며, ` +
        `검진비·의료비·기저귀·분유·보육료 등 실제 지출이 많은 항목을 중심으로 설계됩니다.`;
      method =
        `행복출산 원스톱서비스, 복지로, 주민센터, 보건소 등을 통해 신청할 수 있습니다. ` +
        `출생신고와 연계되어 자동 신청되거나, 별도 신청이 필요한 제도도 있으니 안내문을 꼭 확인해야 합니다.`;
      caution =
        `신청 가능 기간이 정해져 있는 경우가 많으므로, 임신·출산 시기에 맞춰 미리 준비하는 것이 좋습니다. ` +
        `중복 지원 제한이 있는 제도도 있으니, 현재 받고 있는 다른 출산·양육 지원과 함께 검토해야 합니다.`;
      break;

    default:
      overview =
        `${region}에 거주하는 ${ages}을(를) 대상으로 금전적·비금전적 지원을 제공하는 제도입니다. ` +
        `정책 목적에 맞게 대상자를 선별해 실질적인 생활 안정을 돕는 것을 목표로 합니다.`;
      target =
        `연령, 소득, 거주지, 가구 구성, 취업·사업 여부 등 여러 기준을 종합해 지원 대상을 정합니다. ` +
        `세부 요건은 매년 공고문으로 안내되므로, 본문 하단의 공식 링크를 반드시 확인해야 합니다.`;
      benefit =
        `${amount} 수준의 금전적 지원 또는 서비스(교육·상담·돌봄 등)가 제공되며, ` +
        `정확한 지원 내용은 사업 유형과 예산에 따라 달라질 수 있습니다.`;
      method =
        `정부24, 복지로, 관련 부처·지자체 홈페이지 또는 주민센터·행정복지센터를 통해 신청할 수 있습니다. ` +
        `온라인 신청이 어려운 경우, 가까운 주민센터에 방문해 도움을 받는 것이 좋습니다.`;
      caution =
        `지원 기간·예산·대상 기준은 매년 변경될 수 있으며, 동일·유사 목적의 다른 제도와 중복 지원이 제한될 수 있습니다. ` +
        `반드시 최신 공고문과 문의처를 통해 본인의 자격 여부를 다시 확인하는 것이 안전합니다.`;
      break;
  }

  return { overview, target, benefit, method, caution };
}

/* =========================================================
   SUPPORT DATA LOAD
========================================================= */
async function loadSupportData(){
  const res  = await fetch(DATA_URL);
  const json = await res.json();

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
   CHIPS (연령/지역)
========================================================= */
async function renderChipsFromConfig(){
  const res  = await fetch(DATA_URL);
  const json = await res.json();

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
  if(selectedAges.length) txt += `연령: ${selectedAges.join(", ")}`;
  if(selectedRegions.length){
    if(txt) txt += "\n";
    txt += `지역: ${selectedRegions.join(", ")}`;
  }
  $("selectedTags").textContent = txt;
}

/* =========================================================
   SORTING
========================================================= */
function parseDeadlineForSort(deadline){
  if(!deadline) return 9999;
  const d = String(deadline).trim();
  if(d.startsWith("D-")){
    const n = parseInt(d.replace("D-",""),10);
    return isNaN(n) ? 9999 : n;
  }
  if(["상시","수시","연중"].includes(d)) return 9999;
  return 9999;
}

function applySort(){
  if(currentSort === "deadline"){
    filtered.sort((a,b)=> parseDeadlineForSort(a.deadline) - parseDeadlineForSort(b.deadline));
  } else if(currentSort === "amount"){
    filtered.sort((a,b)=> parseAmountNumber(b.amount) - parseAmountNumber(a.amount));
  }
}

/* =========================================================
   SEARCH
========================================================= */
function search(){
  filtered = ALL_SUPPORTS.filter(item=>{
    const ageOK =
      !selectedAges.length || (item.ages||[]).some(a=>selectedAges.includes(a));
    const regionOK =
      !selectedRegions.length || selectedRegions.includes(item.region);
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
        <p style="font-size:12px;margin-top:4px;">연령 또는 지역을 넓혀서 다시 검색해보세요.</p>
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
   CARD RENDER
========================================================= */
function renderMore(){
  const grid  = $("cardGrid");
  const slice = filtered.slice(visible, visible + PAGE_SIZE);

  slice.forEach(item=>{
    const card = document.createElement("div");
    card.className = "sf3-card";

    const showDeadline = item.deadline && String(item.deadline).trim().startsWith("D-");

    card.innerHTML = `
      <div class="sf3-badge-region">${item.region}</div>
      ${showDeadline ? `<div class="sf3-badge-deadline">${item.deadline}</div>` : ""}
      <div class="sf3-card-content">
        <div class="sf3-card-title">${item.title}</div>
        <div class="sf3-card-desc">${item.summary || ""}</div>
      </div>
      <div class="sf3-card-footer">
        <div class="sf3-card-amount">${item.amount || ""}</div>
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
   MODAL OPEN/CLOSE
========================================================= */
function openModal(item){
  CURRENT = item;

  const cat = detectCategoryType(item);
  const btnLabel = getButton2Label(cat);

  $("sf3ModalTitle").textContent = item.title || "";
  $("sf3ModalDesc").textContent  = item.summary || "";
  $("sf3ModalMeta").textContent  =
    `${item.region || "-"} · ${(item.ages||[]).join(", ") || "-"} · ${item.category || "-"}`;

  $("sf3ModalCtaSub").textContent = btnLabel;

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
  const auto = buildAutoDetail(item);

  $("sf3DetailSection").style.display = "block";

  $("sf3DetailTitle").textContent = item.title || "";
  $("sf3DetailMeta").innerHTML = `
    <p>📍 지역: ${item.region || "-"}</p>
    <p>👤 연령: ${(item.ages||[]).join(", ") || "-"}</p>
    <p>🏷 분야: ${item.category || "-"}</p>
    <p>📅 마감일: ${item.deadline || "확인 필요"}</p>
  `;

  $("sf3SummaryChance").textContent        = calcChanceText(item);
  $("sf3SummaryAmount").textContent        = item.amount || "지원 금액 별도 안내";
  $("sf3SummaryDifficulty").textContent    = calcDifficultyText(item);
  $("sf3SummaryDeadlineLevel").textContent = calcDeadlineLevelText(item.deadline);

  const overviewText =
    (item.overview && item.overview.length > 30) ? item.overview : auto.overview;
  $("sf3DetailOverview").innerHTML = `<p>${overviewText}</p>`;

  const targetText = item.detail?.target
    ? `${item.detail.target}<br><br>${auto.target}`
    : auto.target;
  $("sf3DetailTarget").innerHTML = `<p>${targetText}</p>`;

  const benefitText = item.detail?.benefit
    ? `${item.detail.benefit}<br><br>${auto.benefit}`
    : auto.benefit;
  $("sf3DetailBenefit").innerHTML = `
    <p><strong>지원 금액</strong> : ${item.amount || "별도 공고 참고"}</p>
    <p>${benefitText}</p>
  `;

  const methodText = item.detail?.method
    ? `${item.detail.method}<br><br>${auto.method}`
    : auto.method;
  $("sf3DetailMethod").innerHTML = `<p>${methodText}</p>`;

  const cautionText = item.detail?.caution
    ? `${item.detail.caution}<br><br>${auto.caution}`
    : auto.caution;
  $("sf3DetailCaution").innerHTML = `<p>${cautionText}</p>`;

  let etcHTML = "";
  if(item.detail?.contact) etcHTML += `<p>문의처 : ${item.detail.contact}</p>`;
  if(item.detail?.link){
    etcHTML += `
      <p>공식 링크 :
        <a href="${item.detail.link}" target="_blank" style="color:#2563EB;text-decoration:underline;">
          바로가기
        </a>
      </p>`;
  }
  $("sf3DetailEtc").innerHTML =
    etcHTML || `<p>자세한 내용은 각 부처 및 지자체 공고를 참고하세요.</p>`;

  renderRecommendations(item);

  document.querySelector("#sf3DetailSection")
    .scrollIntoView({behavior:"smooth", block:"start"});
}

/* =========================================================
   추천 지원금 TOP3
========================================================= */
function renderRecommendations(current){
  const box = $("sf3DetailRecommends");

  const unique = {};
  ALL_SUPPORTS.forEach(item=>{
    if(!unique[item.code]) unique[item.code] = item;
  });

  let list = Object.values(unique).filter(it => it.code !== current.code);

  function score(item){
    let s = 0;

    const amt = parseAmountNumber(item.amount);
    if(amt >= 100000000) s += 50;
    else if(amt >= 10000000) s += 40;
    else if(amt >= 1000000) s += 30;
    else if(amt >= 100000) s += 20;
    else s += 10;

    const c = calcChanceText(item);
    if(c === "높음") s += 30;
    else if(c === "보통") s += 15;
    else s += 5;

    const d = calcDifficultyText(item);
    if(d === "쉬움") s += 20;
    else if(d === "보통") s += 10;
    else s += 5;

    return s;
  }

  list = list
    .map(it=>({ ...it, score: score(it) }))
    .sort((a,b)=> b.score - a.score)
    .slice(0,3);

  if(!list.length){
    box.innerHTML = `
      <div class="sf3-detail-reco-item">
        추천할 다른 지원금이 없습니다.
      </div>`;
    return;
  }

  box.innerHTML = list.map((it,idx)=>{
    let tagText = "";
    let color   = "";

    const deadlineLv = calcDeadlineLevelText(it.deadline);
    const difficulty = calcDifficultyText(it);

    if(idx === 0){
      tagText = "신청 성공률 높음";
      color   = "#2563EB";
    }else if(idx === 1){
      tagText = (difficulty === "쉬움") ? "신청 난이도 쉬움" : "마감 일정 여유 있음";
      color   = (difficulty === "쉬움") ? "#16A34A" : "#D97706";
    }else{
      tagText = deadlineLv.includes("임박") ? "마감 임박" : "마감 일정 확인 필요";
      color   = deadlineLv.includes("임박") ? "#DC2626" : "#6B7280";
    }

    return `
      <div class="sf3-detail-reco-item" data-id="${it.id}">
        <div class="sf3-detail-reco-title">${it.title}</div>
        <div class="sf3-detail-reco-meta">${it.region} · ${it.amount}</div>
        <div style="font-size:11px;margin-top:2px;color:${color};">${tagText}</div>
      </div>`;
  }).join("");

  $$(".sf3-detail-reco-item").forEach(el=>{
    el.onclick = ()=>{
      const id = Number(el.dataset.id);
      const target = ALL_SUPPORTS.find(x=>x.id===id);
      if(target) openDetail(target);
    };
  });
}

/* =========================================================
   CTA BINDING (모달 + 상세)
========================================================= */
function bindModalCtas(){

  // CTA1 (초록) → 검색기 메인
  $("sf3ModalCtaMain").onclick  =
    () => window.location.href = SEARCH_URL;
  $("sf3DetailCtaMain").onclick =
    () => window.location.href = SEARCH_URL;

  // CTA2 (검정) → 카테고리별 상세글
  $("sf3ModalCtaSub").onclick = ()=>{
    if(!CURRENT) return;
    const cat = detectCategoryType(CURRENT);
    const url = CATEGORY_LINK_MAP[cat] || CATEGORY_LINK_MAP.generic;
    window.location.href = url;
  };

  $("sf3DetailCtaSub").onclick = ()=>{
    if(!CURRENT) return;
    const cat = detectCategoryType(CURRENT);
    const url = CATEGORY_LINK_MAP[cat] || CATEGORY_LINK_MAP.generic;
    window.location.href = url;
  };

  // 모달 → 상세 보기
  $("sf3ModalDetailBtn").onclick = ()=>{
    closeModal();
    if(CURRENT) openDetail(CURRENT);
  };

  // 모달 닫기
  $("sf3ModalCloseBtn").onclick = closeModal;
}

/* =========================================================
   EVENT BINDINGS
========================================================= */
function bindEvents(){
  $("searchBtn").onclick = search;
  $("loadMore").onclick  = renderMore;

  $$(".sf3-sort-btn").forEach(btn=>{
    btn.onclick = ()=>{
      $$(".sf3-sort-btn").forEach(x=>x.classList.remove("active"));
      btn.classList.add("active");
      currentSort = btn.dataset.sort || "default";

      if(filtered.length){
        applySort();
        visible = 0;
        $("cardGrid").innerHTML = "";
        renderMore();
        $("resultCount").textContent = `${filtered.length}개`;
      }
    };
  });

  $("scrollToFilter").onclick = ()=>{
    document.querySelector(".sf3-main")
      .scrollIntoView({behavior:"smooth", block:"start"});
  };

  $("sf3DetailBackBtn").onclick = ()=>{
    $("sf3DetailSection").style.display = "none";
    $("cardGrid").scrollIntoView({behavior:"smooth", block:"start"});
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

document.addEventListener("DOMContentLoaded", initSF3);
