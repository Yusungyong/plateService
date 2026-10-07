const DEFAULT_HEADERS = {
  Accept: "application/json",
};

const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || "http://localhost:8090").trim();

class ApiError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = "ApiError";
    this.status = options.status || 0;
    this.code = options.code || "API_ERROR";
    this.payload = options.payload;
  }
}

let authToken = null;
let refreshToken = null;
let refreshPromise = null;
let sessionVersion = 0;
let authFailureHandler = null;
let authSessionRefreshHandler = null;

function setAuthSession(nextAccessToken, nextRefreshToken) {
  if (authToken !== (nextAccessToken || null) || refreshToken !== (nextRefreshToken || null)) {
    sessionVersion += 1;
    refreshPromise = null;
  }
  authToken = nextAccessToken || null;
  refreshToken = nextRefreshToken || null;
}

function setAuthToken(token) {
  authToken = token || null;
}

function clearAuthToken() {
  authToken = null;
}

function clearAuthSession() {
  sessionVersion += 1;
  refreshPromise = null;
  authToken = null;
  refreshToken = null;
}

function registerAuthFailureHandler(handler) {
  authFailureHandler = typeof handler === "function" ? handler : null;
}

function registerAuthSessionRefreshHandler(handler) {
  authSessionRefreshHandler = typeof handler === "function" ? handler : null;
}

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      });
      return;
    }

    searchParams.append(key, String(value));
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : "";
}

function buildUrl(path, query) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const queryString = buildQueryString(query);

  if (!API_BASE_URL) {
    return `${normalizedPath}${queryString}`;
  }

  return `${API_BASE_URL}${normalizedPath}${queryString}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  if (contentType.startsWith("text/")) {
    return response.text();
  }

  if (response.status === 204) {
    return null;
  }

  return response.blob();
}

function createApiError(response, payload) {
  const message =
    typeof payload === "object" && payload && payload.message
      ? payload.message
      : response.status === 401 ? "로그인이 필요합니다. 다시 로그인해 주세요."
        : response.status === 403 ? "이 작업을 수행할 권한이 없습니다."
        : response.status === 409 ? "정보가 변경됐거나 이미 처리된 요청입니다. 최신 내용을 확인해 주세요."
        : response.status === 429 ? "요청이 많습니다. 잠시 후 다시 시도해 주세요."
        : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";

  return new ApiError(message, {
    status: response.status,
    code:
      typeof payload === "object" && payload && (payload.code || payload.errorCode)
        ? payload.code || payload.errorCode
        : "HTTP_ERROR",
    payload,
  });
}

async function executeRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    query,
    headers,
    withAuth = true,
    signal,
    timeoutMs = body instanceof FormData ? 120000 : 20000,
  } = options;

  const requestHeaders = {
    ...DEFAULT_HEADERS,
    ...headers,
  };

  if (withAuth && authToken) {
    requestHeaders.Authorization = `Bearer ${authToken}`;
  }

  let requestBody = body;

  if (body && !(body instanceof FormData) && typeof body !== "string") {
    requestHeaders["Content-Type"] = "application/json";
    requestBody = JSON.stringify(body);
  }

  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body: method === "GET" || method === "DELETE" ? undefined : requestBody,
    signal: controller.signal,
  });

  const payload = await parseResponse(response);

  return {
    response,
    payload,
  };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError("응답이 늦어지고 있습니다. 저장·접수 여부를 먼저 확인한 뒤 다시 시도해 주세요.", { code: "NETWORK_TIMEOUT" });
    if (signal?.aborted) throw new ApiError("요청이 취소되었습니다.", { code: "REQUEST_CANCELLED" });
    throw new ApiError("서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.", { code: "NETWORK_UNAVAILABLE" });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

async function refreshAuthSession() {
  if (!refreshToken) {
    throw new ApiError("Refresh token is missing.", {
      status: 401,
      code: "AUTH_REFRESH_MISSING",
    });
  }

  if (!refreshPromise) {
    const version = sessionVersion;
    const pendingRefresh = (async () => {
      const { response, payload } = await executeRequest("/api/auth/refresh", {
        method: "POST",
        body: { refreshToken },
        withAuth: false,
      });

      if (!response.ok) {
        throw createApiError(response, payload);
      }

      const nextAccessToken = payload?.data?.accessToken || "";
      const nextRefreshToken = payload?.data?.refreshToken || "";

      if (!nextAccessToken || !nextRefreshToken) {
        throw new ApiError("Refresh response is missing tokens.", {
          status: 401,
          code: "AUTH_REFRESH_INVALID",
          payload,
        });
      }

      if (version !== sessionVersion) {
        throw new ApiError("Session changed during refresh.", { code: "AUTH_SESSION_CHANGED" });
      }
      authToken = nextAccessToken;
      refreshToken = nextRefreshToken;

      if (authSessionRefreshHandler) {
        authSessionRefreshHandler({
          accessToken: nextAccessToken,
          refreshToken: nextRefreshToken,
        });
      }

      return {
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      };
    })().finally(() => {
      if (refreshPromise === pendingRefresh) refreshPromise = null;
    });
    refreshPromise = pendingRefresh;
  }

  return refreshPromise;
}

async function request(path, options = {}) {
  const version = sessionVersion;
  const hadAuthSession = Boolean(authToken || refreshToken);
  const { response, payload } = await executeRequest(path, options);

  if (response.ok) {
    return payload;
  }

  const error = createApiError(response, payload);
  if (version !== sessionVersion) throw error;
  const shouldRefresh =
    options.withAuth !== false &&
    !options._retry &&
    response.status === 401;

  if (shouldRefresh && refreshToken) {
    try {
      await refreshAuthSession();
      if (version !== sessionVersion) {
        throw new ApiError("Session changed during refresh.", { code: "AUTH_SESSION_CHANGED" });
      }
      return request(path, { ...options, _retry: true });
    } catch (refreshError) {
      if (version !== sessionVersion) throw refreshError;
      if (["NETWORK_UNAVAILABLE", "NETWORK_TIMEOUT", "REQUEST_CANCELLED"].includes(refreshError.code)) throw refreshError;
      clearAuthSession();

      if (authFailureHandler) {
        authFailureHandler(refreshError);
      }

      throw refreshError;
    }
  }

  if (response.status === 401 && options.withAuth !== false && hadAuthSession) {
    clearAuthSession();

    if (authFailureHandler) {
      authFailureHandler(error);
    }
  }

  throw error;
}

const apiClient = {
  request,
  get(path, options = {}) {
    return request(path, { ...options, method: "GET" });
  },
  post(path, body, options = {}) {
    return request(path, { ...options, method: "POST", body });
  },
  put(path, body, options = {}) {
    return request(path, { ...options, method: "PUT", body });
  },
  patch(path, body, options = {}) {
    return request(path, { ...options, method: "PATCH", body });
  },
  delete(path, options = {}) {
    return request(path, { ...options, method: "DELETE" });
  },
};

export {
  ApiError,
  API_BASE_URL,
  buildQueryString,
  clearAuthSession,
  clearAuthToken,
  registerAuthFailureHandler,
  registerAuthSessionRefreshHandler,
  request,
  setAuthSession,
  setAuthToken,
};
export default apiClient;
