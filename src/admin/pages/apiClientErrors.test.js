import {clientErrorState, clientErrorProperties, summarizeClientErrors} from "./apiClientErrors";
import {buildMenuRelations, filterRegistryRows, relationshipGraph} from "./apiRegistryModel";

const window = {available: true, windowHours: 24, windowStart: "2026-10-07T07:00:00Z", windowEnd: "2026-10-08T06:28:00Z"};
const report = (overrides = {}) => ({method: "POST", path: "/api/friends", errorCount: 3, http4xxCount: 1, http5xxCount: 1, networkCount: 1, timeoutCount: 0,
  lastSeenAt: "2026-10-08T06:20:00Z", clients: ["ANDROID", "WEB"], recent: [{kind: "HTTP", status: 500, client: "WEB", count: 1, lastSeenAt: "2026-10-08T06:20:00Z"}], ...overrides});
test("client reports are separate from cumulative process metrics and preserve hourly scope", () => {
  const state = clientErrorState({clientErrors: {...window, rows: [report()]}, runtimeMetrics: [{requestCount: 999, errorCount: 99}]});
  expect(state).toMatchObject({available: true, errorCount: 3, affectedApiCount: 1, windowStart: window.windowStart, windowEnd: window.windowEnd});
  expect(clientErrorProperties(state, "POST", "/api/friends")).toMatchObject({clientErrorCount: 3, clientErrorSeverity: "critical"});
  expect(clientErrorProperties(state, "GET", "/api/users/me")).toMatchObject({clientErrorCount: 0, clientErrorSeverity: "none"});
});
test.each([undefined, {available: false, rows: []}, {...window, rows: null}, {...window, windowHours: 23, rows: []}, {...window, windowStart: null, rows: []}, {...window, rows: [report({errorCount: -1})]}, {...window, rows: [report({errorCount: 4})]}, {...window, rows: [report(), report()]}, {...window, rows: [report({recent: [{kind: "HTTP", status: "500", client: "WEB", count: 1, lastSeenAt: window.windowEnd}]})]}])("missing, unavailable or malformed report data never becomes healthy zero (%j)", clientErrors => {
  const state = clientErrorState({clientErrors});
  expect(state).toMatchObject({available: false, errorCount: null, affectedApiCount: null});
  const row = {method: "GET", path: "/api/users/me", ...clientErrorProperties(state, "GET", "/api/users/me")};
  expect(row.clientErrorCount).toBeNull();
  expect(filterRegistryRows([row], {errorsOnly: true})).toEqual([row]);
});
test("menus and modules aggregate each affected API once, including shared APIs", () => {
  const state = clientErrorState({clientErrors: {...window, rows: [report()]}});
  const row = {id: "friend", method: "POST", path: "/api/friends", module: "social", menuIds: ["one", "one", "two"], ...clientErrorProperties(state, "POST", "/api/friends")};
  expect(summarizeClientErrors([row, row])).toMatchObject({clientErrorCount: 3, affectedApiCount: 1});
  expect(buildMenuRelations([row, row]).filter(menu => menu.apiCount > 0).map(menu => menu.clientErrorCount)).toEqual([3, 3]);
});
test("critical reports outside the first eight API slots lead the graph, then healthy slots fill", () => {
  const rows = Array.from({length: 15}, (_, i) => ({id: String(i), method: "GET", path: `/api/test/${i}`, module: i % 2 ? "content" : "social", clientErrorAvailable: true,
    clientErrorCount: i >= 10 ? i : 0, clientErrorSeverity: i === 14 ? "critical" : i >= 10 ? "warning" : "none"}));
  const graph = relationshipGraph(rows);
  expect(graph.routes).toHaveLength(8);
  expect(graph.routes[0].id).toBe("14");
  expect(graph.routes.slice(0, 5).every(row => row.clientErrorCount > 0)).toBe(true);
  expect(graph.omittedApiCount).toBe(7);
  expect(filterRegistryRows(rows, {errorsOnly: true})).toHaveLength(5);
});
test("when more than eight APIs have errors the diagram prioritizes severity then report counts", () => {
  const rows = Array.from({length: 12}, (_, i) => ({id: String(i), method: "GET", path: `/api/test/${i}`, module: "social", clientErrorAvailable: true,
    clientErrorCount: i + 1, clientErrorSeverity: i === 0 ? "critical" : "warning"}));
  const graph = relationshipGraph(rows);
  expect(graph.routes.map(row => row.id)).toEqual(["0", "11", "10", "9", "8", "7", "6", "5"]);
});
