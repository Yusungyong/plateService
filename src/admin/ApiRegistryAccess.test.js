import React from "react";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { getAdminEntryPath } from "../config/routes";
import { userCanViewApiRegistry } from "./constants/adminPermissions";
import { getApiRegistry } from "./api/apiRegistryApi";
import { getDashboardSummary } from "./api/adminDashboardApi";
import { fetchFaqs } from "../api/faqApi";

jest.mock("./api/apiRegistryApi", () => ({
  ...jest.requireActual("./api/apiRegistryApi"),
  getApiRegistry: jest.fn(),
}));
jest.mock("./api/adminDashboardApi", () => ({ getDashboardSummary: jest.fn() }));
jest.mock("../api/faqApi", () => ({
  ...jest.requireActual("../api/faqApi"),
  fetchFaqs: jest.fn(),
}));

const STORAGE_KEY = "plate-service.auth";
const PRIVATE_API_PATH = "/api/operator-test/private-content";
const snapshot = {
  declaredBaseline: {
    routes: [{
      id: "operator-only-api",
      method: "GET",
      path: PRIVATE_API_PATH,
      module: "content",
      surfaces: ["app"],
      menuIds: ["app:PrivateOperatorTest"],
    }],
    menus: [{ id: "app:PrivateOperatorTest", label: "운영자 전용 테스트 메뉴" }],
  },
  activeRouteCount: 1,
  activeRoutes: [{ method: "GET", path: PRIVATE_API_PATH, module: "content" }],
  runtimeMetrics: [],
};

function storeSession(claims) {
  const auth = {
    accessToken: `header.${window.btoa(JSON.stringify(claims))}.signature`,
    refreshToken: "test-refresh",
  };
  const value = JSON.stringify(auth);
  window.localStorage.setItem(STORAGE_KEY, value);
  return value;
}

function registryNavLink() {
  const nav = screen.queryByRole("navigation", { name: "운영자 관리 메뉴" });
  if (!nav) return null;
  return within(nav).queryAllByRole("link")
    .find(link => link.getAttribute("href") === "/admin/api-registry") || null;
}

function renderAt(path, claims) {
  if (claims) storeSession(claims);
  window.history.replaceState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  jest.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  getApiRegistry.mockResolvedValue(snapshot);
  getDashboardSummary.mockResolvedValue({
    metrics: [], activityTrends: [], regionDistribution: [], recentActivities: [],
  });
  fetchFaqs.mockResolvedValue({ content: [], totalElements: 0, totalPages: 0 });
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

test.each(["ADMIN", "SUPER_ADMIN", "OPERATOR"])(
  "the exact su12ng account with %s access may view the API registry",
  role => {
    expect(userCanViewApiRegistry({ accountSubject: "su12ng", username: "su12ng", roles: [role] })).toBe(true);
  }
);

test.each([
  { accountSubject: "other-admin", roles: ["ADMIN"] },
  { accountSubject: "other-super-admin", roles: ["SUPER_ADMIN"] },
  { accountSubject: "SU12NG", roles: ["ADMIN"] },
  { accountSubject: "su12ng ", roles: ["ADMIN"] },
  { accountSubject: " su12ng", roles: ["ADMIN"] },
  { accountSubject: "su12ng-test", roles: ["ADMIN"] },
  { accountSubject: "other-admin", username: "su12ng", roles: ["ADMIN"] },
  { accountSubject: "other-admin", displayName: "su12ng", roles: ["ADMIN"] },
  { accountSubject: "other-admin", email: "su12ng", roles: ["SUPER_ADMIN"] },
  { username: "su12ng", roles: ["ADMIN"] },
  { displayName: "su12ng", roles: ["ADMIN"] },
  { email: "su12ng", roles: ["ADMIN"] },
  { accountSubject: "su12ng", roles: ["USER"] },
  { accountSubject: "su12ng", roles: ["ADMIN"], permissions: [] },
  { accountSubject: "su12ng", roles: ["ADMIN"], permissions: ["ADMIN_ACCESS"] },
  null,
])("registry access rejects other identities or insufficient permissions: %j", user => {
  expect(userCanViewApiRegistry(user)).toBe(false);
});

test.each(["ADMIN", "SUPER_ADMIN"])(
  "other %s accounts keep their dashboard but cannot open or see the registry",
  async role => {
    renderAt("/admin/api-registry", { sub: "other-admin", roles: [role] });
    await waitFor(() => expect(window.location.pathname).toBe("/admin/dashboard"));
    await screen.findByRole("heading", { level: 1, name: "대시보드" });
    expect(getDashboardSummary).toHaveBeenCalledTimes(1);
    expect(getApiRegistry).not.toHaveBeenCalled();
    expect(registryNavLink()).toBeNull();
    expect(screen.queryByText(PRIVATE_API_PATH)).not.toBeInTheDocument();
  }
);

test.each([
  ["business owner", { sub: "owner", roles: ["OWNER"], permissions: ["OWNER_ACCESS"] }, "/faq"],
  ["ordinary member named su12ng", { sub: "su12ng", roles: ["USER"] }, "/faq"],
  ["su12ng with explicit empty permissions", { sub: "su12ng", roles: ["ADMIN"], permissions: [] }, "/faq"],
  ["displayName-only admin token", { displayName: "su12ng", roles: ["ADMIN"] }, "/admin/dashboard"],
  ["email-only admin token", { email: "su12ng", roles: ["ADMIN"] }, "/admin/dashboard"],
  ["anonymous visitor", null, "/login"],
])("%s cannot mount the registry or request its API", async (label, claims, destination) => {
  renderAt("/admin/api-registry", claims);
  await waitFor(() => expect(window.location.pathname).toBe(destination));
  expect(getApiRegistry).not.toHaveBeenCalled();
  expect(registryNavLink()).toBeNull();
  expect(screen.queryByText(PRIVATE_API_PATH)).not.toBeInTheDocument();
});

test("su12ng can enter the registry using the username from JWT claims", async () => {
  renderAt("/admin/api-registry", { sub: "su12ng", displayName: "operator", roles: ["ADMIN"] });
  await screen.findByRole("button", { name: `GET ${PRIVATE_API_PATH}` });
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
  expect(window.location.pathname).toBe("/admin/api-registry");
  expect(registryNavLink()).toBeInTheDocument();
  expect(getDashboardSummary).not.toHaveBeenCalled();
});

test("cached user identity cannot replace a missing authenticated JWT subject", async () => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
    accessToken: "opaque-test-token",
    refreshToken: "test-refresh",
    user: { accountSubject: "su12ng", username: "su12ng", roles: ["ADMIN"] },
  }));
  renderAt("/admin/api-registry");
  await waitFor(() => expect(window.location.pathname).toBe("/admin/dashboard"));
  expect(getApiRegistry).not.toHaveBeenCalled();
  expect(registryNavLink()).toBeNull();
});

