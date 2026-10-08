import consumerEvidence from "../api/apiRegistryConsumers.json";
import React, {useCallback, useEffect, useMemo, useState} from "react";
import AdminPageHeader from "../components/AdminPageHeader";
import {getApiRegistry, registryRows} from "../api/apiRegistryApi";
import "./ApiRegistry.css";

export default function AdminApiRegistry() {
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("");
  const [method, setMethod] = useState("");
  const [surface, setSurface] = useState("");
  const [selected, setSelected] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {setSnapshot(await getApiRegistry());}
    catch (failure) {setError(failure.message || "API 목록을 불러오지 못했습니다.");}
    finally {setLoading(false);}
  }, []);
  useEffect(() => {load();}, [load]);
  const rows = useMemo(() => snapshot ? registryRows(snapshot) : [], [snapshot]);
  const filtered = useMemo(() => rows.filter(row => (!module || row.module === module)
    && (!method || row.method === method) && (!surface || (row.surfaces || []).includes(surface))
    && `${row.method} ${row.path} ${row.module} ${row.capability || ""} ${row.menuLabels.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [rows, module, method, surface, query]);
  const modules = useMemo(() => [...new Set(rows.map(row => row.module))].sort(), [rows]);
  const observed = rows.filter(row => row.observed).length;
  const unclassifiedCount = (snapshot?.runtimeMetrics || []).filter(metric => metric.path === "UNMATCHED_OR_OTHER")
    .reduce((total, metric) => total + metric.requestCount, 0);
  function download() {
    const blob = new Blob([JSON.stringify({...snapshot, clientAnalysis: consumerEvidence, effectiveRows: rows}, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = "plate-api-registry.json"; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="admin-page api-registry">
    <AdminPageHeader title="API 관리" description="업무별 API, 연결된 메뉴와 서버 호출 현황을 확인합니다."
      actions={<button className="admin-button" onClick={load} disabled={loading}>새로고침</button>} />
    {error && <section className="admin-error-panel" role="alert"><p>{error}</p><button onClick={load}>다시 시도</button></section>}
    {loading && <p role="status">API 목록을 불러오는 중입니다.</p>}
    {snapshot && <>
      <section className="api-registry-stats" aria-label="API 집계">
        <span>선언된 기존 API <strong>{snapshot.declaredBaseline.routes.length}</strong></span>
        <span>현재 활성 API <strong>{snapshot.activeRouteCount}</strong></span>
        <span>업무 영역 <strong>{modules.length}</strong></span>
        <span>호출 관측 API <strong>{observed}</strong></span>
        <span>경로 미분류 요청 <strong>{unclassifiedCount > 0 ? unclassifiedCount.toLocaleString() : "미관측"}</strong></span>
      </section>
      <p className="api-registry-note">호출 지표는 현재 서버 프로세스 시작 이후 집계입니다. 미관측은 미사용을 뜻하지 않습니다. 메뉴 연결은 소스 분석 기준이며 선정된 새 공통 API는 최신 앱 호출 연결을 함께 반영합니다. 일부 인증 거절과 상태 점검은 경로 미분류로 집계되어 개별 API 오류율에 포함되지 않습니다.</p>
      <section className="api-registry-filters" aria-label="API 필터">
        <label>검색<input value={query} onChange={event => setQuery(event.target.value)} placeholder="경로, 기능, 메뉴" /></label>
        <label>업무 영역<select value={module} onChange={event => setModule(event.target.value)}><option value="">전체</option>{modules.map(value => <option key={value}>{value}</option>)}</select></label>
        <label>HTTP<select value={method} onChange={event => setMethod(event.target.value)}><option value="">전체</option>{["GET","POST","PUT","PATCH","DELETE"].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>사용 영역<select value={surface} onChange={event => setSurface(event.target.value)}><option value="">전체</option><option value="app">앱</option><option value="admin">운영</option><option value="business">사업자</option><option value="public_web">공개 웹</option><option value="web_common">웹 공통</option><option value="infrastructure">배포·진단</option></select></label>
        <button className="admin-button" onClick={download}>JSON 저장</button>
      </section>
      <p role="status">{filtered.length}개 표시</p>
      <div className="api-registry-table"><table><thead><tr><th>업무</th><th>API</th><th>사용 메뉴</th><th>호출 수</th><th>오류율</th><th>평균 응답</th><th>상태</th></tr></thead><tbody>
        {filtered.map(row => <tr key={row.id}><td>{row.module}</td><td><button className="api-registry-route" onClick={() => setSelected(row)}><b>{row.method}</b> {row.path}</button></td>
          <td>{row.menuLabels.length ? row.menuLabels.join(" · ") : "연결 근거 없음"}</td>
          <td>{row.observed ? row.requestCount.toLocaleString() : "미관측"}</td><td>{row.observed ? `${(row.errorRate * 100).toFixed(1)}%` : "—"}</td>
          <td>{row.observed ? `${row.averageMs.toFixed(1)}ms` : "—"}</td><td>{row.active ? "활성" : "현재 비활성"}</td></tr>)}
      </tbody></table></div>
      {selected && <section className="api-registry-detail" aria-label="API 상세"><button onClick={() => setSelected(null)}>상세 닫기</button><h2>{selected.method} {selected.path}</h2>
        <p>권한: {selected.authorization || "서버 권한 정책 적용"}</p><p>기능: {selected.capability || "신규 계약"}</p>
        <p>공통화 그룹: {selected.commonizationGroup || "없음"}</p><p>사용처: {selected.menuLabels.join(" · ") || "연결 근거 없음"}</p>{selected.usageNote && <p>{selected.usageNote}</p>}
        <pre>{JSON.stringify(selected.variants || selected.variantContracts, null, 2)}</pre>
      </section>}
    </>}
  </div>;
}
