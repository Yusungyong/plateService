import React from "react";

export default function ApiClientErrorBadge({row, compact = false}) {
  if (!row?.clientErrorAvailable) return compact ? null : <span className="api-client-error api-client-error--unknown">집계 확인 불가</span>;
  if (!row.clientErrorCount) return compact ? null : <span className="api-client-error api-client-error--none">보고 없음</span>;
  const critical = row.clientErrorSeverity === "critical";
  return <span className={`api-client-error api-client-error--${critical ? "critical" : "warning"}`} data-error-severity={row.clientErrorSeverity}>
    <span aria-hidden="true">{critical ? "●" : "▲"}</span> {critical ? "서버·연결 오류" : "요청 오류"} {row.clientErrorCount.toLocaleString()}건
  </span>;
}
