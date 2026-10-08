const COLLECTOR = "/api/monitoring/client-errors";
const REGISTRY = "/api/admin/api-registry";
const SUMMARY = "/api/admin/dashboard/summary";
const ME = "/api/users/me";
let modules;
const originalCrypto = Object.getOwnPropertyDescriptor(globalThis, "crypto");
let eventCounter = 0;
function jsonResponse(status, payload) {
  return {ok: status >= 200 && status < 300, status, headers: {get: () => "application/json"}, json: async () => payload};
}
function accepted(init) {return jsonResponse(202, {success: true, data: {accepted: JSON.parse(init.body).events.length, duplicates: 0}});}
function pathOf(url) {return new URL(url, "http://localhost").pathname;}
async function settle() {for (let i = 0; i < 24; i++) await Promise.resolve();}
async function advance(ms) {jest.advanceTimersByTime(ms); await settle();}
async function setup(fetchImplementation) {
  global.fetch.mockImplementation(fetchImplementation);
  modules = await import("./client");
  return modules;
}
const reportCalls = () => global.fetch.mock.calls.filter(call => pathOf(call[0]) === COLLECTOR);
beforeEach(() => {
  jest.resetModules(); jest.useFakeTimers("modern"); global.fetch = jest.fn(); eventCounter = 0;
  Object.defineProperty(globalThis, "crypto", {configurable: true, value: {
    randomUUID: () => `00000000-0000-4000-8000-${(++eventCounter).toString(16).padStart(12, "0")}`,
  }});
});
afterEach(async () => {
  const {stopClientErrorReporting} = await import("./clientErrorReporter");
  stopClientErrorReporting();
  jest.useRealTimers();
  delete global.fetch;
  if (originalCrypto) Object.defineProperty(globalThis, "crypto", originalCrypto);
  else delete globalThis.crypto;
  modules = null;
});

test("records a final HTTP error privately with exactly six fields and keeps the original user rejection", async () => {
  const {default: api, setAuthSession} = await setup(async (url, init) => pathOf(url) === COLLECTOR ? accepted(init) : jsonResponse(503, {message: "PRIVATE server rejection", data: {password: "BODY_SECRET"}}));
  setAuthSession("ACCESS_SECRET", "REFRESH_SECRET");
  await expect(api.get(ME, {query: {email: "QUERY_SECRET"}})).rejects.toMatchObject({status: 503, message: "PRIVATE server rejection"});
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await advance(250);
  expect(reportCalls()).toHaveLength(1);
  const init = reportCalls()[0][1];
  expect(init.credentials).toBe("omit");
  expect(init.headers.Authorization).toBeUndefined();
  const event = JSON.parse(init.body).events[0];
  expect(Object.keys(event).sort()).toEqual(["client", "eventId", "kind", "method", "path", "status"]);
  expect(event).toMatchObject({method: "GET", path: ME, kind: "HTTP", status: 503, client: "WEB"});
  ["PRIVATE", "BODY_SECRET", "QUERY_SECRET", "ACCESS_SECRET", "REFRESH_SECRET"].forEach(value => expect(init.body).not.toContain(value));
});

test("does not count a recovered 401 and preserves the existing token refresh and retried success", async () => {
  let requests = 0;
  const {default: api, setAuthSession, registerAuthSessionRefreshHandler} = await setup(async url => {
    if (pathOf(url) === "/api/auth/refresh") return jsonResponse(200, {data: {accessToken: "new-access", refreshToken: "new-refresh"}});
    return ++requests === 1 ? jsonResponse(401, {}) : jsonResponse(200, {data: {ready: true}});
  });
  const refreshed = jest.fn();
  setAuthSession("old-access", "old-refresh");
  registerAuthSessionRefreshHandler(refreshed);
  await expect(api.get(SUMMARY)).resolves.toEqual({data: {ready: true}});
  await advance(250);
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect(reportCalls()).toHaveLength(0);
  expect(refreshed).toHaveBeenCalledWith({accessToken: "new-access", refreshToken: "new-refresh"});
  expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe("Bearer new-access");
});

test("records the final refreshed endpoint 401 once before clearing the authenticated session", async () => {
  const {default: api, setAuthSession, registerAuthFailureHandler} = await setup(async (url, init) => {
    if (pathOf(url) === COLLECTOR) return accepted(init);
    if (pathOf(url) === "/api/auth/refresh") return jsonResponse(200, {data: {accessToken: "new-access", refreshToken: "new-refresh"}});
    return jsonResponse(401, {message: "still unauthorized"});
  });
  const authFailed = jest.fn();
  setAuthSession("old-access", "old-refresh");
  registerAuthFailureHandler(authFailed);
  await expect(api.get(SUMMARY)).rejects.toMatchObject({status: 401});
  expect(authFailed).toHaveBeenCalledTimes(1);
  await advance(250);
  expect(reportCalls()).toHaveLength(1);
  expect(JSON.parse(reportCalls()[0][1].body).events).toEqual([expect.objectContaining({path: SUMMARY, status: 401})]);
});

