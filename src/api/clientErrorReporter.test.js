import {createClientErrorReporter, createRouteMatcher} from "./clientErrorReporter";

const BASE = "https://api.example.invalid";
const COLLECTOR = "/api/monitoring/client-errors";
const DAY = 24 * 60 * 60 * 1000;
const reporters = [];
let counter = 0;
const id = () => `00000000-0000-4000-8000-${(++counter).toString(16).padStart(12, "0")}`;
const owned = [
  {method: "GET", path: "/api/users/{username}"},
  {method: "GET", path: "/api/users/me"},
  {method: "GET", path: "/api/users/{username}/stats"},
  {method: "POST", path: "/api/auth/login"},
  {method: "POST", path: COLLECTOR},
];
const fail = (overrides = {}) => ({method: "GET", path: "/api/users/PRIVATE_ACCOUNT?token=QUERY_SECRET", error: {status: 503, code: "HTTP_ERROR", message: "PRIVATE_MESSAGE", payload: {password: "BODY_SECRET"}}, ...overrides});
function acknowledgement(events, {status = 202, accepted = events.length, duplicates = 0} = {}) {
  return {status, json: async () => ({success: true, data: {accepted, duplicates}})};
}
function reporter(options = {}) {
  const result = createClientErrorReporter({baseUrl: BASE, catalog: owned, createId: id,
    fetchImpl: jest.fn(async (_url, init) => acknowledgement(JSON.parse(init.body).events)), ...options});
  reporters.push(result);
  return result;
}
async function settle() {for (let i = 0; i < 16; i++) await Promise.resolve();}
async function advance(ms) {jest.advanceTimersByTime(ms); await settle();}
beforeEach(() => {jest.useFakeTimers("modern"); counter = 0;});
afterEach(() => {reporters.splice(0).forEach(value => value.stop()); jest.useRealTimers();});

describe("owned API route privacy boundary", () => {
  test.each([
    ["GET", "/api/users/me?token=QUERY_SECRET", "/api/users/me"],
    ["GET", "api/users/me?token=QUERY_SECRET", "/api/users/me"],
    ["get", `${BASE}/api/users/person`, "/api/users/{username}"],
    ["GET", "/api/users/%ED%91%B8%ED%91%B8%ED%91%B8%EB%9E%9C%EB%93%9C", "/api/users/{username}"],
    ["GET", "/api/users/person/stats", "/api/users/{username}/stats"],
    ["POST", "/api/auth/login", "/api/auth/login"],
  ])("uses a specific owned template for %s %s", (method, path, expected) => {
    expect(createRouteMatcher(owned, BASE)(method, path)).toEqual({method: method.toUpperCase(), path: expected});
  });
  test.each([
    "https://attacker.invalid/api/users/me",
    "https://api.example.invalid.attacker.invalid/api/users/me",
    "https://username@api.example.invalid/api/users/me",
    "https://username:password@api.example.invalid/api/users/me",
    "/api/users/person/../me",
    "/api/users/%2E%2E/me",
    "/api/users/person%2Fstats",
    "/api/users/person%5Cstats",
    "/api/users/person%00",
    "/api/users/%ZZ",
    "/api/users/\\me",
    "/api/users//person",
    "/api/users/ person",
    "/unknown/PRIVATE_ACCOUNT",
    COLLECTOR,
  ])("drops unsafe or unowned URL %s", path => {
    expect(createRouteMatcher(owned, BASE)("GET", path)).toBeNull();
  });
  test("honors method and excludes collector POST and indistinguishable variables", () => {
    const match = createRouteMatcher(owned, BASE);
    expect(match("DELETE", "/api/users/person")).toBeNull();
    expect(match("POST", COLLECTOR)).toBeNull();
    expect(createRouteMatcher([{method: "GET", path: "/api/users/{name}"}, {method: "GET", path: "/api/users/{username}"}], BASE)("GET", "/api/users/person")).toBeNull();
  });
});

