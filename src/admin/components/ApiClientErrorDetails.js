import React from "react";
import ApiClientErrorBadge from "./ApiClientErrorBadge";
import {errorTime} from "../pages/apiClientErrors";

const clientLabels = {ANDROID: "Android", IOS: "iOS", WEB: "웹"};
function kindLabel(item) {return item.kind === "HTTP" ? `HTTP ${item.status}` : item.kind === "NETWORK" ? "연결 실패" : "시간 초과";}

export default function ApiClientErrorDetails({row}) {
  const report = row.clientErrors;
  return <section className="api-error-details" aria-label="API 오류 보고 상세"><h3>최근 24시간 구간 오류 보고</h3><ApiClientErrorBadge row={row} />
    {row.clientErrorAvailable && report && <><dl className="api-error-counts"><div><dt>HTTP 4xx</dt><dd>{report.http4xxCount}건</dd></div><div><dt>HTTP 5xx</dt><dd>{report.http5xxCount}건</dd></div><div><dt>연결 실패</dt><dd>{report.networkCount}건</dd></div><div><dt>시간 초과</dt><dd>{report.timeoutCount}건</dd></div></dl>
      <p>마지막 보고 <time dateTime={report.lastSeenAt}>{errorTime(report.lastSeenAt)}</time></p>
      <p className="api-error-clients">보고한 클라이언트: {report.clients.map(client => clientLabels[client]).join(" · ") || "보고 없음"}</p>
      {report.recent.length > 0 && <div className="api-registry-table"><table><caption>최근 오류 분류 (최대 20개 그룹) · 유형·상태·클라이언트별</caption><thead><tr><th scope="col">유형</th><th scope="col">클라이언트</th><th scope="col">그룹 보고 수</th><th scope="col">마지막 보고</th></tr></thead><tbody>{[...report.recent].sort((a, b) => Date.parse(b.lastSeenAt) - Date.parse(a.lastSeenAt) || b.count - a.count).map(item => <tr key={`${item.kind}-${item.status}-${item.client}`}><td>{kindLabel(item)}</td><td>{clientLabels[item.client]}</td><td>{item.count}건</td><td><time dateTime={item.lastSeenAt}>{errorTime(item.lastSeenAt)}</time></td></tr>)}</tbody></table></div>}
    </>}
  </section>;
}
