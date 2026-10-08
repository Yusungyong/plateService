const CLIENTS = new Set(["ANDROID", "IOS", "WEB"]);
const count = value => Number.isSafeInteger(value) && value >= 0;
const timestamp = value => typeof value === "string" && /^\d{4}-\d\d-\d\dT/.test(value) && Number.isFinite(Date.parse(value));
const fields = ["errorCount", "http4xxCount", "http5xxCount", "networkCount", "timeoutCount"];

export function clientErrorState(snapshot) {
  const report = snapshot?.clientErrors;
  const unavailable = {available: false, rows: new Map(), errorCount: null, affectedApiCount: null};
  if (report?.available !== true || !Array.isArray(report.rows) || report.windowHours !== 24
      || !timestamp(report.windowStart) || !timestamp(report.windowEnd) || Date.parse(report.windowStart) > Date.parse(report.windowEnd)) return unavailable;
  const rows = new Map();
  for (const row of report.rows) {
    if (!row || !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(row.method) || typeof row.path !== "string" || !row.path.startsWith("/api/") || !fields.every(field => count(row[field]))
        || row.errorCount !== row.http4xxCount + row.http5xxCount + row.networkCount + row.timeoutCount
        || !Array.isArray(row.clients) || row.clients.some(client => !CLIENTS.has(client)) || !Array.isArray(row.recent)
        || (row.lastSeenAt !== null && !timestamp(row.lastSeenAt))) return unavailable;
    if (row.recent.some(item => !count(item.count) || !CLIENTS.has(item.client) || !timestamp(item.lastSeenAt)
      || !["HTTP", "NETWORK", "TIMEOUT"].includes(item.kind)
      || (item.kind === "HTTP" ? !Number.isInteger(item.status) || item.status < 400 || item.status > 599 : item.status !== null))) return unavailable;
    const key = `${row.method} ${row.path}`;
    if (rows.has(key)) return unavailable;
    rows.set(key, {...row, severity: row.http5xxCount + row.networkCount + row.timeoutCount > 0 ? "critical" : row.errorCount > 0 ? "warning" : "none"});
  }
  return {available: true, rows, errorCount: [...rows.values()].reduce((total, row) => total + row.errorCount, 0),
    affectedApiCount: [...rows.values()].filter(row => row.errorCount > 0).length,
    windowStart: timestamp(report.windowStart) ? report.windowStart : null,
    windowEnd: timestamp(report.windowEnd) ? report.windowEnd : null};
}

export function clientErrorProperties(state, method, path) {
  const row = state.rows.get(`${method} ${path}`);
  return {clientErrorAvailable: state.available, clientErrorCount: state.available ? row?.errorCount || 0 : null,
    clientErrorSeverity: state.available ? row?.severity || "none" : "unknown", clientErrors: row || null};
}

export function summarizeClientErrors(rows) {
  const unique = [...new Map(rows.map(row => [`${row.method} ${row.path}`, row])).values()];
  const available = unique.every(row => row.clientErrorAvailable === true);
  const errors = available ? unique.reduce((total, row) => total + row.clientErrorCount, 0) : null;
  const severity = !available ? "unknown" : unique.some(row => row.clientErrorSeverity === "critical") ? "critical"
    : errors > 0 ? "warning" : "none";
  return {clientErrorAvailable: available, clientErrorCount: errors, clientErrorSeverity: severity,
    affectedApiCount: available ? unique.filter(row => row.clientErrorCount > 0).length : null};
}

export function compareClientErrors(a, b) {
  const rank = {critical: 2, warning: 1, none: 0, unknown: 0};
  return (rank[b.clientErrorSeverity] || 0) - (rank[a.clientErrorSeverity] || 0)
    || (b.clientErrorCount || 0) - (a.clientErrorCount || 0);
}

export function errorTime(value) {
  return timestamp(value) ? new Date(value).toLocaleString("ko-KR", {month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false}) : "—";
}
