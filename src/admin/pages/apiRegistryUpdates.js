import updates from "../api/apiRegistryUpdates.json";

// Parameter names are not different endpoints. Keep the server's display path.
export const routeKey = row => `${row.method} ${row.path.replace(/\{[^}]+\}/g, "{}")}`;
const itemKeys = item => new Set(item.routeKeys.map(key => {
  const split = key.indexOf(" ");
  return routeKey({method: key.slice(0, split), path: key.slice(split + 1)});
}));
const entries = [...updates.features.map(item => ({...item, kind: "feature"})),
  ...updates.optimizations.map(item => ({...item, kind: "optimization"}))]
  .map(item => ({...item, keys: itemKeys(item)}));

export function annotateRegistryRow(row) {
  const related = entries.filter(item => item.keys.has(routeKey(row)));
  return {...row, updateIds: related.map(item => item.id),
    updateLabels: related.map(item => item.label),
    features: related.filter(item => item.kind === "feature").map(({keys, ...item}) => item),
    optimizations: related.filter(item => item.kind === "optimization").map(({keys, ...item}) => item)};
}

export function summarizeUpdates(rows) {
  return entries.map(({keys, ...item}) => {
    const routes = rows.filter(row => keys.has(routeKey(row)));
    return {...item, apiIds: routes.map(row => row.id), apiCount: routes.length,
      registeredCount: routes.filter(row => row.active).length,
      pendingCount: routes.filter(row => !row.active).length,
      clientErrorCount: routes.every(row => row.clientErrorAvailable === true)
        ? routes.reduce((sum, row) => sum + row.clientErrorCount, 0) : null};
  });
}

export function registrationLabel(row) {
  if (row.active) return "서버 등록 확인";
  if (row.implementationStage === "backend_pending") return "서버 구현 대기";
  if (row.implementationStage === "server_pr") return "서버 반영 대기";
  return "현재 미등록";
}

export const updateStageLabels = {server_pr: "서버 PR #149 · 앱 반영 필요", backend_pending: "서버 Issue #147 · 구현 대기", app_revision: "최신 앱 코드 기준"};
export {updates};
