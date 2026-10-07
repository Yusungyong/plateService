function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: () => "application/json",
    },
    json: async () => payload,
  };
}

beforeEach(() => {
  jest.resetModules();
  global.fetch = jest.fn();
});

afterEach(() => {
  delete global.fetch;
});

test.each([200, 401])("late refresh response (%s) cannot restore logout or clear a new login", async (status) => {
  const { default: apiClient, clearAuthSession, setAuthSession,
    registerAuthFailureHandler, registerAuthSessionRefreshHandler } = await import("./client");
  const failure = jest.fn();
  const refreshed = jest.fn();
  registerAuthFailureHandler(failure);
  registerAuthSessionRefreshHandler(refreshed);
  let finishRefresh;
  let signalStarted;
  const started = new Promise((resolve) => { signalStarted = resolve; });
  global.fetch
    .mockResolvedValueOnce(jsonResponse(401, {}))
    .mockImplementationOnce(() => {
      signalStarted();
      return new Promise((resolve) => { finishRefresh = resolve; });
    });
  setAuthSession("old-access", "old-refresh");
  const pending = apiClient.get("/api/admin/dashboard");
  const rejected = expect(pending).rejects.toBeDefined();
  await started;
  clearAuthSession();
  if (status === 401) setAuthSession("new-login-access", "new-login-refresh");
  finishRefresh(jsonResponse(status, { data: { accessToken: "late-access", refreshToken: "late-refresh" } }));
  await rejected;
  expect(refreshed).not.toHaveBeenCalled();
  expect(failure).not.toHaveBeenCalled();
  global.fetch.mockResolvedValueOnce(jsonResponse(200, {}));
  await apiClient.get("/api/probe");
  expect(global.fetch.mock.calls[2][1].headers.Authorization)
    .toBe(status === 401 ? "Bearer new-login-access" : undefined);
});

test("refreshes an expired session, publishes new tokens, and retries once", async () => {
  const {
    default: apiClient,
    registerAuthSessionRefreshHandler,
    setAuthSession,
  } = await import("./client");
  const handleSessionRefresh = jest.fn();

  setAuthSession("expired-access", "current-refresh");
  registerAuthSessionRefreshHandler(handleSessionRefresh);

  global.fetch
    .mockResolvedValueOnce(jsonResponse(401, { code: "AUTH_EXPIRED" }))
    .mockResolvedValueOnce(
      jsonResponse(200, {
        data: {
          accessToken: "next-access",
          refreshToken: "next-refresh",
        },
      })
    )
    .mockResolvedValueOnce(jsonResponse(200, { data: { id: 7 } }));

  await expect(apiClient.get("/api/protected")).resolves.toEqual({ data: { id: 7 } });
  expect(handleSessionRefresh).toHaveBeenCalledWith({
    accessToken: "next-access",
    refreshToken: "next-refresh",
  });
  expect(global.fetch).toHaveBeenCalledTimes(3);
  expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe("Bearer next-access");
});


test("times out stalled requests with actionable text", async () => {
  const { default: apiClient } = await import("./client");
  global.fetch.mockImplementation((url, {signal}) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(new Error("aborted")));
  }));
  await expect(apiClient.get("/api/stalled", {timeoutMs: 5})).rejects.toMatchObject({code: "NETWORK_TIMEOUT"});
});

test("network failure during refresh preserves the session for retry", async () => {
  const { default: apiClient, setAuthSession, registerAuthFailureHandler } = await import("./client");
  const failure = jest.fn(); registerAuthFailureHandler(failure);
  setAuthSession("access", "refresh");
  global.fetch.mockResolvedValueOnce(jsonResponse(401, {})).mockRejectedValueOnce(new TypeError("Failed to fetch"));
  await expect(apiClient.get("/api/protected")).rejects.toMatchObject({code: "NETWORK_UNAVAILABLE"});
  expect(failure).not.toHaveBeenCalled();
  global.fetch.mockResolvedValueOnce(jsonResponse(200, {}));
  await apiClient.get("/api/check");
  expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe("Bearer access");
});

test("member inquiries include authentication and guests remain supported", async () => {
  const { setAuthSession, clearAuthSession } = await import("./client");
  const { createQna } = await import("./qnaApi");
  global.fetch.mockResolvedValue(jsonResponse(200, {qnaId: 7}));
  setAuthSession("member-access", "refresh");
  await createQna({question: "test", isPublic: false});
  expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer member-access");
  clearAuthSession();
  await createQna({question: "guest", isPublic: false});
  expect(global.fetch.mock.calls[1][1].headers.Authorization).toBeUndefined();
});
