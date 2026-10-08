import React, {useMemo} from "react";
import {relationshipGraph} from "../pages/apiRegistryModel";
import {summarizeClientErrors} from "../pages/apiClientErrors";
import ApiClientErrorBadge from "./ApiClientErrorBadge";

export default function ApiRelationshipMap({rows, menu, selectedApiId, onSelectModule, onSelectApi}) {
  const graph = useMemo(() => relationshipGraph(rows), [rows]);
  const summary = summarizeClientErrors(rows);
  const height = Math.max(220, graph.modules.length * 96 + 24, graph.routes.length * 96 + 24);
  const moduleCenters = new Map(graph.modules.map((module, index) => [module.id, 62 + index * 96]));
  if (!rows.length) return <div className="api-map-empty"><span aria-hidden="true">◎</span><h3>연결된 API가 없습니다.</h3><p>검색이나 업무·HTTP 필터를 변경해 보세요.</p></div>;
  return <div className="api-map" aria-label={`${menu.label} API 관계도`}>
    <div className="api-map-labels" aria-hidden="true"><span>{menu.isGrouping ? "연결 근거 분류" : "사용 메뉴"}</span><span>업무 모듈</span><span>API 계약</span></div>
    <div className="api-map-canvas" style={{"--map-height": `${height}px`}}>
      <svg className="api-map-edges" viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {graph.modules.map(module => <path key={`menu-${module.id}`} className={`api-map-edge--${module.clientErrorSeverity}`} d={`M 295 ${height / 2} C 330 ${height / 2}, 335 ${moduleCenters.get(module.id)}, 365 ${moduleCenters.get(module.id)}`} />)}
        {graph.routes.map((row, index) => <path key={row.id} className={`${selectedApiId === row.id ? "is-selected" : ""} api-map-edge--${row.clientErrorSeverity}`} d={`M 635 ${moduleCenters.get(row.module || "unclassified")} C 658 ${moduleCenters.get(row.module || "unclassified")}, 670 ${62 + index * 96}, 695 ${62 + index * 96}`} />)}
      </svg>
      <div className="api-map-lane api-map-lane--menu">
        <div className={`api-map-node api-map-menu api-map-error--${summary.clientErrorSeverity}`} data-error-severity={summary.clientErrorSeverity} style={{top: `${height / 2 - 54}px`}}>
          <span className="api-eyebrow">{menu.isGrouping ? "API 묶음" : "선택한 메뉴"}</span><strong>{menu.label}</strong><small>{graph.totalApiCount}개 API · {graph.modules.length}개 업무</small><ApiClientErrorBadge row={summary} compact />
        </div>
      </div>
      <div className="api-map-lane api-map-lane--modules">
        {graph.modules.map((module, index) => <button type="button" className={`api-map-node api-map-module api-map-error--${module.clientErrorSeverity}`} data-error-severity={module.clientErrorSeverity} key={module.id} style={{top: `${20 + index * 96}px`}} onClick={() => onSelectModule(module.id)} aria-label={`관계도 업무 ${module.label} ${module.apiCount}개 API${module.clientErrorCount > 0 ? ` 오류 보고 ${module.clientErrorCount}건` : ""}`}>
          <strong>{module.label}</strong><small>{module.apiCount}개 API · 업무만 보기 →</small><ApiClientErrorBadge row={module} compact />
        </button>)}
      </div>
      <div className="api-map-lane api-map-lane--routes">
        {graph.routes.map((row, index) => <button type="button" className={`api-map-node api-map-api ${selectedApiId === row.id ? "is-selected" : ""} api-map-error--${row.clientErrorSeverity}`} data-error-severity={row.clientErrorSeverity} key={row.id} style={{top: `${20 + index * 96}px`}} onClick={() => onSelectApi(row)} aria-label={`관계도 ${row.method} ${row.path}${row.clientErrorCount > 0 ? ` 오류 보고 ${row.clientErrorCount}건` : ""}`}>
          <span><b className={`api-method api-method--${row.method.toLowerCase()}`}>{row.method}</b><small>상세 보기 →</small></span><code>{row.path}</code><ApiClientErrorBadge row={row} compact />
        </button>)}
      </div>
    </div>
    {graph.omittedApiCount > 0 && <p className="api-map-limit">관계도에는 오류 보고가 있는 API를 우선해 {graph.routes.length}개 API를 표시합니다. 나머지 {graph.omittedApiCount}개는 목록에서 확인할 수 있습니다. <a href="#api-list-section">API 목록 보기 →</a></p>}
  </div>;
}
