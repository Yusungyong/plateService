import React from "react";
import { Link, useLocation } from "react-router-dom";
import AdminPageHeader from "../components/AdminPageHeader";
import { time } from "./operationsModel";
export function Flow({ stages, label }) {
  return (
    <div className="ops-flow" role="list" aria-label={label}>
      {stages.map((stage, i) => (
        <React.Fragment key={stage.title}>
          {i > 0 && (
            <span className="ops-arrow" aria-hidden="true">
              →
            </span>
          )}
          <div role="listitem" className={"ops-node ops-node--" + stage.state}>
            <span className={"ops-state ops-state--" + stage.state}>
              {stage.state === "good"
                ? "✓ 확인"
                : stage.state === "bad"
                ? "! 실패"
                : stage.state === "warning"
                ? "! 요청 확인"
                : "· 확인 불가"}
            </span>
            <strong>{stage.title}</strong>
            <p>{stage.detail}</p>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}
export function State({ value, label }) {
  return (
    <span className={"ops-state ops-state--" + value}>
      <span className="ops-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
export default function OperationsShared({
  title,
  description,
  data,
  children,
}) {
  const location = useLocation();
  return (
    <div className="admin-page ops">
      <AdminPageHeader
        title={title}
        description={description}
        actions={
          <div className="ops-actions">
            <span className="ops-muted">su12ng 전용</span>
            <label>
              <input
                type="checkbox"
                checked={data.autoRefresh}
                onChange={(e) => data.setAutoRefresh(e.target.checked)}
              />{" "}
              30초 자동 갱신
            </label>
            <button
              className="ops-button"
              disabled={data.loading}
              onClick={data.load}
            >
              {data.loading ? "확인 중…" : "새로고침"}
            </button>
          </div>
        }
      />
      <nav className="ops-tabs" aria-label="서비스 운영 화면">
        {[
          ["/admin/operations", "운영 홈"],
          ["/admin/operations/incidents", "장애·알림"],
          ["/admin/operations/releases", "배포·품질"],
        ].map(([path, label]) => (
          <Link
            key={path}
            to={path}
            aria-current={location.pathname === path ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      {data.error && (
        <div className="admin-error-panel" role="alert">
          <p>{data.error}</p>
          <button className="ops-button" onClick={data.load}>
            다시 시도
          </button>
        </div>
      )}
      {!data.snapshot && data.loading && (
        <p role="status">운영 기록을 불러오는 중입니다.</p>
      )}
      {data.snapshot && (
        <>
          <p className="ops-muted">
            마지막 조회 {time(data.snapshot.collectedAt)} · 서버 지표는 현재
            프로세스 누적, 앱 오류는 24 UTC 시간 버킷, 푸시는 최근 24시간
            기준입니다.
          </p>
          {children}
        </>
      )}
    </div>
  );
}
