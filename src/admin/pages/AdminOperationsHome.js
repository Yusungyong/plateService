import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import OperationsShared, { Flow, State } from "./OperationsShared";
import useOperationsSnapshot from "./useOperationsSnapshot";
import { operationsModel, GITHUB_LABELS, time } from "./operationsModel";
import "./Operations.css";
export default function AdminOperationsHome() {
  const data = useOperationsSnapshot(),
    s = data.snapshot,
    m = useMemo(() => operationsModel(s), [s]);
  const slow = [...(s?.api?.runtimeMetrics || [])]
    .filter((r) => r.path?.startsWith("/api/") && r.requestCount > 0)
    .sort(
      (a, b) => b.totalTimeMs / b.requestCount - a.totalTimeMs / a.requestCount
    )
    .slice(0, 5);
  const max = Math.max(1, ...slow.map((r) => r.totalTimeMs / r.requestCount));
  return (
    <OperationsShared
      title="오늘의 운영"
      description="확인이 필요한 일을 먼저 살펴보세요."
      data={data}
    >
      {(m.rejected > 0 || m.skips.length > 0) && (
        <div className="ops-alert">
          <strong>푸시 전송 실패 또는 생략 기록이 있습니다.</strong>
          <Link to="/admin/operations/incidents?view=push">원인 확인 →</Link>
        </div>
      )}
      <dl className="ops-summary" aria-label="실제 운영 지표">
        <div>
          <dt>앱에서 보고한 API 오류</dt>
          <dd>
            {m.errors.available ? m.errors.errorCount + "건" : "확인 불가"}
          </dd>
          <small className="ops-muted">24 UTC 시간 버킷</small>
        </div>
        <div>
          <dt>서버 응답 실패율</dt>
          <dd>
            {m.serverFailureRate === null
              ? "기록 없음"
              : (m.serverFailureRate * 100).toFixed(1) + "%"}
          </dd>
          <small className="ops-muted">현재 프로세스 · HTTP 4xx/5xx</small>
        </div>
        <div>
          <dt>FCM 접수 성공률</dt>
          <dd>
            {!m.pushAvailable
              ? "확인 불가"
              : m.acceptanceRate === null
              ? "전송 기록 없음"
              : (m.acceptanceRate * 100).toFixed(1) + "%"}
          </dd>
          <small className="ops-muted">기기 수신률과 별개</small>
        </div>
        <div>
          <dt>활성 신고 표시</dt>
          <dd>
            {s?.reports?.available ? s.reports.activeFlags + "건" : "확인 불가"}
          </dd>
          <small className="ops-muted">미처리 신고 수와 별개</small>
        </div>
      </dl>
      <div className="ops-grid">
        <section className="ops-panel">
          <h2>확인이 필요한 일</h2>
          <ul className="ops-list">
            <li className="ops-row">
              <div>
                <State
                  value={
                    !m.errors.available
                      ? "unknown"
                      : m.errors.errorCount
                      ? "bad"
                      : "good"
                  }
                  label={
                    !m.errors.available
                      ? "API 오류 조회 불가"
                      : m.errors.errorCount
                      ? "API 오류 " + m.errors.errorCount + "건"
                      : "보고된 API 오류 없음"
                  }
                />
                <p className="ops-muted">
                  오류가 발생한 메뉴와 API를 확인하세요.
                </p>
              </div>
              <Link to="/admin/operations/incidents">진단 보기 →</Link>
            </li>
            <li className="ops-row">
              <div>
                <State
                  value={
                    !m.pushAvailable
                      ? "unknown"
                      : m.rejected > 0 || m.skips.length
                      ? "bad"
                      : "good"
                  }
                  label={
                    !m.pushAvailable
                      ? "푸시 기록 조회 불가"
                      : "푸시 전송 실패 " + m.rejected + "건"
                  }
                />
                <p className="ops-muted">
                  전송 생략과 기기 확인 상태도 구분합니다.
                </p>
              </div>
              <Link to="/admin/operations/incidents?view=push">
                전달 기록 →
              </Link>
            </li>
            <li className="ops-row">
              <div>
                <strong>배포 후 기능 점검</strong>
                <p className="ops-muted">
                  {m.releases.length
                    ? m.releases.length + "개 등록 버전"
                    : "등록된 버전 없음"}{" "}
                  · 실제 기기 확인은 별도 기록
                </p>
              </div>
              <Link to="/admin/operations/releases">점검 보기 →</Link>
            </li>
          </ul>
        </section>
        <section className="ops-panel">
          <h2>서비스 흐름</h2>
          <Flow
            label="수집과 확인 범위"
            stages={[
              {
                title: "앱 오류 보고",
                state: m.errors.available ? "good" : "unknown",
                detail: m.errors.available
                  ? "기록 조회 가능"
                  : "기록 조회 불가",
              },
              {
                title: "서버 요청",
                state: m.requests ? "good" : "unknown",
                detail: m.requests ? m.requests + "건 관측" : "관측 기록 없음",
              },
              {
                title: "FCM 전송",
                state: !m.pushAvailable
                  ? "unknown"
                  : m.rejected > 0 || m.skips.length
                  ? "bad"
                  : m.accepted
                  ? "good"
                  : "unknown",
                detail: "기기 수신은 별도 확인",
              },
            ]}
          />
          <p className="ops-muted">
            관측 범위를 보여주는 그림입니다. 전체 요청의 실제 호출 순서를 추적한
            결과는 아닙니다.
          </p>
        </section>
      </div>
      <div className="ops-grid">
        <section className="ops-panel">
          <h2>느린 서버 응답</h2>
          <p className="ops-muted">
            현재 프로세스의 메서드·경로·응답 상태별 평균입니다. 화면 로딩
            시간이나 p95가 아닙니다.
          </p>
          {slow.length ? (
            <ul className="ops-list">
              {slow.map((r, i) => (
                <li key={i}>
                  <div className="ops-row">
                    <code>
                      {r.method} {r.path} · {r.status}
                    </code>
                    <strong>
                      {(r.totalTimeMs / r.requestCount).toFixed(0)}ms
                    </strong>
                  </div>
                  <div className="ops-bar">
                    <span
                      style={{
                        width:
                          (r.totalTimeMs / r.requestCount / max) * 100 + "%",
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ops-empty">서버 응답 관측 기록이 없습니다.</p>
          )}
        </section>
        <section className="ops-panel">
          <h2>수집 상태</h2>
          <ul className="ops-list">
            <li>
              GitHub 실행 기록{" "}
              <strong>{GITHUB_LABELS[s?.github?.status] || "확인 불가"}</strong>
              <p className="ops-muted">
                마지막 확인 {time(s?.github?.checkedAt)}
              </p>
            </li>
            <li>
              앱 화면 로딩 · 활성 사용자 <strong>미수집</strong>
            </li>
            <li>
              백업·복구 검증 <strong>연동되지 않음</strong>
            </li>
          </ul>
          <p className="ops-muted">
            수집하지 않은 지표를 0이나 정상으로 표시하지 않습니다.
          </p>
          <Link to="/admin/api-registry">기존 API 관계도 보기 →</Link>
        </section>
      </div>
    </OperationsShared>
  );
}
