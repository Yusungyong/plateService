import React, {useId, useMemo, useState} from "react";
import {moduleDetails} from "../pages/apiRegistryModel";
import ApiClientErrorBadge from "./ApiClientErrorBadge";

export default function ApiModuleStructure({architecture, moduleSummaries = []}) {
  const modules = architecture?.modules || [];
  const selectionId = useId();
  const [selectedId, setSelectedId] = useState(modules[0]?.id || "");
  const selected = modules.find(module => module.id === selectedId) || modules[0];
  const errors = id => moduleSummaries.find(module => module.id === id);
  const outgoing = useMemo(() => (architecture?.dependencies || []).filter(edge => edge.fromModule === selected?.id), [architecture, selected]);
  const incoming = useMemo(() => (architecture?.dependencies || []).filter(edge => edge.toModule === selected?.id), [architecture, selected]);
  if (!selected) return <p className="api-registry-note">이 서버에는 서비스 구조 분석 자료가 아직 제공되지 않습니다.</p>;
  return <section className="api-structure" aria-label="서비스 모듈 구조">
    <div className="api-section-heading"><div><h2>업무 간 연결</h2><p>업무를 고르면 어떤 업무와 연결되는지 볼 수 있습니다.</p></div><span className="api-info-text">전체 서비스 인터페이스 {architecture.servicePortCount}개</span></div>
    <div className="api-structure-picker"><label htmlFor={selectionId}>업무 선택</label><select id={selectionId} value={selected.id} onChange={event => setSelectedId(event.target.value)}>{modules.map(module => <option key={module.id} value={module.id}>{moduleDetails(module.id).label}</option>)}</select></div>
    <p className="api-registry-note">서비스 생성자의 참조 관계를 보여줍니다. 실제 호출 흐름이나 횟수는 표시하지 않습니다.</p>
    <div className="api-structure-links">
      <div><h3>이 업무를 참조하는 업무</h3>{incoming.length ? incoming.map(edge => <button type="button" key={`${edge.fromModule}-${edge.toModule}`} data-error-severity={errors(edge.fromModule)?.clientErrorSeverity} onClick={() => setSelectedId(edge.fromModule)}><strong>{moduleDetails(edge.fromModule).label}</strong><span>참조 {edge.dependencyCount}개 →</span><ApiClientErrorBadge row={errors(edge.fromModule)} compact /></button>) : <p>소스에서 확인된 참조 없음</p>}</div>
      <div className="api-structure-focus" data-error-severity={errors(selected.id)?.clientErrorSeverity}><span className="api-info-text">선택한 업무</span><h3>{moduleDetails(selected.id).label}</h3><p>{selected.portCount}개 인터페이스</p><small>명령 {selected.commandMethodCount} · 조회 {selected.queryMethodCount}</small><ApiClientErrorBadge row={errors(selected.id)} compact /></div>
      <div><h3>이 업무가 참조하는 업무</h3>{outgoing.length ? outgoing.map(edge => <button type="button" key={`${edge.fromModule}-${edge.toModule}`} data-error-severity={errors(edge.toModule)?.clientErrorSeverity} onClick={() => setSelectedId(edge.toModule)}><strong>→ {moduleDetails(edge.toModule).label}</strong><span>참조 {edge.dependencyCount}개</span><ApiClientErrorBadge row={errors(edge.toModule)} compact /></button>) : <p>소스에서 확인된 참조 없음</p>}</div>
    </div>
    <p className="api-registry-note">오류 표시는 각 업무의 HTTP API에 보고된 실패 합계입니다. 업무 참조 관계만으로 장애 전파나 원인을 판단하지 않습니다.</p>
    <details className="api-structure-evidence"><summary>연결 근거 보기 <span className="api-info-text">참조하는 업무 {outgoing.length}개</span></summary><p className="api-registry-note">컴파일된 생성자의 인터페이스 참조를 기준으로 합니다. 저장소와 동적 호출은 분석 범위에 포함되지 않습니다.</p>{outgoing.length ? outgoing.map(edge => <details key={`${edge.fromModule}-${edge.toModule}`}><summary>{moduleDetails(selected.id).label} → {moduleDetails(edge.toModule).label} · {edge.dependencyCount}개</summary><ul>{(edge.evidence || []).map((item, index) => <li key={index}><code>{item.sourceClass}</code><span>→ {item.targetType}</span></li>)}</ul></details>) : <p className="api-registry-note">선택한 업무가 다른 업무를 참조하는 생성자 근거가 없습니다.</p>}</details>
    <details className="api-port-list"><summary>서비스 인터페이스 보기 <span className="api-info-text">{moduleDetails(selected.id).label} {selected.portCount}개</span></summary>{(selected.ports || []).map(port => <details key={port.port}><summary><code>{port.port}</code><span>명령 {port.commandMethods || 0} · 조회 {port.queryMethods || 0}</span></summary><p>구현: <code>{port.implementation}</code></p><div className="api-port-roles">{(port.roles || []).map(role => <div key={role.name}><span>{role.kind === "command" ? "명령" : "조회"} {role.methodCount}개</span><code>{role.name}</code></div>)}</div></details>)}</details>
  </section>;
}
