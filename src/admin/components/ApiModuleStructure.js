import React, {useMemo, useState} from "react";
import {moduleDetails} from "../pages/apiRegistryModel";

export default function ApiModuleStructure({architecture}) {
  const modules = architecture?.modules || [];
  const [selectedId, setSelectedId] = useState(modules[0]?.id || "");
  const selected = modules.find(module => module.id === selectedId) || modules[0];
  const outgoing = useMemo(() => (architecture?.dependencies || []).filter(edge => edge.fromModule === selected?.id), [architecture, selected]);
  const incoming = useMemo(() => (architecture?.dependencies || []).filter(edge => edge.toModule === selected?.id), [architecture, selected]);
  if (!selected) return <p className="api-registry-note">이 서버에는 서비스 구조 분석 자료가 아직 제공되지 않습니다.</p>;
  return <section className="api-structure" aria-label="서비스 모듈 구조">
    <div className="api-section-heading"><div><span className="api-eyebrow">소스 구조</span><h2>서비스가 연결되는 방식</h2><p>모듈을 선택하면 서비스 인터페이스와 다른 업무에 대한 참조를 확인할 수 있습니다.</p></div><span className="api-tag">서비스 인터페이스 {architecture.servicePortCount}개</span></div>
    <p className="api-registry-note">연결선은 컴파일된 서비스 생성자에서 확인한 인터페이스 의존 관계입니다. 실제 요청 흐름이나 호출 횟수를 뜻하지 않습니다. 저장소와 동적 호출은 분석 범위에 포함되지 않습니다.</p>
    <div className="api-structure-modules" aria-label="구조 모듈 선택">{modules.map(module => <button type="button" aria-pressed={selected?.id === module.id} onClick={() => setSelectedId(module.id)} key={module.id}><strong>{moduleDetails(module.id).label}</strong><span>{module.portCount}개 인터페이스</span></button>)}</div>
    <div className="api-structure-links">
      <div><h3>이 모듈을 참조하는 업무</h3>{incoming.length ? incoming.map(edge => <button type="button" key={`${edge.fromModule}-${edge.toModule}`} onClick={() => setSelectedId(edge.fromModule)}><strong>{moduleDetails(edge.fromModule).label}</strong><span>생성자 의존 {edge.dependencyCount}개 →</span></button>) : <p>다른 모듈의 생성자 참조 근거 없음</p>}</div>
      <div className="api-structure-focus"><span className="api-eyebrow">선택한 모듈</span><h3>{moduleDetails(selected.id).label}</h3><p>{selected.portCount}개 인터페이스</p><small>명령 {selected.commandMethodCount} · 조회 {selected.queryMethodCount}</small></div>
      <div><h3>이 모듈이 참조하는 업무</h3>{outgoing.length ? outgoing.map(edge => <button type="button" key={`${edge.fromModule}-${edge.toModule}`} onClick={() => setSelectedId(edge.toModule)}><strong>→ {moduleDetails(edge.toModule).label}</strong><span>생성자 의존 {edge.dependencyCount}개</span></button>) : <p>다른 모듈의 생성자 참조 근거 없음</p>}</div>
    </div>
    <div className="api-structure-evidence"><h3>참조 근거</h3>{outgoing.length ? outgoing.map(edge => <details key={`${edge.fromModule}-${edge.toModule}`}><summary>{moduleDetails(selected.id).label} → {moduleDetails(edge.toModule).label} · {edge.dependencyCount}개</summary><ul>{(edge.evidence || []).map((item, index) => <li key={index}><code>{item.sourceClass}</code><span>→ {item.targetType}</span></li>)}</ul></details>) : <p className="api-registry-note">선택한 모듈의 다른 업무 참조가 관측되지 않았습니다.</p>}</div>
    <div className="api-port-list"><h3>{moduleDetails(selected.id).label}의 서비스 인터페이스</h3>{(selected.ports || []).map(port => <details key={port.port}><summary><code>{port.port}</code><span>명령 {port.commandMethods || 0} · 조회 {port.queryMethods || 0}</span></summary><p>구현: <code>{port.implementation}</code></p><div className="api-port-roles">{(port.roles || []).map(role => <div key={role.name}><span>{role.kind === "command" ? "명령" : "조회"} {role.methodCount}개</span><code>{role.name}</code></div>)}</div></details>)}</div>
  </section>;
}
