import routeCatalog from "./clientErrorRoutes.json";

const COLLECTOR_PATH = "/api/monitoring/client-errors";
const DAY_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const unsafeCharacters = value => /[\\\s]/.test(value) || [...value].some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127);

export function createRouteMatcher(catalog = routeCatalog, baseUrl = "") {
  const base = new URL(baseUrl || "/", typeof window === "undefined" ? "http://localhost" : window.location.origin);
  const routes = catalog.filter(route => route.path !== COLLECTOR_PATH).map(route => ({...route,
    literal: !route.path.includes("{"),
    specificity: route.path.replace(/\{[^}]+\}/g, "").length,
    pattern: new RegExp(`^${route.path.split(/(\{[^}]+\})/).map(part => part.startsWith("{") ? "[^/]+" : escape(part)).join("")}$`),
  })).sort((a, b) => Number(b.literal) - Number(a.literal) || b.specificity - a.specificity || a.path.localeCompare(b.path));
  return (method, input) => {
    if (typeof input !== "string" || typeof method !== "string") return null;
    try {
      if (unsafeCharacters(input) || input.startsWith("//")) return null;
      const absolute = /^https?:\/\//.test(input);
      if (!absolute && /^[a-z][a-z\d+.-]*:/i.test(input)) return null;
      const rawPath = absolute ? (input.match(/^https?:\/\/[^/?#]+([^?#]*)/)?.[1] || "/") : `/${input.split(/[?#]/)[0].replace(/^\//, "")}`;
      const decoded = rawPath.split("/").map(segment => decodeURIComponent(segment));
      if (decoded.some(segment => segment === "." || segment === ".." || unsafeCharacters(segment) || /[/%]/.test(segment))) return null;
      const url = new URL(input.startsWith("/") || /^https?:\/\//.test(input) ? input : `/${input}`, base);
      if (url.origin !== base.origin || url.username || url.password) return null;
      const path = decoded.join("/");
      if (!/^\/[\p{L}\p{N}_.~/-]+$/u.test(path) || path.includes("//")) return null;
      const matching = routes.filter(candidate => candidate.method === method.toUpperCase() && candidate.pattern.test(path));
      const route = matching[0];
      if (route && matching.some(candidate => candidate.path !== route.path && candidate.literal === route.literal && candidate.specificity === route.specificity)) return null;
      return route ? {method: route.method, path: route.path} : null;
    } catch (_) {return null;}
  };
}

function randomEventId() {
  const crypto = typeof window === "undefined" ? null : window.crypto;
  if (crypto?.randomUUID) return crypto.randomUUID();
  if (!crypto?.getRandomValues) return null;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Privacy boundary: only owned route templates and bounded enum/count fields leave this module. */
export function createClientErrorReporter({baseUrl = "", fetchImpl = (...args) => fetch(...args),
  now = Date.now, createId = randomEventId, setTimer = setTimeout, clearTimer = clearTimeout, catalog = routeCatalog} = {}) {
  const match = createRouteMatcher(catalog, baseUrl);
  const endpoint = `${baseUrl.replace(/\/$/, "")}${COLLECTOR_PATH}`;
  const queue = [];
  const seen = new WeakSet();
  let timer = null, running = null, stopped = false, attempts = 0, failures = 0, nextAllowedAt = 0, paused = false, cancelActive = null;
  function schedule(delay = 0) {
    if (stopped || paused || timer !== null || running || !queue.length) return;
    timer = setTimer(() => {timer = null; void flush();}, Math.max(delay, nextAllowedAt - now(), 0));
    timer?.unref?.();
  }
  function wake() {
    if (stopped) return;
    if (paused) {paused = false; attempts = 0;}
    schedule();
  }
  function enqueue({method = "GET", path, error, cancelled = false}) {
    try {
      if (stopped || cancelled || !error || seen.has(error)
          || ["REQUEST_CANCELLED", "AUTH_SESSION_CHANGED", "ERR_CANCELED"].includes(error.code)) return false;
      const route = match(method, path);
      if (!route) return false;
      const status = error.status;
      const kind = Number.isInteger(status) && status >= 400 && status <= 599 ? "HTTP" : error.code === "NETWORK_TIMEOUT" ? "TIMEOUT"
        : error.code === "NETWORK_UNAVAILABLE" ? "NETWORK" : null;
      if (!kind) return false;
      while (queue.length && now() - queue[0].createdAt >= DAY_MS) queue.shift();
      if (queue.length >= 100) {seen.add(error); wake(); return false;}
      const eventId = createId();
      if (!UUID.test(eventId || "")) return false;
      queue.push({createdAt: now(), event: {eventId, ...route, kind, status: kind === "HTTP" ? status : null, client: "WEB"}});
      seen.add(error); wake(); return true;
    } catch (_) {return false;}
  }
  function flush() {
    if (stopped) return Promise.resolve();
    if (running) return running;
    if (paused || now() < nextAllowedAt) {schedule(); return Promise.resolve();}
    if (timer !== null) {clearTimer(timer); timer = null;}
    while (queue.length && now() - queue[0].createdAt >= DAY_MS) queue.shift();
    if (!queue.length) return Promise.resolve();
    const batch = queue.slice(0, 20);
    const ids = new Set(batch.map(item => item.event.eventId));
    running = Promise.resolve().then(async () => {
      if (stopped) {running = null; return;}
      const controller = new AbortController();
      let rejectDeadline;
      const deadline = new Promise((_resolve, reject) => {rejectDeadline = reject;});
      const cancel = () => {controller.abort(); rejectDeadline(new Error("Report deadline"));};
      cancelActive = cancel;
      const timeout = setTimer(cancel, 4000);
      let retry = true;
      try {
        const delivered = Promise.resolve().then(async () => {
          const response = await fetchImpl(endpoint, {method: "POST", credentials: "omit", cache: "no-store", redirect: "error",
            headers: {Accept: "application/json", "Content-Type": "application/json"},
            body: JSON.stringify({events: batch.map(item => item.event)}), signal: controller.signal, keepalive: true});
          if (Number.isInteger(response.status) && response.status >= 400 && response.status < 500 && response.status !== 429) return true;
          if (response.status !== 202 || typeof response.json !== "function") return false;
          const acknowledgement = await response.json();
          const {accepted, duplicates} = acknowledgement?.data || {};
          return acknowledgement?.success === true && Number.isInteger(accepted) && accepted >= 0
            && Number.isInteger(duplicates) && duplicates >= 0 && accepted + duplicates === batch.length;
        });
        retry = !(await Promise.race([delivered, deadline]));
        if (!retry) {
          // Permanent 4xx (including obsolete or invalid reports) must not poison the queue.
          for (let index = queue.length - 1; index >= 0; index--) if (ids.has(queue[index].event.eventId)) queue.splice(index, 1);
        }
      } catch (_) {retry = true;}
      finally {
        clearTimer(timeout); cancelActive = null; running = null;
        if (retry) {
          failures += 1; attempts += 1;
          nextAllowedAt = now() + [2000, 10000, 60000][Math.min(failures - 1, 2)];
          paused = attempts >= 4;
        } else {failures = 0; attempts = 0; nextAllowedAt = 0; paused = false;}
        schedule();
      }
    });
    return running;
  }
  function stop() {stopped = true; if (timer !== null) clearTimer(timer); timer = null; cancelActive?.(); queue.length = 0;}
  return {enqueue, flush, wake, stop};
}

let reporter = null;
let pagehide = null;
export function reportClientError(failure) {
  try {
    if (!reporter) {
      reporter = createClientErrorReporter({baseUrl: (process.env.REACT_APP_API_BASE_URL || "http://localhost:8090").trim()});
      pagehide = () => {void reporter?.flush();};
      if (typeof window !== "undefined") window.addEventListener("pagehide", pagehide);
    }
    return reporter.enqueue(failure);
  } catch (_) {return false;}
}
export function stopClientErrorReporting() {
  reporter?.stop(); reporter = null;
  if (typeof window !== "undefined" && pagehide) window.removeEventListener("pagehide", pagehide);
  pagehide = null;
}
export function wakeClientErrorReporting() {try {reporter?.wake();} catch (_) { /* Monitoring never interrupts the caller. */ }}
