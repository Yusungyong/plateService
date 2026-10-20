import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import OperationsShared, { State } from "./OperationsShared";
import useOperationsSnapshot from "./useOperationsSnapshot";
import { operationsModel, pushStages, time } from "./operationsModel";
import { getPushAttempt } from "../api/operationsApi";
import LoginFailureGuidance from "../components/LoginFailureGuidance";
import { loginAuthReport } from "./apiClientErrors";
import "./Operations.css";
import {EvidenceFlow,focusEvidence} from "./OperationsDrilldown";
import "./OperationsDrilldown.css";
export default function AdminOperationsIncidents() {
  const data = useOperationsSnapshot(),
    s = data.snapshot,
    m = useMemo(() => operationsModel(s), [s]);
  const [params, setParams] = useSearchParams(),
    push = params.get("view") === "push";
  const id=params.get('delivery')||'',errorKey=params.get('api')||'',outcome=params.get('outcome')||'',kind=params.get('kind')||'';
  const attempts=m.attempts.filter(row=>!outcome||row.providerStatus===outcome);
  const errorRows=m.rows.filter(row=>!kind||Number(row[kind])>0);
  function updateFilters(values){setParams({...Object.fromEntries(params),...values});}
  function selectError(row){updateFilters({api:row.method+' '+row.path});focusEvidence('ops-error-detail');}
  const [detail, setDetail] = useState(null),
    [detailError, setDetailError] = useState("");
  const detailRequest = useRef(null),
    detailVersion = useRef(0);
  const attempt =
    (detail&&String(detail.deliveryId)===id?detail:null) || (id?m.attempts.find((r) => String(r.deliveryId) === id):attempts[0]);
  const loadAttempt=useCallback(async (deliveryId) => {
    detailRequest.current?.abort();
    const controller = new AbortController();
    detailRequest.current = controller;
    const version = ++detailVersion.current;
    setDetail(null);
    setDetailError("");
    try {
      const next = await getPushAttempt(Number(deliveryId), {
        signal: controller.signal,
      });
      if (version === detailVersion.current && !controller.signal.aborted)
        setDetail(next);
    } catch (failure) {
      if (!controller.signal.aborted && version === detailVersion.current)
        setDetailError(failure.message || "전송 상세 조회 실패");
    }
  },[]);
  function selectAttempt(row){
    if(String(row.deliveryId)===id)loadAttempt(id);
    else updateFilters({delivery:String(row.deliveryId)});
    focusEvidence('ops-push-detail');
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
  useEffect(()=>{if(s&&push&&/^[1-9]\d*$/.test(id))loadAttempt(id);},[s,push,id,loadAttempt]);
  const error =
    errorKey?m.rows.find((r) => r.method + " " + r.path === errorKey):errorRows[0];
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
          <div className="ops-filter-bar"><strong>최근 24시간 FCM 집계</strong>{['SUCCESS','FAILED'].map(status=><button type="button" className="ops-link-button" key={status} aria-pressed={outcome===status} onClick={()=>{setParams({view:'push',outcome:status});focusEvidence('ops-push-list');}}>{status==='SUCCESS'?'접수 성공':'전송 실패'} {m.pushAvailable?(status==='SUCCESS'?m.accepted:m.rejected)+'건':'확인 불가'} →</button>)}</div>
          <p className="ops-muted">집계는 최근 24시간 전체 전송 기준이며, 아래 목록은 최근 최대 30건 안에서 선택 조건을 적용한 표본입니다.</p>
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
                  <EvidenceFlow stages={pushStages(attempt)} label="푸시 전달 단계" onSelect={(stage)=>{updateFilters({stage:stage.title});focusEvidence("ops-push-detail");}} />
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
            <section className="ops-panel" id="ops-push-detail" tabIndex={-1} aria-label="전송 상세">
              <h2>전송 상세</h2>
              {params.get("stage")&&<p className="ops-evidence-selection">선택 단계: {params.get("stage")}</p>}
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
                  <dt>기기 수신 시각</dt><dd>{time(attempt.receivedAt)}{!attempt.receivedAt&&attempt.openedAt?' · 열기 기록으로 수신 확인':''}</dd>
                  <dt>알림 열기 시각</dt><dd>{time(attempt.openedAt)}</dd>
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
          <section className="ops-panel" id="ops-push-list" tabIndex={-1}>
            <h2>최근 전송 시도</h2>
            <div className="ops-filter-bar"><label>FCM 전송 조건 <select value={outcome} onChange={event=>setParams({view:'push',...(event.target.value?{outcome:event.target.value}:{})})}><option value="">전체</option><option value="SUCCESS">접수 성공</option><option value="FAILED">전송 실패</option></select></label><span>조회된 {m.attempts.length}건 중 {attempts.length}건</span>{(outcome||id)&&<button type="button" className="ops-link-button" onClick={()=>setParams({view:'push'})}>조건 초기화</button>}</div>
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
                  {attempts.map((row) => (
                    <tr key={row.deliveryId}>
                      <td>{time(row.attemptedAt)}</td>
                      <td>{row.platform}</td>
                      <td><button type="button" className="ops-status-link" aria-label={'전송 #'+row.deliveryId+' FCM 결과 근거'} onClick={()=>selectAttempt(row)}>
                        <State
                          value={
                            row.providerStatus === "SUCCESS" ? "good" : "bad"
                          }
                          label={
                            row.providerStatus === "SUCCESS"
                              ? "접수 성공"
                              : row.errorCode
                          }
                        /> ↗</button>
                      </td>
                      <td><button type="button" className="ops-status-link" aria-label={'전송 #'+row.deliveryId+' 기기 확인 근거'} onClick={()=>selectAttempt(row)}>
                        {row.openedAt
                          ? "열기 확인"
                          : row.receivedAt
                          ? "수신 확인"
                          : "확인 불가"} ↗</button>
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
            {!attempts.length && (
              <p className="ops-empty">
                {m.pushAvailable ? "선택 조건의 전송 시도 기록 없음" : "조회 불가"}
              </p>
            )}
          </section>
          <section className="ops-panel" style={{ marginTop: 20 }}>
            <h2>전송이 생략된 이유</h2>
            {m.skips.length ? (
              <ul className="ops-list">
                {m.skips.map((skip, i) => (
                  <li key={i}><details><summary>
                    {skip.reason === "NO_ACTIVE_TOKEN"
                      ? "활성 기기 토큰 없음"
                      : skip.reason === "PROVIDER_UNAVAILABLE"
                      ? "푸시 제공자 연결 없음"
                      : "기타"}{" "}
                    · {skip.category} · {skip.count}건 · 근거 보기
                  </summary><p>최근 24시간 동안 서버가 {skip.category} 알림을 {skip.reason==='NO_ACTIVE_TOKEN'?'활성 기기 토큰이 없어':skip.reason==='PROVIDER_UNAVAILABLE'?'푸시 제공자에 연결할 수 없어':'해당 생략 사유로'} 보내지 않은 집계입니다. FCM에 전송한 실패 횟수와 별개이며, 이 API에는 개별 생략 이력이 제공되지 않습니다.</p><code>{skip.reason}</code></details></li>
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
                  <EvidenceFlow stages={stages} label="메뉴와 API 오류 관계" onSelect={()=>focusEvidence("ops-error-detail")} />
                  <p className="ops-muted">
                    메뉴 연결은 소스 기준입니다. 실제 사용자 세션의 호출 순서를
                    추적한 결과가 아닙니다.
                  </p>
                </>
              )}
            </section>
            <section className="ops-panel" id="ops-error-detail" tabIndex={-1}>
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
                  <div className="ops-filter-bar" aria-label="선택 API 오류 유형">{[['http5xxCount','서버 오류'],['http4xxCount','요청 거부'],['networkCount','네트워크'],['timeoutCount','시간초과']].map(([field,title])=><button type="button" className="ops-link-button" key={field} onClick={()=>{setParams({kind:field});focusEvidence('ops-error-list');}}>{title} {error[field]}건 · 같은 유형 API →</button>)}</div>
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
          <section className="ops-panel" id="ops-error-list" tabIndex={-1}>
            <h2>오류가 보고된 API</h2>
            <div className="ops-filter-bar"><label>오류 유형 <select value={kind} onChange={event=>setParams(event.target.value?{kind:event.target.value}:{})}><option value="">전체 오류</option><option value="http5xxCount">서버 오류</option><option value="http4xxCount">요청 거부</option><option value="networkCount">네트워크</option><option value="timeoutCount">시간초과</option></select></label><span>24 UTC 시간 버킷 · {errorRows.length}개 API</span>{(kind||errorKey)&&<button type="button" className="ops-link-button" onClick={()=>setParams({})}>조건 초기화</button>}</div>
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
                  {errorRows.map((row) => (
                    <tr key={row.method + row.path}>
                      <td>
                        <code>
                          {row.method} {row.path}
                        </code>
                      </td>
                      <td><button type="button" className="ops-status-link" aria-label={row.method+' '+row.path+' 오류 '+row.errorCount+'건 근거'} onClick={()=>selectError(row)}>{row.errorCount}건 ↗</button></td>
                      <td>{time(row.lastSeenAt)}</td>
                      <td>
                        <button
                          className="ops-link-button"
                          aria-pressed={error === row}
                          onClick={() =>
                            selectError(row)
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
            {!errorRows.length && (
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
