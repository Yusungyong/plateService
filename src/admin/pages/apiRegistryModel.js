export const MODULE_DETAILS = {
  account: {label: "계정·인증", description: "로그인, 회원 정보와 계정 수명 주기", symbol: "01"},
  social: {label: "친구·관계", description: "친구 요청, 관계와 공개 범위", symbol: "02"},
  content: {label: "콘텐츠", description: "사진·영상 등록과 콘텐츠 조회", symbol: "03"},
  engagement: {label: "좋아요·댓글", description: "콘텐츠에 대한 반응과 참여", symbol: "04"},
  places: {label: "장소·방문", description: "장소 정보와 함께한 방문", symbol: "05"},
  discovery: {label: "검색·추천", description: "홈, 지도와 콘텐츠 발견", symbol: "06"},
  recipes: {label: "레시피", description: "레시피 작성과 탐색", symbol: "07"},
  seasonal: {label: "제철 큐레이션", description: "제철 음식과 추천 콘텐츠", symbol: "08"},
  merchant: {label: "사업자·매장", description: "사업자 신청, 매장과 운영", symbol: "09"},
  support: {label: "고객지원", description: "FAQ, 문의와 사용자 안내", symbol: "10"},
  compliance: {label: "정책·동의", description: "약관, 신고와 개인정보 정책", symbol: "11"},
  analytics: {label: "통계", description: "콘텐츠·활동 분석과 집계", symbol: "12"},
  platform: {label: "공통 기반", description: "API 관리와 서버 공통 기능", symbol: "P"},
};

export const SURFACE_LABELS = {
  app: "앱", admin: "운영", business: "사업자", public_web: "공개 웹",
  web_common: "웹 공통", infrastructure: "배포·진단",
};
export const UNLINKED_MENU = "__unlinked__";

export function moduleDetails(id) {
  return MODULE_DETAILS[id] || {label: id || "미분류", description: "분류 근거를 확인해 주세요.", symbol: "?"};
}

export function uniqueApiRows(rows) {
  return [...new Map(rows.map(row => [`${row.method} ${row.path}`, row])).values()];
}

function inferredSurface(id) {
  const prefix = String(id || "").split(":")[0];
  return SURFACE_LABELS[prefix] ? prefix : "";
}

/** Relations are rebuilt from effective consumers; baseline menu counts can be stale. */
export function buildMenuRelations(rows, menuRecords = []) {
  const menus = new Map();
  for (const menu of menuRecords) {
    if (!menu?.id) continue;
    menus.set(menu.id, {...menus.get(menu.id), ...menu, apiIds: [], rows: []});
  }
  for (const row of uniqueApiRows(rows)) {
    for (const id of new Set(row.menuIds || [])) {
      if (!menus.has(id)) menus.set(id, {id, label: id, surface: inferredSurface(id), rows: [], apiIds: []});
      const menu = menus.get(id);
      menu.rows.push(row);
      menu.apiIds.push(row.id || `${row.method} ${row.path}`);
    }
  }
  return [...menus.values()].map(menu => ({...menu, surface: menu.surface || inferredSurface(menu.id),
    apiCount: menu.rows.length, moduleIds: [...new Set(menu.rows.map(row => row.module || "unclassified"))],
    activeApiCount: menu.rows.filter(row => row.active).length,
  })).sort((a, b) => b.apiCount - a.apiCount || a.label.localeCompare(b.label, "ko"));
}

export function summarizeModules(rows) {
  const groups = new Map();
  for (const row of uniqueApiRows(rows)) {
    const id = row.module || "unclassified";
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(row);
  }
  return [...groups.entries()].map(([id, routes]) => ({id, ...moduleDetails(id), rows: routes,
    apiCount: routes.length, activeApiCount: routes.filter(row => row.active).length,
    observedApiCount: routes.filter(row => row.observed).length,
    menuCount: new Set(routes.flatMap(row => row.menuIds || [])).size,
  })).sort((a, b) => Object.keys(MODULE_DETAILS).indexOf(a.id) - Object.keys(MODULE_DETAILS).indexOf(b.id));
}

export function filterRegistryRows(rows, {query = "", module = "", method = "", surface = "", menuId = "", group = ""} = {}) {
  const needle = query.trim().toLowerCase();
  return rows.filter(row => (!module || row.module === module) && (!method || row.method === method)
    && (!surface || (row.surfaces || []).includes(surface))
    && (!group || row.commonizationGroup === group)
    && (!menuId || (menuId === UNLINKED_MENU ? !(row.menuIds || []).length : (row.menuIds || []).includes(menuId)))
    && `${row.method} ${row.path} ${row.module} ${moduleDetails(row.module).label} ${row.capability || ""} ${(row.menuLabels || []).join(" ")}`.toLowerCase().includes(needle));
}

export function relationshipGraph(rows, limit = 8) {
  const routes = uniqueApiRows(rows);
  const modules = summarizeModules(routes);
  // Round-robin sampling keeps each module represented in the first diagram page.
  const displayed = [];
  let position = 0;
  while (displayed.length < Math.min(limit, routes.length)) {
    let added = false;
    for (const module of modules) {
      if (module.rows[position] && displayed.length < limit) {displayed.push(module.rows[position]); added = true;}
    }
    if (!added) break;
    position += 1;
  }
  return {modules, routes: displayed, totalApiCount: routes.length, omittedApiCount: routes.length - displayed.length};
}

export function sourceEvidence(row, menuRecords = []) {
  const menuIds = new Set(row.menuIds || []);
  const records = new Map();
  for (const menu of menuRecords) records.set(menu.id, {...records.get(menu.id), ...menu});
  return [...records.values()].filter(menu => menuIds.has(menu.id) && menu.source).map(menu => ({
    menuId: menu.id, label: menu.label, source: menu.source, sourceLine: menu.sourceLine,
  }));
}