test("records terminal access-only 401 before logout and guest 401 without altering login behavior", async () => {
  const {default: api, setAuthSession, registerAuthFailureHandler} = await setup(async (url, init) => pathOf(url) === COLLECTOR ? accepted(init) : jsonResponse(401, {}));
  const authFailed = jest.fn();
  setAuthSession("access", null);
  registerAuthFailureHandler(authFailed);
  await expect(api.get(ME)).rejects.toMatchObject({status: 401});
  expect(authFailed).toHaveBeenCalledTimes(1);
  await expect(api.get(ME)).rejects.toMatchObject({status: 401});
  await advance(250);
  expect(reportCalls()).toHaveLength(1);
  expect(JSON.parse(reportCalls()[0][1].body).events).toHaveLength(2);
  expect(global.fetch.mock.calls.some(call => pathOf(call[0]) === "/api/auth/refresh")).toBe(false);
});

test("shares one failed refresh event across concurrent request failures", async () => {
  let finishRefresh;
  let signalRefreshStarted;
  const started = new Promise(resolve => {signalRefreshStarted = resolve;});
  const {default: api, setAuthSession} = await setup(async (url, init) => {
    if (pathOf(url) === COLLECTOR) return accepted(init);
    if (pathOf(url) === "/api/auth/refresh") {
      signalRefreshStarted();
      return new Promise(resolve => {finishRefresh = resolve;});
    }
    return jsonResponse(401, {});
  });
  setAuthSession("access", "refresh-secret");
  const outcomes = Promise.all([api.get(ME).catch(error => error), api.get(SUMMARY).catch(error => error)]);
  await started;
  finishRefresh(jsonResponse(503, {message: "refresh failed"}));
  expect((await outcomes).every(error => error.status === 503)).toBe(true);
  await advance(250);
  expect(global.fetch.mock.calls.filter(call => pathOf(call[0]) === "/api/auth/refresh")).toHaveLength(1);
  expect(JSON.parse(reportCalls()[0][1].body).events).toEqual([expect.objectContaining({method: "POST", path: "/api/auth/refresh", status: 503})]);
});

test.each(["NETWORK_UNAVAILABLE", "NETWORK_TIMEOUT"])("records final refresh %s once and leaves tokens available", async code => {
  const {default: api, setAuthSession, registerAuthFailureHandler} = await setup(async (url, init) => {
    if (pathOf(url) === COLLECTOR) return accepted(init);
    if (pathOf(url) === "/api/auth/refresh") {
      if (code === "NETWORK_UNAVAILABLE") throw new TypeError("Failed to fetch");
      return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("timeout"))));
    }
    return jsonResponse(401, {});
  });
  const authFailed = jest.fn();
  registerAuthFailureHandler(authFailed);
  setAuthSession("access", "refresh");
  const outcome = api.get(ME).catch(error => error);
  if (code === "NETWORK_TIMEOUT") {await settle(); await advance(20000);}
  expect(await outcome).toMatchObject({code});
  await advance(250);
  expect(authFailed).not.toHaveBeenCalled();
  expect(JSON.parse(reportCalls()[0][1].body).events).toEqual([expect.objectContaining({path: "/api/auth/refresh", kind: code === "NETWORK_TIMEOUT" ? "TIMEOUT" : "NETWORK", status: null})]);
  global.fetch.mockResolvedValue(jsonResponse(200, {}));
  await api.get(ME);
  expect(global.fetch.mock.calls[global.fetch.mock.calls.length - 1][1].headers.Authorization).toBe("Bearer access");
});

test("excludes cancelled requests and late HTTP failures after an account switch", async () => {
  let finish;
  let signalStarted;
  const began = new Promise(resolve => {signalStarted = resolve;});
  const {default: api, setAuthSession} = await setup(async (_url, init) => {
    signalStarted();
    return new Promise((resolve, reject) => {finish = resolve; init.signal.addEventListener("abort", () => reject(new Error("abort")));});
  });
  setAuthSession("old-access", "old-refresh");
  const abort = new AbortController();
  const cancelled = api.get(ME, {signal: abort.signal}).catch(error => error);
  await began;
  abort.abort();
  expect(await cancelled).toMatchObject({code: "REQUEST_CANCELLED"});
  const stale = api.get(SUMMARY).catch(error => error);
  await settle();
  setAuthSession("new-access", "new-refresh");
  finish(jsonResponse(503, {}));
  expect(await stale).toMatchObject({status: 503});
  await advance(250);
  expect(reportCalls()).toHaveLength(0);
});

