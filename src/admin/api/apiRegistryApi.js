import consumerEvidence from "./apiRegistryConsumers.json";
import {apiClient} from "../../api";
import {unwrapAdminResponse} from "./adminApiUtils";
import {clientErrorProperties, clientErrorState, compareClientErrors} from "../pages/apiClientErrors";
import {annotateRegistryRow, routeKey} from "../pages/apiRegistryUpdates";

export async function getApiRegistry(options = {}) {
  return unwrapAdminResponse(await apiClient.get("/api/admin/api-registry", options));
}

export function registryRows(snapshot) {
  const baseline = snapshot.declaredBaseline?.routes || [];
  const active = new Map((snapshot.activeRoutes || []).map(row => [routeKey(row), row]));
  const menus = new Map([...(snapshot.declaredBaseline?.menus || []), ...consumerEvidence.menus].map(menu => [menu.id, menu]));
  const usageOverrides = new Map(consumerEvidence.routes.map(row => [routeKey(row), row]));
  // Reviewed client contracts remain visible while their server implementation is pending.
  const rows = new Map(consumerEvidence.routes.map(row => [routeKey(row), {...row, active: false}]));
  baseline.forEach(row => rows.set(routeKey(row), {...rows.get(routeKey(row)), ...row, active: false}));
  const clientErrors = clientErrorState(snapshot);
  const errorPaths = new Map([...clientErrors.rows.values()].map(row => [routeKey(row), row.path]));
  const metrics = new Map();
  for (const metric of snapshot.runtimeMetrics || []) {
    const key = routeKey(metric);
    if (!metrics.has(key)) metrics.set(key, []);
    metrics.get(key).push(metric);
  }
  active.forEach((row, key) => rows.set(key, {...rows.get(key), ...row, active: true}));
  return [...rows.values()].map(original => {
    const evidence = usageOverrides.get(routeKey(original));
    const replace = evidence?.linkPolicy === "replace";
    const row = {...original,
      usageStatus: evidence?.usageStatus || original.usageStatus,
      usageNote: evidence?.usageNote || original.usageNote,
      menuIds: replace ? evidence.menuIds : [...new Set([...(original.menuIds || []), ...(evidence?.menuIds || [])])],
      surfaces: replace ? evidence.surfaces : [...new Set([...(original.surfaces || []), ...(evidence?.surfaces || [])])],
      implementationStage: evidence?.implementationStage || original.implementationStage};
    const samples = metrics.get(routeKey(row)) || [];
    const count = samples.reduce((total, metric) => total + metric.requestCount, 0);
    const errorCount = samples.filter(metric => Number(metric.status) >= 400).reduce((total, metric) => total + metric.requestCount, 0);
    const menuIds = [...new Set(row.menuIds || [])];
    return annotateRegistryRow({...row, id: row.id || `${row.method} ${row.path}`, menuIds,
      ...clientErrorProperties(clientErrors, row.method, errorPaths.get(routeKey(row)) || row.path),
      surfaces: [...new Set(row.surfaces || [])],
      menuLabels: menuIds.map(id => menus.get(id)?.label || id),
      observed: count > 0, requestCount: count || null,
      errorRate: count > 0 ? errorCount / count : null,
      averageMs: count > 0 ? samples.reduce((total, metric) => total + metric.totalTimeMs, 0) / count : null});
  }).sort((a, b) => compareClientErrors(a, b) || `${a.module} ${a.path} ${a.method}`.localeCompare(`${b.module} ${b.path} ${b.method}`));
}
