import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import App from "./App";
import { adminNavigationItems, adminRoutes, getAdminEntryPath } from "./config/routes";
import consumers from "./admin/api/apiRegistryConsumers.json";
import errorRoutes from "./api/clientErrorRoutes.json";

jest.mock("./admin/pages/AdminDashboard", () => () => <h1>검증용 운영 대시보드</h1>);

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

test.each([
  "/how-to?utm_source=instagram#old",
  "/how-to/previous-post?visit_id=example",
  "/go/previous-campaign?visitor=example#old",
  "/marketing/instagram/callback/?code=example&state=example#old",
])("retired public link %s returns to the homepage without tracking data", async (path) => {
  window.history.replaceState({}, "", path);
  render(<App />);
  expect(await screen.findByRole("heading", { level: 1, name: /오늘의 맛있는 발견/ })).toBeInTheDocument();
  await waitFor(() => expect(window.location.pathname).toBe("/"));
  expect(window.location.search).toBe("");
  expect(window.location.hash).toBe("");
  expect(screen.getAllByRole("link", { name: "App Store에서 접시 다운로드 (새 창)" })).toHaveLength(2);
  expect(screen.getAllByRole("link", { name: "Google Play에서 접시 다운로드 (새 창)" })).toHaveLength(2);
});

test("old admin bookmark still requires authentication", async () => {
  window.history.replaceState({}, "", "/admin/marketing?tab=studio");
  render(<App />);
  await waitFor(() => expect(window.location.pathname).toBe("/login"));
  expect(screen.queryByRole("heading", { name: "검증용 운영 대시보드" })).not.toBeInTheDocument();
});

test.each(["su12ng", "another-admin"])("old admin bookmark goes to the permitted entry for %s", async (sub) => {
  const payload = window.btoa(JSON.stringify({ sub, roles: ["ADMIN"], exp: Math.floor(Date.now() / 1000) + 3600 }));
  localStorage.setItem("plate-service.auth", JSON.stringify({ accessToken: `SYNTHETIC.${payload}.NOT_A_SIGNATURE` }));
  window.history.replaceState({}, "", "/admin/marketing?tab=studio#old");
  render(<App />);
  expect(await screen.findByRole("heading", { name: "검증용 운영 대시보드" })).toBeInTheDocument();
  expect(window.location.pathname).toBe("/admin/dashboard");
  expect(window.location.search).toBe("");
  expect(window.location.hash).toBe("");
  expect(screen.queryByRole("link", { name: /마케팅/ })).not.toBeInTheDocument();
});

test("retirement removes active menu/API consumers while preserving twelve operational destinations", () => {
  expect(adminNavigationItems).toHaveLength(12);
  expect([...adminNavigationItems, ...adminRoutes].some(route => route.path.includes("marketing"))).toBe(false);
  expect(errorRoutes.some(route => route.path.includes("/marketing"))).toBe(false);
  expect(consumers.routes.some(route => route.path.includes("/marketing"))).toBe(false);
  expect(consumers.menus.some(menu => menu.route?.includes("/marketing"))).toBe(false);
  expect(getAdminEntryPath({ accountSubject: "limited-admin", roles: ["ADMIN"], permissions: ["ADMIN_ACCESS", "FAQ_MANAGE"] })).toBe("/admin/faq");
});
