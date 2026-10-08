import consumerEvidence from "../api/apiRegistryConsumers.json";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
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
    {urls.map(url => <a href={url} key={url} target="_blank" rel="noreferrer">서버 소스 근거 보기 ↗</a>)}
  </div>;
}

export default function AdminApiRegistry() {
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
  const requestVersion = useRef(0);
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

  function resetFilters() {setQuery(""); setModule(""); setMethod(""); setSurface(""); setMenuId(""); setGroup("");}
  function selectApi(row) {setSelectedId(row.id); window.setTimeout(() => detailRef.current?.scrollIntoView?.({behavior: "smooth", block: "nearest"}), 0);}
  function selectMenu(id) {setMenuId(current => current === id ? "" : id); setSelectedId("");}
  function download() {
    const blob = new Blob([JSON.stringify({...snapshot, clientAnalysis: consumerEvidence, effectiveRows: rows,
      effectiveMenuRelations: menuRelations.map(({rows: routes, ...menu}) => menu), moduleSummary: modules.map(({rows: routes, ...summary}) => summary)}, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "plate-api-registry.json"; anchor.click(); URL.revokeObjectURL(url);
  }

  return <div className="admin-page api-registry">
    <AdminPageHeader eyebrow="서비스 구조 · 운영 현황" title="API 관리" description="메뉴에서 서버까지, 어떤 API가 어디에 연결되는지 확인합니다."
      actions={<><span className="api-private-badge"><span aria-hidden="true">◉</span> su12ng 전용</span><button className="admin-button" onClick={load} disabled={loading}>{loading ? "확인 중…" : "새로고침"}</button></>} />
    {error && <section className="admin-error-panel" role="alert"><p>{error}</p><button onClick={load}>다시 시도</button></section>}
    {loading && <p role="status">API 목록을 불러오는 중입니다.</p>}
    {snapshot && <>
      <section className="api-registry-hero" aria-label="API 구조 개요">
        <div><span className="api-eyebrow">운영에 반영된 공통 기반</span><h2>하나의 메뉴, 연결된 업무,<br />함께 쓰는 API.</h2><p>화면별 사용처를 따라가고 공통 API의 재사용 범위를 확인하세요. 구조와 호출 지표를 함께 살펴볼 수 있습니다.</p><div className="api-hero-foot"><span>기존 계약 {snapshot.declaredBaseline?.routes?.length || 0}개 유지 기준</span><span>로그인한 지정 운영자에게만 제공</span></div></div>
        <div className="api-hero-diagram" aria-hidden="true"><div>메뉴<span>앱 · 운영 · 사업자</span></div><i>↓</i><div>업무 모듈<span>역할에 따라 분리</span></div><i>↓</i><div className="api-hero-diagram-last">공통 API<span>같은 계약을 여러 화면에서</span></div></div>
      </section>
      <section className="api-registry-stats" aria-label="API 집계">
        <div><span>현재 활성 API</span><strong>{activeCount.toLocaleString()}</strong><small>HTTP 메서드 + 경로 기준</small></div>
        <div><span>연결된 메뉴</span><strong>{linkedMenus.length.toLocaleString()}</strong><small>최신 연결 근거로 재집계</small></div>
        <div><span>업무 모듈</span><strong>{modules.filter(item => item.id !== "platform").length}<em> + {modules.some(item => item.id === "platform") ? 1 : 0}</em></strong><small>업무 + 공통 기반</small></div>
        <div><span>호출 관측 API</span><strong>{observed.toLocaleString()}</strong><small>현재 서버 프로세스 누적</small></div>
      </section>
      <section className="api-module-section" aria-label="업무 모듈별 API">
        <div className="api-section-heading"><div><span className="api-eyebrow">업무 단위로 탐색</span><h2>서로 다른 책임, 공통의 기반</h2></div><p>업무 카드를 누르면 관계도와 목록이 함께 좁혀집니다.</p></div>
        <div className="api-module-grid">{modules.map(item => <button type="button" className={`api-module-card ${module === item.id ? "is-selected" : ""}`} key={item.id} aria-pressed={module === item.id} aria-label={`업무 ${item.label} ${item.apiCount}개 API`} onClick={() => setModule(current => current === item.id ? "" : item.id)}>
          <span className="api-module-symbol">{item.symbol}</span><strong>{item.label}</strong><p>{item.description}</p><div><b>{item.apiCount}<small> API</small></b><span>연결 메뉴 {item.menuCount}</span></div><span className="api-module-footer">{item.id}<i aria-hidden="true">↗</i></span>
        </button>)}</div>
      </section>
      <section className="api-workspace" aria-label="API 관계 탐색">
        <div className="api-view-tabs" role="tablist" aria-label="API 탐색 방식" onKeyDown={event => {if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {event.preventDefault(); const next = event.key === "Home" ? "menus" : event.key === "End" ? "structure" : view === "menus" ? "structure" : "menus"; setView(next); document.getElementById(`api-view-${next}`)?.focus();}}}><button type="button" role="tab" id="api-view-menus" tabIndex={view === "menus" ? 0 : -1} aria-selected={view === "menus"} aria-controls="api-menu-panel" onClick={() => setView("menus")}>메뉴와 API 관계</button><button type="button" role="tab" id="api-view-structure" tabIndex={view === "structure" ? 0 : -1} aria-selected={view === "structure"} aria-controls="api-structure-panel" onClick={() => setView("structure")}>서비스 모듈 구조</button></div>
        <section className="api-registry-filters" aria-label="API 필터">
          <label>검색<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="경로, 기능, 메뉴 검색" /></label>
          <label>업무 영역<select value={module} onChange={event => setModule(event.target.value)}><option value="">전체 업무</option>{modules.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label>HTTP<select value={method} onChange={event => setMethod(event.target.value)}><option value="">전체 메서드</option>{["GET","POST","PUT","PATCH","DELETE"].map(value => <option key={value}>{value}</option>)}</select></label>
          <label>사용 영역<select value={surface} onChange={event => {setSurface(event.target.value); setMenuId("");}}><option value="">전체 영역</option>{Object.entries(SURFACE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label>
        </section>
        {hasFilters && <div className="api-active-filters">{selectedMenu && <span>메뉴: {selectedMenu.label}<button type="button" aria-label="메뉴 선택 해제" onClick={() => setMenuId("")}>×</button></span>}{group && <span>공통화 그룹: {group}<button type="button" aria-label="공통화 그룹 해제" onClick={() => setGroup("")}>×</button></span>}<button type="button" onClick={resetFilters}>필터 초기화</button></div>}
        {view === "menus" ? <div id="api-menu-panel" role="tabpanel" aria-labelledby="api-view-menus" className="api-menu-workspace">
          <aside className="api-menu-browser" aria-label="메뉴별 API 선택"><div><h3>사용 메뉴</h3><span>{availableMenus.length}개 연결 메뉴</span></div><button type="button" className={!menuId ? "is-selected" : ""} aria-pressed={!menuId} onClick={() => {setMenuId(""); setSelectedId("");}}><strong>전체 API</strong><b>{availableRows.length}</b></button>
            <div className="api-menu-list">{availableMenus.map(menu => <button type="button" key={menu.id} className={menuId === menu.id ? "is-selected" : ""} aria-pressed={menuId === menu.id} aria-label={`메뉴 ${menu.label} ${menu.apiCount}개 API`} onClick={() => selectMenu(menu.id)}><span><small>{SURFACE_LABELS[menu.surface] || "메뉴"}</small><strong>{menu.label}</strong></span><b>{menu.apiCount}</b></button>)}</div>
            <button type="button" className={`api-menu-unlinked ${menuId === UNLINKED_MENU ? "is-selected" : ""}`} aria-pressed={menuId === UNLINKED_MENU} onClick={() => selectMenu(UNLINKED_MENU)}><strong>메뉴 연결 근거 없음</strong><b>{unlinked}</b></button>
          </aside>
          <div className="api-relationship-panel"><div className="api-section-heading"><div><span className="api-eyebrow">메뉴 → 업무 → 계약</span><h2>{selectedMenu ? selectedMenu.label : "연결 관계를 따라가 보세요"}</h2></div><span className="api-tag">소스 연결 기준</span></div>
            {selectedMenu ? <ApiRelationshipMap rows={filtered} menu={selectedMenu} selectedApiId={selectedId} onSelectModule={setModule} onSelectApi={selectApi} /> : <div className="api-map-overview"><div><span className="api-overview-number">{linkedMenus.length}</span><strong>사용 메뉴</strong><p>앱·웹에서 연결된 화면</p></div><span aria-hidden="true">→</span><div><span className="api-overview-number">{modules.length}</span><strong>업무 모듈</strong><p>기능에 따라 나눈 책임</p></div><span aria-hidden="true">→</span><div><span className="api-overview-number">{rows.length}</span><strong>API 계약</strong><p>메서드와 경로의 조합</p></div><p className="api-map-overview-hint">왼쪽에서 메뉴를 선택하면 연결된 업무와 API가 펼쳐집니다.</p></div>}
            <p className="api-registry-note api-relationship-note">메뉴 연결은 소스 분석에서 확인된 사용처입니다. 연결선은 동시 호출 순서나 실제 사용자 이동 경로를 뜻하지 않습니다.</p>
          </div>
        </div> : <div id="api-structure-panel" role="tabpanel" aria-labelledby="api-view-structure"><ApiModuleStructure architecture={architecture} /></div>}
      </section>
      <section className="api-reuse-section" aria-label="공통 API 재사용">
        <div><span className="api-eyebrow">공통화 사례 · 좋아요</span><h2>다른 화면에서도 같은 계약으로</h2><p>콘텐츠 종류와 ID를 받는 공통 좋아요 API로 상태를 명시합니다. 기존 API는 이전 설치 앱과의 호환을 위해 함께 관리합니다.</p><button type="button" className="admin-button" onClick={() => {resetFilters(); setGroup("likes"); setView("menus");}}>좋아요 그룹 보기 →</button></div>
        <div className="api-reuse-contract"><code>/api/v3/contents/{"{kind}"}/{"{contentId}"}/likes</code><div><span><b>{commonLikeRows.length}</b>개 공통 API</span><span><b>{commonLikeMenuCount}</b>개 연결 메뉴</span><span><b>{likeRows.length - commonLikeRows.length}</b>개 기존 API</span></div><small>연결 메뉴는 정적 사용처 기준입니다. 메뉴별 실제 호출 수로 환산하지 않습니다.</small></div>
      </section>
      <section className="api-registry-list" aria-label="API 전체 목록"><div className="api-section-heading"><div><span className="api-eyebrow">계약과 운영 지표</span><h2>API 목록</h2><p role="status">{filtered.length}개 표시</p></div><button className="admin-button" onClick={download}>JSON 저장</button></div>
        <div className="api-metrics-scope"><span>현재 서버 프로세스 누적</span><p>미관측은 미사용을 뜻하지 않습니다. 경로 미분류 요청 {unclassifiedCount > 0 ? `${unclassifiedCount.toLocaleString()}건` : "미관측"}. 일부 인증 거절과 상태 점검은 개별 API 오류율에 포함되지 않습니다.</p></div>
        <div className="api-registry-table"><table><caption className="api-visually-hidden">현재 필터에 맞는 API와 서버 호출 지표</caption><thead><tr><th scope="col">업무</th><th scope="col">API</th><th scope="col">사용 메뉴</th><th scope="col">호출 수</th><th scope="col">오류율</th><th scope="col">평균 응답</th><th scope="col">상태</th></tr></thead><tbody>
          {filtered.map(row => <tr key={row.id} className={selectedId === row.id ? "is-selected" : ""}><td>{moduleDetails(row.module).label}<small className="api-table-module-id">{row.module}</small></td><td><button className="api-registry-route" onClick={() => selectApi(row)}><b className={`api-method api-method--${row.method.toLowerCase()}`}>{row.method}</b> {row.path}</button></td>
            <td><span className="api-table-menus">{row.menuLabels.length ? row.menuLabels.join(" · ") : "연결 근거 없음"}</span></td><td>{row.observed ? row.requestCount.toLocaleString() : <span className="api-unobserved">미관측</span>}</td><td className={row.observed && row.errorRate > 0 ? "api-error-value" : ""}>{row.observed ? `${(row.errorRate * 100).toFixed(1)}%` : "—"}</td>
            <td>{row.observed ? `${row.averageMs.toFixed(1)}ms` : "—"}</td><td><span className={`api-status ${row.active ? "api-status--active" : ""}`}>{row.active ? "활성" : "현재 비활성"}</span></td></tr>)}
          {!filtered.length && <tr><td colSpan="7" className="api-empty-table">조건에 맞는 API가 없습니다. 필터를 변경해 보세요.</td></tr>}
        </tbody></table></div>
      </section>
      {selected && <section className="api-registry-detail" aria-label="API 상세" ref={detailRef}><div className="api-section-heading"><div><span className="api-eyebrow">계약 상세</span><h2><b className={`api-method api-method--${selected.method.toLowerCase()}`}>{selected.method}</b> {selected.path}</h2></div><button className="admin-button" onClick={() => setSelectedId("")}>상세 닫기</button></div>
        <dl className="api-detail-properties"><div><dt>업무</dt><dd>{moduleDetails(selected.module).label}</dd></div><div><dt>권한</dt><dd>{selected.authorization || "서버 권한 정책 적용"}</dd></div><div><dt>기능</dt><dd>{selected.capability || "신규 계약"}</dd></div><div><dt>공통화 그룹</dt><dd>{selected.commonizationGroup || "없음"}</dd></div></dl>
        <div className="api-detail-linked-menus"><h3>함께 연결된 메뉴</h3>{(selected.menuIds || []).length ? [...new Set(selected.menuIds)].map(id => {const menu = menuRelations.find(item => item.id === id); return <button type="button" className="api-tag" key={id} onClick={() => {setMenuId(id); setQuery(""); setSurface(""); setMethod(""); setModule(""); setGroup(""); setView("menus");}}>{menu?.label || id} ↗</button>;}) : <p>연결 근거 없음</p>}</div>
        <SourceLinks row={selected} menus={menus} /><details className="api-detail-contract"><summary>서버 매핑과 요청·응답 형식 조건</summary><pre>{JSON.stringify(selected.variants || selected.variantContracts || [], null, 2)}</pre></details>
      </section>}
      <section className="api-progress-section" aria-label="공통화 진행 범위"><div className="api-section-heading"><div><span className="api-eyebrow">현재 구조와 다음 단계</span><h2>기반은 반영하고, 전환은 단계적으로</h2><p>API가 같은 그룹에 속해 있어도 모든 DTO와 저장 구조의 통합을 의미하지 않습니다.</p></div></div>
        {architecture?.progress?.length ? <div className="api-progress-list">{architecture.progress.map(item => <article key={item.id}><span className={`api-progress-status api-progress-status--${String(item.status).toLowerCase()}`}>{progressLabels[String(item.status).toLowerCase()] || item.status}</span><h3>{item.label}</h3><p>{item.detail}</p></article>)}</div> : <div className="api-progress-list"><article><span className="api-progress-status">운영 반영 범위</span><h3>업무 분리와 공통 계약의 기반</h3><p>업무별 API 분류와 선택된 공통 좋아요 계약을 관리합니다. 서비스 구조 탭은 서버가 제공한 분석 자료를 표시합니다.</p></article><article><span className="api-progress-status api-progress-status--pending">후속 작업</span><h3>DTO·저장 구조와 기존 API 전환</h3><p>전체 DTO 분리와 저장 구조 통합, 기존 API 폐기는 별도 검증이 필요합니다. 미관측이라는 이유로 기존 API를 삭제하지 않습니다.</p></article></div>}
      </section>
    </>}
  </div>;
}
