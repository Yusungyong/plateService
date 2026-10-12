import {registryRows} from "../api/apiRegistryApi";
import evidence from "../api/apiRegistryConsumers.json";
import {registrationLabel, summarizeUpdates, routeKey, updates} from "./apiRegistryUpdates";
import {filterRegistryRows, buildMenuRelations} from "./apiRegistryModel";

const home = {method: "GET", path: "/api/chat/home", module: "social", menuIds: ["server:new-home"], authorization: "server-policy", id: "server-home"};
const stamp = "2026-10-12T02:00:00Z";
const failure = {method: "GET", path: home.path, errorCount: 2, http4xxCount: 0, http5xxCount: 2, networkCount: 0, timeoutCount: 0, lastSeenAt: stamp, clients: ["IOS"], recent: [{kind: "HTTP", status: 500, client: "IOS", count: 2, lastSeenAt: stamp}]};
const snapshot = {declaredBaseline: {routes: [home], menus: []}, activeRoutes: [home], clientErrors: {available: true, windowHours: 24, windowStart: "2026-10-11T02:00:00Z", windowEnd: stamp, rows: [failure]}};

test("new client contracts are discoverable without inflating registered server API count", () => {
  const rows = registryRows(snapshot);
  expect(rows.filter(row => row.active)).toHaveLength(1);
  expect(rows.find(row => row.path === "/api/chat/home")).toMatchObject({id: "server-home", authorization: "server-policy", menuIds: ["server:new-home", "app:Home"], active: true, clientErrorCount: 2});
  const group = rows.find(row => row.method === "POST" && row.path === "/api/chat/groups");
  expect(group).toMatchObject({active: false, observed: false, requestCount: null, implementationStage: "backend_pending"});
  expect(registrationLabel(group)).toBe("서버 구현 대기");
  expect(registrationLabel(rows.find(row => row.path.endsWith("candidate-bundles")))).toBe("서버 반영 대기");
});

test("server parameter names, identity, contract and consumers survive additive source merge", () => {
  const row = {method: "GET", path: "/api/chat/rooms/{id}", module: "server-module", id: "server-room", capability: "server-capability", menuIds: ["server:menu"], surfaces: ["admin"], variants: [{handler: "ServerController"}]};
  const rows = registryRows({declaredBaseline: {routes: [row]}, activeRoutes: [row]});
  expect(rows.filter(value => routeKey(value) === routeKey(row))).toHaveLength(1);
  const merged = rows.find(value => value.id === row.id);
  expect(merged).toMatchObject({path: row.path, module: row.module, capability: row.capability, variants: row.variants, active: true});
  expect(merged.menuIds).toEqual(expect.arrayContaining(["server:menu", "app:ChatRoom", "app:ChatWatch"]));
  expect(merged.surfaces).toEqual(expect.arrayContaining(["admin", "app"]));
  expect(merged.optimizations.map(item => item.id)).toContain("peer-photo");
});

test("feature API selection, error emphasis and registration counts use the same rows", () => {
  const rows = registryRows(snapshot);
  const items = summarizeUpdates(rows);
  expect(items.filter(item => item.kind === "feature")).toHaveLength(10);
  expect(items.filter(item => item.kind === "optimization")).toHaveLength(8);
  expect(items.find(item => item.id === "home-companion")).toMatchObject({apiCount: 3, registeredCount: 1, pendingCount: 2, clientErrorCount: 2});
  expect(items.find(item => item.id === "groups")).toMatchObject({registeredCount: 0, stage: "backend_pending"});
  expect(filterRegistryRows(rows, {updateId: "home-companion"})).toHaveLength(3);
  expect(filterRegistryRows(rows, {query: "홈에서 대화·약속"})).toHaveLength(3);
  expect(filterRegistryRows(rows, {updateId: "home-companion", errorsOnly: true})).toHaveLength(1);
  expect(buildMenuRelations(rows, evidence.menus).find(menu => menu.id === "app:Home")).toMatchObject({activeApiCount: 1, clientErrorCount: 2});
});

test("unavailable error monitoring is never reported as zero in feature summaries", () => {
  expect(summarizeUpdates(registryRows({})).every(item => item.clientErrorCount === null)).toBe(true);
});

test("catalog references resolve exactly once with stable ids and no duplicate DIRECT scope contracts", () => {
  const rows = registryRows({});
  expect(new Set(rows.map(routeKey)).size).toBe(rows.length);
  expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
  for (const item of [...updates.features, ...updates.optimizations]) {
    expect(summarizeUpdates(rows).find(value => value.id === item.id).apiCount).toBe(item.routeKeys.length);
  }
  expect(rows.some(row => row.path.includes("{scope}"))).toBe(false);
  expect(rows.filter(row => row.path.startsWith("/api/chat/live/DIRECT/")).every(row => !row.active)).toBe(true);
});

// The server and reviewed client can call the same parameter by different names.
test("parameter aliases retain runtime metrics and client error emphasis", () => {
  const server = {method: "GET", path: "/api/chat/rooms/{id}", module: "social"};
  const report = {...failure, path: "/api/chat/rooms/{roomId}"};
  const rows = registryRows({activeRoutes: [server], runtimeMetrics: [{...server, path: report.path, status: 500, requestCount: 2, totalTimeMs: 100}], clientErrors: {...snapshot.clientErrors, rows: [report]}});
  expect(rows.find(row => row.path === server.path)).toMatchObject({active: true, requestCount: 2, averageMs: 50, errorRate: 1, clientErrorCount: 2, clientErrorSeverity: "critical"});
});
