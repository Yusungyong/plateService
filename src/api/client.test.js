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
