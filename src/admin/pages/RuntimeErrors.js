import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getRuntimeErrors } from "../api/runtimeErrorsApi";
import { time } from "./operationsModel";
import "./RuntimeErrors.css";

const kindNames = { REACT_RENDER: "화면 렌더링", JS_FATAL: "JS 치명 오류", JS_NONFATAL: "JS 실행 오류" };
const clientNames = { IOS: "iOS", ANDROID: "Android" };
const errorTypes = new Set(["Error", "TypeError", "ReferenceError", "RangeError", "SyntaxError", "Other"]);
const validCount = n => Number.isSafeInteger(n) && n >= 0 ? n : 0;
const kindName = kind => kindNames[kind] || "기타 오류";
const clientName = client => clientNames[client] || "미확인";

export default function RuntimeErrors({ snapshotRevision }) {
  const { user } = useAuth();
  const scope = JSON.stringify([user?.accountSubject, user?.roles, user?.permissions]);
  const [attempt, setAttempt] = useState(0);
  const [kind, setKind] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [result, setResult] = useState({ scope, loading: true, data: null, error: "" });
  useEffect(() => {
    const controller = new AbortController();
    setResult(previous => previous.scope === scope
      ? { ...previous, loading: true, error: "" }
      : { scope, loading: true, data: null, error: "" });
    getRuntimeErrors({ signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setResult({ scope, loading: false, data, error: "" });
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ scope, loading: false, data: null,
        error: error?.status === 401 || error?.status === 403 ? "권한을 확인할 수 없어요. 운영자 계정으로 다시 로그인해 주세요." : "앱 오류 기록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
    });
    return () => controller.abort();
  }, [attempt, scope, snapshotRevision]);
  const state = result.scope === scope ? result : { loading: true, data: null, error: "" };
  const data = state.data;
  const rows = useMemo(() => (data?.recent || []).filter(row => !kind || row.kind === kind), [data, kind]);
  const selected = rows.find(row => row.eventId === selectedId);
  const maxHour = Math.max(1, ...(data?.hourly || []).map(row => validCount(row.count)));
  const maxKind = Math.max(1, ...(data?.kindCounts || []).map(row => validCount(row.count)));
  return <div className="runtime-errors">
    <section className="ops-panel runtime-heading">
      <div><h2>앱 화면 오류</h2><p>최근 24시간 앱에서 보고한 오류예요. 같은 위치의 반복 오류는 짧은 시간 동안 하나로 묶일 수 있어요. 네이티브 크래시나 즉시 종료된 JS 오류는 수집되지 않을 수 있어요.</p></div>
      <button className="ops-button" type="button" disabled={state.loading} onClick={() => setAttempt(value => value + 1)}>{state.loading ? "확인 중…" : "앱 오류 새로고침"}</button>
    </section>
    {state.loading && <p role="status">{data ? "앱 오류 기록을 갱신하고 있어요." : "앱 오류 기록을 불러오는 중이에요."}</p>}
    {state.error && <div className="admin-error-panel" role="alert"><p>{state.error}</p><button type="button" className="ops-button" onClick={() => setAttempt(value => value + 1)}>다시 시도</button></div>}
    {data && <>
      <p className="ops-muted">조회 범위 {time(data.windowStart)} ~ {time(data.windowEnd)} · 총 {data.total.toLocaleString()}건 · 상세 기록 {data.retentionDays}일 보관</p>
      {data.total === 0 ? <section className="ops-panel"><p role="status">최근 24시간 보고된 앱 화면 오류가 없어요.</p></section> : <>
        <div className="runtime-charts">
          <section className="ops-panel"><h3>오류 유형별</h3><p className="ops-muted">유형을 선택하면 아래 최근 기록에서 확인할 수 있어요.</p>
            <div className="runtime-kind-list">{data.kindCounts.map(item => <button type="button" key={item.kind} className="runtime-kind" aria-pressed={kind === item.kind} onClick={() => setKind(kind === item.kind ? "" : item.kind)}>
              <span>{kindName(item.kind)}</span><span className="runtime-bar-track" aria-hidden="true"><span style={{ width: `${100 * validCount(item.count) / maxKind}%` }} /></span><strong>{validCount(item.count)}건</strong>
            </button>)}</div>
          </section>
          <section className="ops-panel"><h3>시간별 발생</h3><p className="ops-muted">시간대는 이 기기의 설정 기준 · 각 막대는 1시간</p>
            <div className="runtime-hours" role="img" aria-label={"시간별 앱 오류 발생: " + data.hourly.map(row => `${time(row.bucketStart)} ${validCount(row.count)}건`).join(", ")}>
              {data.hourly.map(row => <span className="runtime-hour-column" key={row.bucketStart} title={`${time(row.bucketStart)} ${validCount(row.count)}건`}><span className="runtime-hour-bar" style={{ height: `${Math.max(2, 100 * validCount(row.count) / maxHour)}%` }} /></span>)}
            </div>
            <div className="runtime-hour-labels"><span>{time(data.hourly[0]?.bucketStart)}</span><span>{time(data.hourly[data.hourly.length - 1]?.bucketStart)}</span></div>
          </section>
        </div>
        <section className="ops-panel"><h3>최근 오류 기록</h3>
          <p className="ops-muted">최신 {data.recentLimit}건의 기록{data.hasMore ? "만 표시합니다" : "을 표시합니다"}. {kind ? `선택한 ${kindName(kind)} 조건은 이 목록에만 적용돼요.` : ""}</p>
          {kind && <button type="button" className="ops-link-button" onClick={() => setKind("")}>유형 선택 해제</button>}
          <div className="ops-table-wrap"><table className="ops-table"><caption>최근 앱 화면 오류 발생 기록</caption><thead><tr><th>발생 시각</th><th>유형</th><th>화면</th><th>계정</th><th>기기</th><th>앱 버전</th><th>상세</th></tr></thead><tbody>
            {rows.map(row => <tr key={row.eventId}><td><time dateTime={row.occurredAt || row.receivedAt}>{time(row.occurredAt || row.receivedAt)}</time><small className="runtime-meta">{row.occurredAt ? "기기 시각" : "서버 수신 시각"}</small></td><td>{kindName(row.kind)}</td><td>{row.screenLabel || "화면 정보 없음"}</td><td>{row.identity === "VERIFIED" && row.username ? `@${row.username}` : "계정 확인 불가"}</td><td>{clientName(row.client)}</td><td>{row.appVersion || "미확인"}{row.buildNumber ? ` (${row.buildNumber})` : ""}</td><td><button type="button" className="ops-link-button" aria-label={`${row.screenLabel || "화면 정보 없음"} ${time(row.occurredAt || row.receivedAt)} 오류 위치 보기`} aria-pressed={selectedId === row.eventId} onClick={() => setSelectedId(selectedId === row.eventId ? "" : row.eventId)}>위치 보기</button></td></tr>)}
          </tbody></table></div>
          {!rows.length && <p role="status">표시된 최근 기록 중 선택한 유형이 없어요.</p>}
          {selected && <div className="runtime-detail"><strong>오류 위치 단서</strong><p>종류: {errorTypes.has(selected.errorType) ? selected.errorType : "미확인"} · 버전: {selected.appVersion || "미확인"}{selected.buildNumber ? ` (${selected.buildNumber})` : ""} · 화면: {selected.screenLabel || "정보 없음"}</p><p>숫자 위치: {Array.isArray(selected.frames) && selected.frames.length ? selected.frames.filter(frame => frame && Number.isSafeInteger(frame.line) && frame.line >= 0 && Number.isSafeInteger(frame.column) && frame.column >= 0).map(frame => `${frame.line}:${frame.column}`).join(", ") || "정보 없음" : "정보 없음"}</p></div>}
          <p className="ops-muted">오류 메시지와 원문 스택은 수집하지 않아요. 숫자 위치를 코드로 해석하려면 해당 앱 버전의 릴리스 소스맵이 필요해요.</p>
        </section>
      </>}
    </>}
  </div>;
}
