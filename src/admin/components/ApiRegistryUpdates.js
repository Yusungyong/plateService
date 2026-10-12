import React from "react";
import {updates, updateStageLabels} from "../pages/apiRegistryUpdates";

export default function ApiRegistryUpdates({items, onSelect}) {
  return <div className="api-updates">
    <p className="api-registry-note">검토일 {updates.reviewedAt} · 서버 등록 수는 현재 응답 기준입니다. API 등록만으로 기능 활성화·앱 배포·성능 개선을 확정하지 않습니다.</p>
    <p className="api-registry-note"><a href={updates.serverPullRequest} target="_blank" rel="noreferrer">신규 홈·1:1 함께 보기 서버 PR #149 ↗</a> · <a href={updates.pendingServerIssue} target="_blank" rel="noreferrer">그룹·미디어 등 후속 서버 Issue #147 ↗</a></p>
    {[{id: "feature", label: "추가 기능"}, {id: "optimization", label: "최적화"}].map(section => <section key={section.id} aria-label={section.label}>
      <h2>{section.label}</h2><div className="api-update-list">{items.filter(item => item.kind === section.id).map(item => <article key={item.id} className={item.clientErrorCount > 0 ? "api-update--error" : ""}>
        <div className="api-update-heading"><h3>{item.label}</h3><span>{item.kind === "feature" ? (item.pendingCount === 0 ? "서버 등록 확인 · 앱 지원 확인 필요" : updateStageLabels[item.stage]) : "소스·검증 기록 기준"}</span></div>
        <p>{item.detail}</p>
        <p className="api-update-counts">연결 API {item.apiCount}개 · 서버 등록 {item.registeredCount}개 · 미등록 {item.pendingCount}개{item.clientErrorCount > 0 && <strong> · 오류 보고 {item.clientErrorCount}건</strong>}{item.clientErrorCount === null && " · 오류 집계 확인 불가"}</p>
        <details><summary>적용 근거·확인 사항</summary><p>{item.note}</p><code>{item.source}</code></details>
        <button type="button" className="api-text-button" onClick={() => onSelect(item)} aria-label={`${item.label} 연결 API 보기`}>연결 API 보기 →</button>
      </article>)}</div>
    </section>)}
  </div>;
}
