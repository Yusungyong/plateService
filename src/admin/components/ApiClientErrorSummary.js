import React from "react";
import {errorTime} from "../pages/apiClientErrors";

export default function ApiClientErrorSummary({state, errorsOnly, onErrorsOnly, autoRefresh, onAutoRefresh, refreshing, checkedAt}) {
  return <section className="api-client-monitor" aria-label="클라이언트 오류 모니터링">
    <div className="api-client-monitor-heading"><div><h2>앱·웹 오류 보고</h2><p>최근 24시간 구간 · 서버 수신 시각 기준</p></div>
      <div className="api-monitor-controls"><label><input type="checkbox" checked={errorsOnly} onChange={event => onErrorsOnly(event.target.checked)} disabled={!state.available} /> 오류가 보고된 API만</label>
        <label><input type="checkbox" checked={autoRefresh} onChange={event => onAutoRefresh(event.target.checked)} /> 30초 자동 새로고침</label></div>
    </div>
    {state.available ? <><dl className="api-client-summary"><div><dt>오류 보고</dt><dd>{state.errorCount.toLocaleString()}<small>건</small></dd></div><div><dt>영향 API</dt><dd>{state.affectedApiCount.toLocaleString()}<small>개</small></dd></div></dl>
      <p className="api-monitor-scope">집계 구간: <time dateTime={state.windowStart}>{errorTime(state.windowStart)}</time> ~ <time dateTime={state.windowEnd}>{errorTime(state.windowEnd)}</time></p>
      <p className="api-registry-note">앱·웹이 보고한 최종 실패입니다. 전체 요청 대비 오류율은 제공하지 않습니다. 보고가 없으면 미보고·미사용 여부를 구분할 수 없습니다.</p></>
      : <p className="api-monitor-unavailable" role="status">오류 집계를 확인할 수 없습니다. 보고 0건으로 판단하지 마세요.</p>}
    <p className="api-monitor-freshness" role="status">{refreshing ? "오류 집계를 확인 중입니다." : checkedAt ? `마지막 확인 ${errorTime(checkedAt)}` : "아직 확인하지 않았습니다."} · {autoRefresh ? "화면이 보일 때 30초마다 확인" : "자동 새로고침 꺼짐"}</p>
  </section>;
}
