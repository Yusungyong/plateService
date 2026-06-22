import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { registerAuthSessionRefreshHandler } from "../api";
import { AuthProvider, useAuth } from "./AuthContext";

jest.mock("../api", () => ({
  clearAuthSession: jest.fn(),
  registerAuthFailureHandler: jest.fn(),
  registerAuthSessionRefreshHandler: jest.fn(),
  setAuthSession: jest.fn(),
}));

function AuthProbe() {
  const { accessToken, refreshToken } = useAuth();
  return <span>{`${accessToken || "none"}:${refreshToken || "none"}`}</span>;
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  registerAuthSessionRefreshHandler.mockClear();
});

test("keeps React state and browser storage in sync after token rotation", async () => {
  window.localStorage.setItem(
    "plate-service.auth",
    JSON.stringify({
      accessToken: "old-access",
      refreshToken: "old-refresh",
      user: { username: "owner", roles: ["OWNER"] },
    })
  );

  render(
    <AuthProvider>
      <AuthProbe />
    </AuthProvider>
  );

  expect(screen.getByText("old-access:old-refresh")).toBeInTheDocument();
  const refreshHandler = registerAuthSessionRefreshHandler.mock.calls.find(
    ([handler]) => typeof handler === "function"
  )[0];

  act(() => {
    refreshHandler({
      accessToken: "new-access",
      refreshToken: "new-refresh",
    });
  });

  expect(screen.getByText("new-access:new-refresh")).toBeInTheDocument();
  await waitFor(() => {
    expect(JSON.parse(window.localStorage.getItem("plate-service.auth"))).toEqual(
      expect.objectContaining({
        accessToken: "new-access",
        refreshToken: "new-refresh",
      })
    );
  });
});
