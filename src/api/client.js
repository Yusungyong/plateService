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
let authFailureHandler = null;

function setAuthSession(nextAccessToken, nextRefreshToken) {
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
  authToken = null;
  refreshToken = null;
}

function registerAuthFailureHandler(handler) {
  authFailureHandler = typeof handler === "function" ? handler : null;
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
      : `Request failed with status ${response.status}`;

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

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: requestHeaders,
    body: method === "GET" || method === "DELETE" ? undefined : requestBody,
    signal,
  });

  const payload = await parseResponse(response);

  return {
    response,
    payload,
  };
}

async function refreshAuthSession() {
  if (!refreshToken) {
    throw new ApiError("Refresh token is missing.", {
      status: 401,
      code: "AUTH_REFRESH_MISSING",
    });
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
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

      setAuthSession(nextAccessToken, nextRefreshToken);

      return {
        accessToken: nextAccessToken,
        refreshToken: nextRefreshToken,
      };
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function request(path, options = {}) {
  const { response, payload } = await executeRequest(path, options);

  if (response.ok) {
    return payload;
  }

  const error = createApiError(response, payload);
  const shouldRefresh =
    options.withAuth !== false &&
    !options._retry &&
    response.status === 401 &&
    (error.code === "AUTH_402" || error.code === "AUTH_401" || error.code === "HTTP_ERROR");

  if (shouldRefresh && refreshToken) {
    try {
      await refreshAuthSession();
      return request(path, { ...options, _retry: true });
    } catch (refreshError) {
      clearAuthSession();

      if (authFailureHandler) {
        authFailureHandler(refreshError);
      }

      throw refreshError;
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
  request,
  setAuthSession,
  setAuthToken,
};
export default apiClient;