test("collector 401 never triggers main refresh/logout or recursively reports itself", async () => {
  const {default: api, setAuthSession, registerAuthFailureHandler} = await setup(async url => jsonResponse(pathOf(url) === COLLECTOR ? 401 : 503, {}));
  const authFailed = jest.fn();
  registerAuthFailureHandler(authFailed);
  setAuthSession("member-access", "member-refresh");
  await expect(api.get(REGISTRY)).rejects.toMatchObject({status: 503});
  await advance(250);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(authFailed).not.toHaveBeenCalled();
  expect(global.fetch.mock.calls.some(call => pathOf(call[0]) === "/api/auth/refresh")).toBe(false);
});

test("success returns immediately while telemetry is still in flight", async () => {
  let finishReport;
  const {default: api} = await setup(async (url, init) => {
    if (pathOf(url) === COLLECTOR) return new Promise(resolve => {finishReport = () => resolve(accepted(init));});
    if (pathOf(url) === REGISTRY) return jsonResponse(503, {});
    return jsonResponse(200, {data: {available: true}});
  });
  await expect(api.get(REGISTRY)).rejects.toMatchObject({status: 503});
  await advance(250);
  await expect(api.get(SUMMARY)).resolves.toEqual({data: {available: true}});
  expect(reportCalls()).toHaveLength(1);
  finishReport();
  await settle();
});

test("a real successful API request wakes the reporter after three failed automatic retries", async () => {
  let reportAttempts = 0;
  const {default: api} = await setup(async (url, init) => {
    if (pathOf(url) === COLLECTOR) {
      if (++reportAttempts <= 4) throw new TypeError("collector offline");
      return accepted(init);
    }
    return pathOf(url) === REGISTRY ? jsonResponse(503, {}) : jsonResponse(200, {data: {available: true}});
  });
  await expect(api.get(REGISTRY)).rejects.toMatchObject({status: 503});
  await advance(0);
  await advance(2000);
  await advance(10000);
  await advance(60000);
  expect(reportCalls()).toHaveLength(4);
  expect(jest.getTimerCount()).toBe(0);
  await advance(60000);
  await expect(api.get(SUMMARY)).resolves.toEqual({data: {available: true}});
  await advance(0);
  expect(reportCalls()).toHaveLength(5);
  expect(JSON.parse(reportCalls()[0][1].body).events).toEqual(JSON.parse(reportCalls()[4][1].body).events);
  expect(jest.getTimerCount()).toBe(0);
});

test("classifies a malformed error response body by its actual HTTP503 instead of network failure", async () => {
  const {default: api} = await setup(async (url, init) => {
    if (pathOf(url) === COLLECTOR) return accepted(init);
    return {...jsonResponse(503, null), json: async () => {throw new SyntaxError("PRIVATE response content");}};
  });
  await expect(api.get(REGISTRY)).rejects.toMatchObject({status: 503, code: "HTTP_ERROR"});
  await advance(250);
  expect(reportCalls()).toHaveLength(1);
  const report = reportCalls()[0][1];
  expect(JSON.parse(report.body).events).toEqual([expect.objectContaining({path: REGISTRY, kind: "HTTP", status: 503})]);
  expect(report.body).not.toContain("PRIVATE");
});

test("excludes an invalid successful response body from network and HTTP failure reports", async () => {
  const {default: api} = await setup(async () => ({...jsonResponse(200, null), json: async () => {throw new SyntaxError("PRIVATE successful content");}}));
  await expect(api.get(SUMMARY)).rejects.toMatchObject({status: 200, code: "RESPONSE_PARSE_FAILED"});
  await advance(250);
  expect(reportCalls()).toHaveLength(0);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});

test("a malformed intermediate401 still recovers through refresh without creating a false API failure", async () => {
  let requests = 0;
  const {default: api, setAuthSession, registerAuthFailureHandler} = await setup(async url => {
    if (pathOf(url) === "/api/auth/refresh") return jsonResponse(200, {data: {accessToken: "new-access", refreshToken: "new-refresh"}});
    if (++requests === 1) return {...jsonResponse(401, null), json: async () => {throw new SyntaxError("invalid401 body");}};
    return jsonResponse(200, {data: {ready: true}});
  });
  const authFailed = jest.fn();
  setAuthSession("access", "refresh");
  registerAuthFailureHandler(authFailed);
  await expect(api.get(ME)).resolves.toEqual({data: {ready: true}});
  await advance(250);
  expect(authFailed).not.toHaveBeenCalled();
  expect(reportCalls()).toHaveLength(0);
  expect(global.fetch).toHaveBeenCalledTimes(3);
});
