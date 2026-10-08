import consumerEvidence from "./apiRegistryConsumers.json";
import {apiClient} from "../../api";
import {unwrapAdminResponse} from "./adminApiUtils";

export async function getApiRegistry() {
  return unwrapAdminResponse(await apiClient.get("/api/admin/api-registry"));
}

export function registryRows(snapshot) {
  const baseline = snapshot.declaredBaseline?.routes || [];
  const active = new Map((snapshot.activeRoutes || []).map(row => [`${row.method} ${row.path}`, row]));
  const menus = new Map([...(snapshot.declaredBaseline?.menus || []), ...consumerEvidence.menus].map(menu => [menu.id, menu]));
  const usageOverrides = new Map(consumerEvidence.routes.map(row => [`${row.method} ${row.path}`, row]));
  const rows = new Map(baseline.map(row => [`${row.method} ${row.path}`, {...row, active: false}]));
  active.forEach((row, key) => rows.set(key, {...rows.get(key), ...row, active: true}));
  return [...rows.values()].map(original => {
    const row = {...original, ...usageOverrides.get(`${original.method} ${original.path}`)};
    const samples = (snapshot.runtimeMetrics || []).filter(metric => metric.method === row.method && metric.path === row.path);
    const count = samples.reduce((total, metric) => total + metric.requestCount, 0);
    const errorCount = samples.filter(metric => Number(metric.status) >= 400).reduce((total, metric) => total + metric.requestCount, 0);
    const menuIds = [...new Set(row.menuIds || [])];
    return {...row, id: row.id || `${row.method} ${row.path}`, menuIds,
      surfaces: [...new Set(row.surfaces || [])],
      menuLabels: menuIds.map(id => menus.get(id)?.label || id),
      observed: count > 0, requestCount: count || null,
      errorRate: count > 0 ? errorCount / count : null,
      averageMs: count > 0 ? samples.reduce((total, metric) => total + metric.totalTimeMs, 0) / count : null};
  }).sort((a, b) => `${a.module} ${a.path} ${a.method}`.localeCompare(`${b.module} ${b.path} ${b.method}`));
}
