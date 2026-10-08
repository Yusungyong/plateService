import consumerEvidence from "../api/apiRegistryConsumers.json";
import React, {useCallback, useEffect, useId, useMemo, useRef, useState} from "react";
import AdminPageHeader from "../components/AdminPageHeader";
import ApiRelationshipMap from "../components/ApiRelationshipMap";
import ApiModuleStructure from "../components/ApiModuleStructure";
import {getApiRegistry, registryRows} from "../api/apiRegistryApi";
import {buildMenuRelations, filterRegistryRows, moduleDetails, sourceEvidence, summarizeModules, SURFACE_LABELS, UNLINKED_MENU, uniqueApiRows} from "./apiRegistryModel";
import "./ApiRegistry.css";

const usageLabels = {connected_in_source: "화면 연결 근거 있음", client_wrapper_only: "호출 함수만 확인", no_frontend_reference: "화면 연결 근거 없음"};
const progressLabels = {complete: "완료", completed: "완료", deployed: "운영 반영", pending: "후속", planned: "후속", deferred: "후속", partial: "진행 중", in_progress: "진행 중"};

function SourceLinks({row, menus}) {
  const sources = sourceEvidence(row, menus);
  const urls = [...new Set((row.variants || []).map(variant => variant.sourceUrl).filter(url => /^https:\/\/github\.com\//.test(url || "")))];
  return <div className="api-detail-sources"><h3>연결 근거</h3><p>{usageLabels[row.usageStatus] || "서버 매핑 기준"}</p>
    {row.usageNote && <p>{row.usageNote}</p>}
    {sources.length ? <ul>{sources.map(source => <li key={source.menuId}><strong>{source.label}</strong><code>{source.source}{source.sourceLine ? `:${source.sourceLine}` : ""}</code></li>)}</ul> : <p className="api-registry-note">현재 목록에 연결된 메뉴 소스가 없습니다.</p>}
    {urls.map(url => <a href={url} key={url} target="_blank" rel="noreferrer">서버 소스 보기 ↗</a>)}
  </div>;
}

export default function AdminApiRegistry() {
  const filtersId = useId();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("");
  const [method, setMethod] = useState("");
  const [surface, setSurface] = useState("");
  const [menuId, setMenuId] = useState("");
  const [group, setGroup] = useState("");
  const [view, setView] = useState("menus");
  const [selectedId, setSelectedId] = useState("");
  const [showMetrics, setShowMetrics] = useState(false);
  const requestVersion = useRef(0);
  const initialMenuChosen = useRef(false);
  const detailRef = useRef(null);
  const load = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError("");
    try {const result = await getApiRegistry(); if (version === requestVersion.current) setSnapshot(result);}
    catch (failure) {if (version === requestVersion.current) {setSnapshot(null); setSelectedId(""); setError(failure.message || "API 목록을 불러오지 못했습니다.");}}
    finally {if (version === requestVersion.current) setLoading(false);}
  }, []);
  useEffect(() => {load(); return () => {requestVersion.current += 1;};}, [load]);
  const rows = useMemo(() => snapshot ? uniqueApiRows(registryRows(snapshot)) : [], [snapshot]);
  const menus = useMemo(() => [...(snapshot?.declaredBaseline?.menus || []), ...consumerEvidence.menus], [snapshot]);
  const menuRelations = useMemo(() => buildMenuRelations(rows, menus), [rows, menus]);
  const modules = useMemo(() => summarizeModules(rows), [rows]);
  const availableRows = useMemo(() => filterRegistryRows(rows, {query, module, method, surface, group}), [rows, query, module, method, surface, group]);
  const filtered = useMemo(() => filterRegistryRows(availableRows, {menuId}), [availableRows, menuId]);
  const availableMenus = useMemo(() => buildMenuRelations(availableRows, menus).filter(menu => menu.apiCount > 0), [availableRows, menus]);
  const selectedMenu = menuId === UNLINKED_MENU ? {id: UNLINKED_MENU, label: "메뉴 연결 근거 없음", isGrouping: true} : menuRelations.find(menu => menu.id === menuId);
  const selected = rows.find(row => row.id === selectedId);
  const linkedMenus = menuRelations.filter(menu => menu.apiCount > 0);
  const unlinked = availableRows.filter(row => !(row.menuIds || []).length).length;
  const observed = rows.filter(row => row.observed).length;
  const activeCount = rows.filter(row => row.active).length;
  const unclassifiedCount = (snapshot?.runtimeMetrics || []).filter(metric => metric.path === "UNMATCHED_OR_OTHER").reduce((total, metric) => total + metric.requestCount, 0);
  const likeRows = rows.filter(row => row.commonizationGroup === "likes");
  const commonLikeRows = likeRows.filter(row => row.path.startsWith("/api/v3/contents/"));
  const commonLikeMenuCount = new Set(commonLikeRows.flatMap(row => row.menuIds || [])).size;
  const architecture = snapshot?.architecture;
  const hasFilters = query || module || method || surface || menuId || group;

  useEffect(() => {
    if (!snapshot) return;
    if (!initialMenuChosen.current) {
      initialMenuChosen.current = true;
      const firstMenu = menuRelations.find(menu => menu.id === "app:Home" && menu.apiCount > 0) || menuRelations.find(menu => menu.apiCount > 0);
      if (firstMenu) setMenuId(firstMenu.id);
    } else if (menuId && menuId !== UNLINKED_MENU && !menuRelations.some(menu => menu.id === menuId)) setMenuId("");
  }, [snapshot, menuRelations, menuId]);

  function resetFilters() {setQuery(""); setModule(""); setMethod(""); setSurface(""); setMenuId(""); setGroup("");}
  function selectApi(row) {setSelectedId(row.id); window.setTimeout(() => detailRef.current?.scrollIntoView?.({behavior: "smooth", block: "start"}), 0);}
  function selectMenu(id) {setMenuId(id); setSelectedId("");}
  function showLikes() {
    resetFilters(); setSelectedId(""); setGroup("likes"); setView("menus");
    window.setTimeout(() => document.getElementById("api-list-section")?.scrollIntoView?.({behavior: "smooth", block: "start"}), 0);
  }
  function download() {
    const blob = new Blob([JSON.stringify({...snapshot, clientAnalysis: consumerEvidence, effectiveRows: rows,
      effectiveMenuRelations: menuRelations.map(({rows: routes, ...menu}) => menu), moduleSummary: modules.map(({rows: routes, ...summary}) => summary)}, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "plate-api-registry.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="admin-page api-registry">
    <AdminPageHeader title="API 구조 관리" description="메뉴를 선택하고, 그림에서 연결된 업무와 API를 확인하세요."
      actions={<><span className="api-info-text">su12ng 전용</span><button className="admin-button" onClick={load} disabled={loading}>{loading ? "확인 중…" : "새로고침"}</button></>} />
    {error && <section className="admin-error-panel" role="alert"><p>{error}</p><button onClick={load}>다시 시도</button></section>}
    {loading && <p role="status">API 목록을 불러오는 중입니다.</p>}
    {snapshot && <>
      <dl className="api-summary" aria-label="API 집계"><div><dt>활성 API</dt><dd>{activeCount.toLocaleString()}</dd></div><div><dt>연결 메뉴</dt><dd>{linkedMenus.length.toLocaleString()}</dd></div><div><dt>업무 모듈</dt><dd>{modules.filter(item => item.id !== "platform").length}<small> + 공통 {modules.some(item => item.id === "platform") ? 1 : 0}</small></dd></div></dl>
      <section className="api-workspace" aria-label="API 관계 탐색">
        <div className="api-view-tabs" role="tablist" aria-label="API 탐색 방식" onKeyDown={event => {if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {event.preventDefault(); const next = event.key === "Home" ? "menus" : event.key === "End" ? "structure" : view === "menus" ? "structure" : "menus"; setView(next); document.getElementById(`api-view-${next}`)?.focus();}}}>
          <button type="button" role="tab" id="api-view-menus" tabIndex={view === "menus" ? 0 : -1} aria-selected={view === "menus"} aria-controls="api-menu-panel" onClick={() => setView("menus")}>메뉴와 API 관계</button>
          <button type="button" role="tab" id="api-view-structure" tabIndex={view === "structure" ? 0 : -1} aria-selected={view === "structure"} aria-controls="api-structure-panel" onClick={() => setView("structure")}>서비스 모듈 구조</button>
        </div>
        {view === "menus" ? <div id="api-menu-panel" role="tabpanel" aria-labelledby="api-view-menus">
          <div className="api-filter-bar"><div className="api-registry-filters" aria-label="API 필터">
            <div className="api-filter-control"><label htmlFor={`${filtersId}-query`}>검색</label><input id={`${filtersId}-query`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="메뉴 또는 API 검색" /></div>
            <div className="api-filter-control"><label htmlFor={`${filtersId}-surface`}>사용 영역</label><select id={`${filtersId}-surface`} value={surface} onChange={event => {setSurface(event.target.value); setMenuId("");}}><option value="">전체 영역</option>{Object.entries(SURFACE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></div>
          </div><details className="api-extra-filters"><summary>상세 필터</summary><div className="api-registry-filters">
            <div className="api-filter-control"><label htmlFor={`${filtersId}-module`}>업무 영역</label><select id={`${filtersId}-module`} value={module} onChange={event => setModule(event.target.value)}><option value="">전체 업무</option>{modules.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
            <div className="api-filter-control"><label htmlFor={`${filtersId}-method`}>HTTP</label><select id={`${filtersId}-method`} value={method} onChange={event => setMethod(event.target.value)}><option value="">전체 메서드</option>{["GET", "POST", "PUT", "PATCH", "DELETE"].map(value => <option key={value}>{value}</option>)}</select></div>
          </div></details></div>
          {hasFilters && <div className="api-active-filters"><span>{selectedMenu ? `선택 메뉴: ${selectedMenu.label}` : "전체 메뉴"}{module && ` · 업무: ${moduleDetails(module).label}`}{method && ` · ${method}`}{group && " · 좋아요 그룹"}</span><button type="button" className="api-text-button" onClick={resetFilters}>필터 초기화</button></div>}
          <div className="api-menu-workspace">
            <aside className="api-menu-browser" aria-label="메뉴별 API 선택">
              <div className="api-mobile-menu"><label htmlFor={`${filtersId}-menu`}>메뉴 선택</label><select id={`${filtersId}-menu`} value={menuId} onChange={event => selectMenu(event.target.value)}><option value="">전체 API · {availableRows.length}개</option>{menuId && menuId !== UNLINKED_MENU && selectedMenu && !availableMenus.some(menu => menu.id === menuId) && <option value={menuId}>{selectedMenu.label} · 연결 API 없음</option>}{availableMenus.map(menu => <option value={menu.id} key={menu.id}>{menu.label} · {menu.apiCount}개 API</option>)}<option value={UNLINKED_MENU}>메뉴 연결 근거 없음 · {unlinked}개</option></select></div>
              <div className="api-menu-desktop"><div className="api-menu-heading"><h3>메뉴 선택</h3><span>{availableMenus.length}개</span></div>
              <button type="button" className={!menuId ? "is-selected" : ""} aria-pressed={!menuId} onClick={() => selectMenu("")}><strong>전체 API</strong><b>{availableRows.length}</b><span aria-hidden="true">→</span></button>
              <div className="api-menu-list">{availableMenus.map(menu => <button type="button" key={menu.id} className={menuId === menu.id ? "is-selected" : ""} aria-pressed={menuId === menu.id} aria-label={`메뉴 ${menu.label} ${menu.apiCount}개 API`} onClick={() => selectMenu(menu.id)}><span><small>{SURFACE_LABELS[menu.surface] || "메뉴"}</small><strong>{menu.label}</strong></span><b>{menu.apiCount}</b><span aria-hidden="true">→</span></button>)}</div>
              <button type="button" className={`api-menu-unlinked ${menuId === UNLINKED_MENU ? "is-selected" : ""}`} aria-pressed={menuId === UNLINKED_MENU} onClick={() => selectMenu(UNLINKED_MENU)}><strong>메뉴 연결 근거 없음</strong><b>{unlinked}</b><span aria-hidden="true">→</span></button></div>
            </aside>
            <div className="api-relationship-panel"><div className="api-section-heading"><h2>{selectedMenu ? selectedMenu.label : "전체 연결 구조"}</h2><span className="api-info-text">소스 연결 기준</span></div>
              {selectedMenu ? <ApiRelationshipMap rows={filtered} menu={selectedMenu} selectedApiId={selectedId} onSelectModule={setModule} onSelectApi={selectApi} /> : <div className="api-map-overview"><div><span className="api-overview-number">{linkedMenus.length}</span><strong>메뉴</strong></div><span aria-hidden="true">→</span><div><span className="api-overview-number">{modules.length}</span><strong>업무 모듈</strong></div><span aria-hidden="true">→</span><div><span className="api-overview-number">{rows.length}</span><strong>API</strong></div><p className="api-map-overview-hint">왼쪽 메뉴를 선택하면 연결된 API가 펼쳐집니다.</p></div>}
              <p className="api-registry-note api-relationship-note">소스에서 확인한 연결이며, 실제 호출 순서를 뜻하지 않습니다.</p>
            </div>
          </div>
          {selected && <section className="api-registry-detail" aria-label="API 상세" ref={detailRef}><div className="api-section-heading"><h2><b className={`api-method api-method--${selected.method.toLowerCase()}`}>{selected.method}</b> {selected.path}</h2><button className="api-text-button" onClick={() => setSelectedId("")}>상세 닫기</button></div>
            <dl className="api-detail-properties"><div><dt>업무</dt><dd>{moduleDetails(selected.module).label}</dd></div><div><dt>기능</dt><dd>{selected.capability || "신규 계약"}</dd></div><div><dt>권한</dt><dd>{selected.authorization || "서버 권한 정책 적용"}</dd></div><div><dt>공통화 그룹</dt><dd>{selected.commonizationGroup || "없음"}</dd></div></dl>
            <div className="api-detail-linked-menus"><h3>함께 사용하는 메뉴</h3>{(selected.menuIds || []).length ? [...new Set(selected.menuIds)].map(id => {const menu = menuRelations.find(item => item.id === id); return <button type="button" className="api-text-button" key={id} onClick={() => {setMenuId(id); setQuery(""); setSurface(""); setMethod(""); setModule(""); setGroup("");}}>{menu?.label || id} ↗</button>;}) : <p>연결 근거 없음</p>}</div>
            <details className="api-disclosure"><summary>소스 근거와 요청 형식 보기</summary><SourceLinks row={selected} menus={menus} /><details className="api-detail-contract"><summary>서버 매핑과 요청·응답 형식 조건</summary><pre>{JSON.stringify(selected.variants || selected.variantContracts || [], null, 2)}</pre></details></details>
          </section>}
          <section id="api-list-section" className="api-registry-list" aria-label="API 전체 목록"><div className="api-section-heading"><div><h2>API 목록</h2><p role="status">{filtered.length}개 표시</p></div><div className="api-list-actions"><button type="button" className="api-text-button" aria-pressed={showMetrics} onClick={() => setShowMetrics(value => !value)}>{showMetrics ? "호출 지표 숨기기" : "호출 지표 보기"}</button><button className="api-text-button" onClick={download}>JSON 저장</button></div></div>
            {showMetrics && <div className="api-metrics-scope"><p>현재 서버 프로세스 누적 · 호출 관측 API {observed}개. 미관측은 미사용을 뜻하지 않습니다. 경로 미분류 요청 {unclassifiedCount > 0 ? `${unclassifiedCount.toLocaleString()}건` : "미관측"}; 일부 인증 거절과 상태 점검은 개별 API 지표에 포함되지 않습니다.</p></div>}
            <div className="api-registry-table"><table><caption className="api-visually-hidden">현재 필터에 맞는 API{showMetrics ? "와 서버 호출 지표" : "와 사용 메뉴"}</caption><thead><tr><th scope="col">업무</th><th scope="col">API · 눌러서 상세 보기</th><th scope="col">사용 메뉴</th>{showMetrics && <><th scope="col">호출 수</th><th scope="col">오류율</th><th scope="col">평균 응답</th><th scope="col">상태</th></>}</tr></thead><tbody>
              {filtered.map(row => <tr key={row.id} className={selectedId === row.id ? "is-selected" : ""}><td>{moduleDetails(row.module).label}</td><td><button className="api-registry-route" onClick={() => selectApi(row)}><b className={`api-method api-method--${row.method.toLowerCase()}`}>{row.method}</b> {row.path}</button></td><td><span className="api-table-menus">{row.menuLabels.length ? row.menuLabels.join(" · ") : "연결 근거 없음"}</span></td>
                {showMetrics && <><td>{row.observed ? row.requestCount.toLocaleString() : <span className="api-unobserved">미관측</span>}</td><td className={row.observed && row.errorRate > 0 ? "api-error-value" : ""}>{row.observed ? `${(row.errorRate * 100).toFixed(1)}%` : "—"}</td><td>{row.observed ? `${row.averageMs.toFixed(1)}ms` : "—"}</td><td><span className={`api-status ${row.active ? "api-status--active" : ""}`}>{row.active ? "활성" : "현재 비활성"}</span></td></>}
              </tr>)}
              {!filtered.length && <tr><td colSpan={showMetrics ? 7 : 3} className="api-empty-table">조건에 맞는 API가 없습니다. 필터를 변경해 보세요.</td></tr>}
            </tbody></table></div>
          </section>
        </div> : <div id="api-structure-panel" role="tabpanel" aria-labelledby="api-view-structure"><ApiModuleStructure architecture={architecture} /></div>}
      </section>
      <details className="api-additional"><summary>공통화 현황 보기</summary><div className="api-additional-content">
        <section className="api-reuse-section" aria-label="공통 API 재사용"><div className="api-section-heading"><div><h2>공통 좋아요 API</h2><p>공통 API {commonLikeRows.length}개 · 연결 메뉴 {commonLikeMenuCount}개 · 기존 API {likeRows.length - commonLikeRows.length}개</p></div><button type="button" className="api-text-button" onClick={showLikes}>좋아요 API 보기 →</button></div><code>/api/v3/contents/{"{kind}"}/{"{contentId}"}/likes</code><p className="api-registry-note">메뉴 수는 소스의 사용처 기준입니다. 기존 API는 이전 앱의 호환을 위해 함께 유지합니다.</p></section>
        <section className="api-progress-section" aria-label="공통화 진행 범위"><h2>완료와 후속 작업</h2><p className="api-registry-note">업무 분리와 전체 DTO·저장 구조 통합은 서로 다른 단계입니다.</p>
          {architecture?.progress?.length ? <div className="api-progress-list">{architecture.progress.map(item => <article key={item.id}><span className={`api-progress-status api-progress-status--${String(item.status).toLowerCase()}`}>{progressLabels[String(item.status).toLowerCase()] || item.status}</span><div><h3>{item.label}</h3><p>{item.detail}</p></div></article>)}</div> : <p className="api-registry-note">업무 분리와 공통 계약의 기반을 제공하며, 전체 DTO 분리·저장 통합·구 API 폐기는 후속 작업입니다.</p>}
        </section>
      </div></details>
    </>}
  </div>;
}