describe("anonymous bounded error reporter", () => {
  test("sends exactly six permitted fields and no request, account, payload, header or timestamp", async () => {
    const fetchImpl = jest.fn(async (_url, init) => acknowledgement(JSON.parse(init.body).events));
    const queue = reporter({fetchImpl});
    const error = fail();
    expect(queue.enqueue(error)).toBe(true);
    await queue.flush();
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(`${BASE}${COLLECTOR}`);
    expect(init.credentials).toBe("omit");
    expect(init.redirect).toBe("error");
    expect(init.cache).toBe("no-store");
    expect(init.headers).toEqual({Accept: "application/json", "Content-Type": "application/json"});
    const event = JSON.parse(init.body).events[0];
    expect(Object.keys(event).sort()).toEqual(["client", "eventId", "kind", "method", "path", "status"]);
    expect(event).toEqual({eventId: expect.any(String), method: "GET", path: "/api/users/{username}", kind: "HTTP", status: 503, client: "WEB"});
    ["PRIVATE", "SECRET", "createdAt"].forEach(value => expect(init.body).not.toContain(value));
    expect(error.error.message).toBe("PRIVATE_MESSAGE");
  });
  test.each([["NETWORK_UNAVAILABLE", "NETWORK"], ["NETWORK_TIMEOUT", "TIMEOUT"]])("reports %s without a fabricated HTTP status", async (code, kind) => {
    const fetchImpl = jest.fn(async (_url, init) => acknowledgement(JSON.parse(init.body).events));
    const queue = reporter({fetchImpl});
    queue.enqueue(fail({error: {code}}));
    await queue.flush();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).events[0]).toMatchObject({kind, status: null});
  });
  test("excludes cancellations, session changes, invalid HTTP tuples and invalid IDs", async () => {
    const fetchImpl = jest.fn();
    const queue = reporter({fetchImpl});
    ["REQUEST_CANCELLED", "AUTH_SESSION_CHANGED", "ERR_CANCELED"].forEach(code => expect(queue.enqueue(fail({error: {code, status: 503}}))).toBe(false));
    expect(queue.enqueue(fail({cancelled: true}))).toBe(false);
    [200, 399, 600, 401.5, "503", null].forEach(status => expect(queue.enqueue(fail({error: {status, code: "HTTP_ERROR"}}))).toBe(false));
    expect(queue.enqueue(fail({error: {code: "LOCAL_PARSER_ERROR"}}))).toBe(false);
    const badId = reporter({fetchImpl, createId: () => "invalid"});
    expect(badId.enqueue(fail())).toBe(false);
    const brokenRng = reporter({fetchImpl, createId: () => {throw new Error("native RNG unavailable");}});
    expect(() => brokenRng.enqueue(fail())).not.toThrow();
    await queue.flush();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
  test("caps queue memory at 100 and batches at 20", async () => {
    const fetchImpl = jest.fn(async (_url, init) => acknowledgement(JSON.parse(init.body).events));
    const queue = reporter({fetchImpl});
    for (let i = 0; i < 125; i++) queue.enqueue(fail());
    for (let i = 0; i < 5; i++) await queue.flush();
    const batches = fetchImpl.mock.calls.map(call => JSON.parse(call[1].body).events);
    expect(batches.flat()).toHaveLength(100);
    expect(batches.every(events => events.length <= 20)).toBe(true);
    await queue.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });
  test("expires queue entries at 24 hours and excludes client timestamps from wire events", async () => {
    let clock = 10;
    const fetchImpl = jest.fn(async (_url, init) => acknowledgement(JSON.parse(init.body).events));
    const queue = reporter({fetchImpl, now: () => clock});
    queue.enqueue(fail());
    clock += DAY;
    await queue.flush();
    expect(fetchImpl).not.toHaveBeenCalled();
    queue.enqueue(fail());
    await queue.flush();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).events[0]).not.toHaveProperty("createdAt");
  });
  test.each([
    {status: 200, accepted: 1, duplicates: 0},
    {status: 202, accepted: 0, duplicates: 0},
    {status: 202, accepted: -1, duplicates: 2},
    {status: 202, accepted: 0.5, duplicates: 0.5},
  ])("retains identical event IDs until exact whole-batch 202 acknowledgement (%j)", async invalid => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(acknowledgement([{}], invalid)).mockResolvedValue(acknowledgement([{}], {accepted: 0, duplicates: 1}));
    const queue = reporter({fetchImpl});
    queue.enqueue(fail());
    await queue.flush();
    await advance(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body)).toEqual(JSON.parse(fetchImpl.mock.calls[1][1].body));
    expect(jest.getTimerCount()).toBe(0);
  });
  test("deduplicates a shared final error and retries UUID after ambiguous delivery", async () => {
    const fetchImpl = jest.fn().mockRejectedValueOnce(new TypeError("lost response")).mockResolvedValue(acknowledgement([{}], {accepted: 0, duplicates: 1}));
    const queue = reporter({fetchImpl});
    const shared = fail();
    expect(queue.enqueue(shared)).toBe(true);
    expect(queue.enqueue(shared)).toBe(false);
    await queue.flush();
    await queue.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await advance(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).events).toEqual(JSON.parse(fetchImpl.mock.calls[1][1].body).events);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).events).toHaveLength(1);
  });
  test.each([400, 413])("drops permanent %s rejection without poisoning following events", async status => {
    const fetchImpl = jest.fn().mockResolvedValueOnce({status}).mockImplementation(async (_url, init) => acknowledgement(JSON.parse(init.body).events));
    const queue = reporter({fetchImpl});
    for (let i = 0; i < 21; i++) queue.enqueue(fail());
    await queue.flush();
    await queue.flush();
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).events).toHaveLength(20);
    expect(JSON.parse(fetchImpl.mock.calls[1][1].body).events).toHaveLength(1);
    expect(jest.getTimerCount()).toBe(0);
  });
  test("retains events added during an in-flight batch", async () => {
    let finish;
    const fetchImpl = jest.fn().mockImplementationOnce(() => new Promise(resolve => {finish = resolve;})).mockImplementation(async (_url, init) => acknowledgement(JSON.parse(init.body).events));
    const queue = reporter({fetchImpl});
    queue.enqueue(fail());
    const pending = queue.flush();
    await settle();
    queue.enqueue(fail());
    finish(acknowledgement([{}]));
    await pending;
    await queue.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).events[0].eventId).not.toBe(JSON.parse(fetchImpl.mock.calls[1][1].body).events[0].eventId);
  });
  test("does not retain a stuck running promise when fetch throws synchronously", async () => {
    const fetchImpl = jest.fn().mockImplementationOnce(() => {throw new TypeError("sync transport failure");}).mockResolvedValue(acknowledgement([{}]));
    const queue = reporter({fetchImpl});
    queue.enqueue(fail());
    await queue.flush();
    await advance(2000);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });
  test("limits background retries to three and wakes on actual traffic without bypassing backoff", async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new TypeError("offline"));
    const queue = reporter({fetchImpl});
    queue.enqueue(fail());
    await queue.flush();
    for (let i = 0; i < 20; i++) queue.wake();
    await queue.flush();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    await advance(2000);
    await advance(10000);
    await advance(60000);
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(jest.getTimerCount()).toBe(0);
    await advance(60000);
    fetchImpl.mockResolvedValue(acknowledgement([{}]));
    queue.wake();
    await advance(250);
    expect(fetchImpl).toHaveBeenCalledTimes(5);
    expect(jest.getTimerCount()).toBe(0);
  });
  test("abort timeout and stop leave no rescheduled timers or telemetry recursion", async () => {
    let signal;
    const fetchImpl = jest.fn((_url, init) => {signal = init.signal; return new Promise((_resolve, reject) => init.signal.addEventListener("abort", () => reject(new Error("aborted"))));});
    const queue = reporter({fetchImpl});
    queue.enqueue(fail());
    const pending = queue.flush();
    await settle();
    queue.stop();
    expect(signal.aborted).toBe(true);
    await pending;
    await advance(24 * DAY);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(0);
  });
  test("stopping before the flush microtask prevents even the first network dispatch", async () => {
    const fetchImpl = jest.fn(async (_url, init) => acknowledgement(JSON.parse(init.body).events));
    const queue = reporter({fetchImpl});
    queue.enqueue(fail());
    const pending = queue.flush();
    queue.stop();
    await pending;
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