test("an administrator's displayed su12ng name cannot grant registry access", async () => {
  renderAt("/admin/api-registry", {
    sub: "other-admin", username: "su12ng", displayName: "su12ng", email: "su12ng", roles: ["ADMIN"],
  });
  await waitFor(() => expect(window.location.pathname).toBe("/admin/dashboard"));
  expect(getApiRegistry).not.toHaveBeenCalled();
  expect(registryNavLink()).toBeNull();
});

test("switching from su12ng to another admin removes privileged data and navigation", async () => {
  renderAt("/admin/api-registry", { sub: "su12ng", roles: ["ADMIN"] });
  await screen.findByRole("button", { name: `GET ${PRIVATE_API_PATH}` });
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
  const oldValue = window.localStorage.getItem(STORAGE_KEY);
  const newValue = storeSession({ sub: "other-admin", roles: ["SUPER_ADMIN"] });
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", {
      key: STORAGE_KEY, oldValue, newValue, storageArea: window.localStorage,
    }));
  });
  await waitFor(() => expect(window.location.pathname).toBe("/admin/dashboard"));
  await screen.findByRole("heading", { level: 1, name: "대시보드" });
  expect(screen.queryByRole("button", { name: `GET ${PRIVATE_API_PATH}` })).not.toBeInTheDocument();
  expect(registryNavLink()).toBeNull();
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
  expect(getDashboardSummary).toHaveBeenCalledTimes(1);
});

test("a previous account's pending registry response cannot restore data after a subject switch", async () => {
  let resolveRegistry;
  getApiRegistry.mockImplementationOnce(() => new Promise(resolve => { resolveRegistry = resolve; }));
  renderAt("/admin/api-registry", { sub: "su12ng", username: "shared-display-name", roles: ["ADMIN"] });
  await waitFor(() => expect(getApiRegistry).toHaveBeenCalledTimes(1));
  const oldValue = window.localStorage.getItem(STORAGE_KEY);
  const newValue = storeSession({ sub: "other-admin", username: "shared-display-name", roles: ["ADMIN"] });
  act(() => {
    window.dispatchEvent(new StorageEvent("storage", {
      key: STORAGE_KEY, oldValue, newValue, storageArea: window.localStorage,
    }));
  });
  await waitFor(() => expect(window.location.pathname).toBe("/admin/dashboard"));
  await act(async () => { resolveRegistry(snapshot); });
  expect(registryNavLink()).toBeNull();
  expect(screen.queryByRole("button", { name: `GET ${PRIVATE_API_PATH}` })).not.toBeInTheDocument();
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
});

test("the normal administrator entry remains its permitted dashboard", () => {
  expect(getAdminEntryPath({ accountSubject: "other-admin", username: "other-admin", roles: ["ADMIN"] })).toBe("/admin/dashboard");
  expect(getAdminEntryPath({ accountSubject: "su12ng", username: "su12ng", roles: ["ADMIN"] })).toBe("/admin/dashboard");
});
