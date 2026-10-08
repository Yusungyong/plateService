import React, {useMemo} from "react";
import {moduleDetails, relationshipGraph} from "../pages/apiRegistryModel";

export default function ApiRelationshipMap({rows, menu, selectedApiId, onSelectModule, onSelectApi}) {
  const graph = useMemo(() => relationshipGraph(rows), [rows]);
  const height = Math.max(220, graph.modules.length * 80 + 24, graph.routes.length * 82 + 24);
  const moduleCenters = new Map(graph.modules.map((module, index) => [module.id, 54 + index * 80]));
  if (!rows.length) return <div className="api-map-empty"><span aria-hidden="true">◎</span><h3>연결된 API가 없습니다.</h3><p>검색이나 업무·HTTP 필터를 변경해 보세요.</p></div>;
  return <div className="api-map" aria-label={`${menu.label} API 관계도`}>
    <div className="api-map-labels" aria-hidden="true"><span>{menu.isGrouping ? "연결 근거 분류" : "사용 메뉴"}</span><span>업무 모듈</span><span>API 계약</span></div>
    <div className="api-map-canvas" style={{"--map-height": `${height}px`}}>
      <svg className="api-map-edges" viewBox={`0 0 1000 ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {graph.modules.map(module => <path key={`menu-${module.id}`} d={`M 295 ${height / 2} C 330 ${height / 2}, 335 ${moduleCenters.get(module.id)}, 365 ${moduleCenters.get(module.id)}`} />)}
        {graph.routes.map((row, index) => <path key={row.id} className={selectedApiId === row.id ? "is-selected" : ""} d={`M 635 ${moduleCenters.get(row.module || "unclassified")} C 658 ${moduleCenters.get(row.module || "unclassified")}, 670 ${54 + index * 82}, 695 ${54 + index * 82}`} />)}
      </svg>
      <div className="api-map-lane api-map-lane--menu">
        <div className="api-map-node api-map-menu" style={{top: `${height / 2 - 44}px`}}>
          <span className="api-eyebrow">{menu.isGrouping ? "메뉴 연결 없는 API" : "선택한 메뉴"}</span><strong>{menu.label}</strong><small>{graph.totalApiCount}개 API · {graph.modules.length}개 업무</small>
        </div>
      </div>
      <div className="api-map-lane api-map-lane--modules">
        {graph.modules.map((module, index) => <button type="button" className="api-map-node api-map-module" key={module.id} style={{top: `${20 + index * 80}px`}} onClick={() => onSelectModule(module.id)} aria-label={`관계도 업무 ${module.label} ${module.apiCount}개 API`}>
          <strong>{module.label}</strong><small>{module.apiCount}개 API · 업무 필터 적용 →</small>
        </button>)}
      </div>
      <div className="api-map-lane api-map-lane--routes">
        {graph.routes.map((row, index) => <button type="button" className={`api-map-node api-map-api ${selectedApiId === row.id ? "is-selected" : ""}`} key={row.id} style={{top: `${20 + index * 82}px`}} onClick={() => onSelectApi(row)} aria-label={`관계도 ${row.method} ${row.path}`}>
          <span><b className={`api-method api-method--${row.method.toLowerCase()}`}>{row.method}</b><small>{moduleDetails(row.module).label}</small></span><code>{row.path}</code>
        </button>)}
      </div>
    </div>
    {graph.omittedApiCount > 0 && <p className="api-map-limit">관계도에는 {graph.routes.length}개 API를 표시합니다. 나머지 {graph.omittedApiCount}개는 아래 전체 목록에서 확인하거나 업무 필터로 좁혀 보세요.</p>}
  </div>;
}
