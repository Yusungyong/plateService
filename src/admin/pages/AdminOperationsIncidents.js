import React, { useEffect, useMemo, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import OperationsShared, { Flow, State } from "./OperationsShared";
import useOperationsSnapshot from "./useOperationsSnapshot";
import { operationsModel, pushStages, time } from "./operationsModel";
import { getPushAttempt } from "../api/operationsApi";
import LoginFailureGuidance from "../components/LoginFailureGuidance";
import { loginAuthReport } from "./apiClientErrors";
import "./Operations.css";
export default function AdminOperationsIncidents() {
  const data = useOperationsSnapshot(),
    s = data.snapshot,
    m = useMemo(() => operationsModel(s), [s]);
  const [params, setParams] = useSearchParams(),
    push = params.get("view") === "push";
  const [id, setId] = useState(null),
    [errorKey, setErrorKey] = useState("");
  const [detail, setDetail] = useState(null),
    [detailError, setDetailError] = useState("");
  const detailRequest = useRef(null),
    detailVersion = useRef(0);
  const attempt =
    detail || m.attempts.find((r) => r.deliveryId === id) || m.attempts[0];
  async function selectAttempt(row) {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    const version = ++detailVersion.current;
    setId(row.deliveryId);
    setDetail(null);
    setDetailError("");
    try {
      const next = await getPushAttempt(row.deliveryId, {
        signal: controller.signal,
      });
      if (version === detailVersion.current && !controller.signal.aborted)
        setDetail(next);
    } catch (failure) {
      if (!controller.signal.aborted && version === detailVersion.current)
        setDetailError(failure.message || "전송 상세 조회 실패");
    }
  }
  useEffect(() => {
    const request = detailRequest,
      counter = detailVersion;
    counter.current++;
    request.current?.abort();
    setDetail(null);
    setDetailError("");
    return () => {
      counter.current++;
      request.current?.abort();
    };
  }, [s]);
  const error =
    m.rows.find((r) => r.method + " " + r.path === errorKey) || m.rows[0];
  useEffect(() => {
    if (!s) {
      setId(null);
      setErrorKey("");
    }
  }, [s]);
  const stages = error
    ? [
        {
          title: "연결된 메뉴",
          state: "unknown",
          detail: error.menuLabels.join(" · ") || "메뉴 연결 근거 없음",
        },
        {
          title: error.method + " " + error.path,
          state: error.severity === "critical" ? "bad" : "warning",
          detail: error.errorCount + "건 보고",
        },
        {
          title: "오류 유형",
          state: error.severity === "critical" ? "bad" : "warning",
          detail: loginAuthReport(error)?.complete ? `로그인 인증 거부 (HTTP 401) ${error.errorCount}건`
            : `서버 ${error.http5xxCount} · HTTP 4xx ${error.http4xxCount} · 네트워크 ${error.networkCount} · 시간초과 ${error.timeoutCount}`,
        },
      ]
    : [];
  return (
    <OperationsShared
      title="장애·알림 진단"
      description="실패한 단계와 확인되지 않은 상태를 구분합니다."
      data={data}
    >
      <div className="ops-tabs" aria-label="진단 유형">
        <button
          className="ops-link-button"
          aria-pressed={!push}
          onClick={() => setParams({})}
        >
          API 오류
        </button>
        <button
          className="ops-link-button"
          aria-pressed={push}
          onClick={() => setParams({ view: "push" })}
        >
          푸시 전달
        </button>
      </div>
      {push ? (
        <>
          <div className="ops-grid">
            <section className="ops-panel">
              <h2>어디서 멈췄나요?</h2>
              {!m.pushAvailable ? (
                <p className="ops-notice">
                  푸시 기록을 조회할 수 없습니다. 운영 기록 저장소 상태를
                  확인하세요.
                </p>
              ) : !attempt ? (
                <p className="ops-empty">
                  최근 24시간 전송 시도 기록이 없습니다.
                </p>
              ) : (
                <>
                  <Flow stages={pushStages(attempt)} label="푸시 전달 단계" />
                  <p className="ops-muted">
                    수신·열기는 새 앱의 콜백 기록입니다. 기록이 없으면 실패로
                    단정하지 않습니다.
                  </p>
                  <ul className="ops-timeline">
                    {pushStages(attempt).map((stage) => (
                      <li key={stage.title}>
                        <State value={stage.state} label={stage.title} />
                        <p className="ops-muted">{stage.detail}</p>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
            <section className="ops-panel">
              <h2>전송 상세</h2>
              {detailError && <p role="alert">{detailError}</p>}
              {attempt ? (
                <dl>
                  <dt>플랫폼</dt>
                  <dd>{attempt.platform}</dd>
                  <dt>전송 시각</dt>
                  <dd>{time(attempt.attemptedAt)}</dd>
                  <dt>FCM 결과</dt>
                  <dd>
                    {attempt.providerStatus === "SUCCESS"
                      ? "접수 성공"
                      : attempt.providerStatus === "FAILED"
                      ? "전송 실패"
                      : "확인 불가"}
                  </dd>
                  <dt>오류 코드</dt>
                  <dd>
                    <code>
                      {attempt.providerStatus === "SUCCESS"
                        ? "—"
                        : attempt.errorCode}
                    </code>
                  </dd>
                  <dt>앱 버전</dt>
                  <dd>미수집</dd>
                </dl>
              ) : (
                <p className="ops-muted">
                  전송 시도를 선택하면 상세 내용을 표시합니다.
                </p>
              )}
              <p className="ops-muted">
                토큰·알림 본문·수신자 정보는 표시하지 않습니다.
              </p>
            </section>
          </div>
          <section className="ops-panel">
            <h2>최근 전송 시도</h2>
            <p className="ops-muted">
              최근 24시간 · 최대 30건 · 기기별 전송 시도 기준
            </p>
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>시각</th>
                    <th>플랫폼</th>
                    <th>FCM 전송</th>
                    <th>기기 확인</th>
                    <th>상세</th>
                  </tr>
                </thead>
                <tbody>
                  {m.attempts.map((row) => (
                    <tr key={row.deliveryId}>
                      <td>{time(row.attemptedAt)}</td>
                      <td>{row.platform}</td>
                      <td>
                        <State
                          value={
                            row.providerStatus === "SUCCESS" ? "good" : "bad"
                          }
                          label={
                            row.providerStatus === "SUCCESS"
                              ? "접수 성공"
                              : row.errorCode
                          }
                        />
                      </td>
                      <td>
                        {row.openedAt
                          ? "열기 확인"
                          : row.receivedAt
                          ? "수신 확인"
                          : "확인 불가"}
                      </td>
                      <td>
                        <button
                          className="ops-link-button"
                          aria-pressed={row.deliveryId === attempt?.deliveryId}
                          onClick={() => selectAttempt(row)}
                        >
                          전송 #{row.deliveryId} 보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!m.attempts.length && (
              <p className="ops-empty">
                {m.pushAvailable ? "전송 시도 기록 없음" : "조회 불가"}
              </p>
            )}
          </section>
          <section className="ops-panel" style={{ marginTop: 20 }}>
            <h2>전송이 생략된 이유</h2>
            {m.skips.length ? (
              <ul className="ops-list">
                {m.skips.map((skip, i) => (
                  <li key={i}>
                    {skip.reason === "NO_ACTIVE_TOKEN"
                      ? "활성 기기 토큰 없음"
                      : skip.reason === "PROVIDER_UNAVAILABLE"
                      ? "푸시 제공자 연결 없음"
                      : "기타"}{" "}
                    · {skip.category} · {skip.count}건
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ops-muted">
                {m.pushAvailable ? "관측된 생략 기록 없음" : "조회 불가"}
              </p>
            )}
          </section>
        </>
      ) : (
        <>
          <div className="ops-grid">
            <section className="ops-panel">
              <h2>메뉴와 오류의 연결</h2>
              {!m.errors.available ? (
                <p className="ops-notice">앱 오류 기록을 조회할 수 없습니다.</p>
              ) : !error ? (
                <p className="ops-empty">보고된 API 오류가 없습니다.</p>
              ) : (
                <>
                  <Flow stages={stages} label="메뉴와 API 오류 관계" />
                  <p className="ops-muted">
                    메뉴 연결은 소스 기준입니다. 실제 사용자 세션의 호출 순서를
                    추적한 결과가 아닙니다.
                  </p>
                </>
              )}
            </section>
            <section className="ops-panel">
              <h2>오류 상세</h2>
              {error ? (
                <>
                  <p>
                    <code>
                      {error.method} {error.path}
                    </code>
                  </p>
                  <dl>
                    <dt>보고 건수</dt>
                    <dd>{error.errorCount}건</dd>
                    <dt>플랫폼</dt>
                    <dd>{error.clients.join(" · ")}</dd>
                    <dt>마지막 발생</dt>
                    <dd>{time(error.lastSeenAt)}</dd>
                    <dt>앱 버전·영향 사용자 수</dt>
                    <dd>미수집</dd>
                  </dl>
                  <LoginFailureGuidance report={error} />
                  <Link
                    to={
                      "/admin/api-registry?api=" +
                      encodeURIComponent(error.method + " " + error.path)
                    }
                  >
                    API 관계도에서 보기 →
                  </Link>
                </>
              ) : (
                <p className="ops-muted">오류가 발생한 API를 선택하세요.</p>
              )}
            </section>
          </div>
          <section className="ops-panel">
            <h2>오류가 보고된 API</h2>
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                  <tr>
                    <th>API</th>
                    <th>건수</th>
                    <th>마지막 발생</th>
                    <th>확인</th>
                  </tr>
                </thead>
                <tbody>
                  {m.rows.map((row) => (
                    <tr key={row.method + row.path}>
                      <td>
                        <code>
                          {row.method} {row.path}
                        </code>
                      </td>
                      <td>{row.errorCount}건</td>
                      <td>{time(row.lastSeenAt)}</td>
                      <td>
                        <button
                          className="ops-link-button"
                          aria-pressed={error === row}
                          onClick={() =>
                            setErrorKey(row.method + " " + row.path)
                          }
                        >
                          오류 보기
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!m.rows.length && (
              <p className="ops-empty">
                {m.errors.available ? "보고된 API 오류 없음" : "조회 불가"}
              </p>
            )}
          </section>
        </>
      )}
    </OperationsShared>
  );
}
