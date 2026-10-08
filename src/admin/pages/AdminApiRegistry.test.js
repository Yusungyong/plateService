import {fireEvent, render, screen} from "@testing-library/react";
import AdminApiRegistry from "./AdminApiRegistry";
import {registryRows, getApiRegistry} from "../api/apiRegistryApi";
jest.mock("../api/apiRegistryApi", () => ({...jest.requireActual("../api/apiRegistryApi"), getApiRegistry: jest.fn()}));
const snapshot = {
  declaredBaseline: {routes: [{id: "image", method: "POST", path: "/api/images", module: "content", surfaces: ["app"], menuIds: ["editor"]}], menus: [{id: "editor", label: "앱 > 이미지 등록"}]},
  activeRouteCount: 2,
  activeRoutes: [{method: "POST", path: "/api/images", module: "content"}, {method: "GET", path: "/api/admin/api-registry", module: "platform"}],
  runtimeMetrics: [{method: "POST", path: "/api/images", status: "200", requestCount: 8, totalTimeMs: 80}, {method: "POST", path: "/api/images", status: "500", requestCount: 2, totalTimeMs: 40}]
};
beforeEach(() => {jest.clearAllMocks();});
test("combines observed responses without inventing zero metrics for unobserved routes", () => {
  const rows = registryRows(snapshot);
  expect(rows.find(row => row.id === "image")).toMatchObject({requestCount: 10, errorRate: 0.2, averageMs: 12, menuLabels: ["앱 > 이미지 등록"]});
  expect(rows.find(row => row.module === "platform")).toMatchObject({observed: false, requestCount: null, errorRate: null});
});
test("filters by actual menu linkage and shows contract details", async () => {
  getApiRegistry.mockResolvedValue(snapshot);render(<AdminApiRegistry />);
  await screen.findByRole("button", {name: "POST /api/images"});
  expect(screen.getByText("20.0%")).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("검색"), {target: {value: "이미지 등록"}});
  expect(screen.getByText("1개 표시")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "POST /api/images"}));
  expect(screen.getByRole("region", {name: "API 상세"})).toBeInTheDocument();
});
test("allows retry after authorization or network errors", async () => {
  getApiRegistry.mockRejectedValueOnce(new Error("이 작업을 수행할 권한이 없습니다.")).mockResolvedValue(snapshot);
  render(<AdminApiRegistry />);
  fireEvent.click(await screen.findByRole("button", {name: "다시 시도"}));
  await screen.findByRole("button", {name: "POST /api/images"});
});

test("owner accounts cannot enter the admin registry route or load its API", async () => {
  const App = require("../../App").default;
  localStorage.clear();
  const payload = window.btoa(JSON.stringify({sub: "owner", permissions: ["OWNER_ACCESS"]}));
  localStorage.setItem("plate-service.auth", JSON.stringify({accessToken: `${window.btoa('{}')}.${payload}.signature`, refreshToken: "test"}));
  window.history.replaceState({}, "", "/admin/api-registry");
  render(<App />);
  expect(getApiRegistry).not.toHaveBeenCalled();
  localStorage.clear();
});

test("current image set-state menu links replace the legacy toggle UI connection", () => {
  const current = registryRows({declaredBaseline: {routes: [{method: 'POST', path: '/api/image-feeds/{imageFeedId}/likes/toggle', module: 'engagement', surfaces: ['app'], menuIds: ['app:Home']}], menus: [{id: 'app:Home', label: '홈'}]}, activeRoutes: [{method: 'PUT', path: '/api/v3/contents/{kind}/{contentId}/likes/me', module: 'engagement'}]});
  expect(current.find(row => row.method === 'PUT')).toMatchObject({surfaces: ['app'], usageStatus: 'connected_in_source'});
  expect(current.find(row => row.method === 'PUT').menuLabels).toContain('홈');
  expect(current.find(row => row.method === 'POST')).toMatchObject({menuLabels: [], surfaces: [], usageStatus: 'client_wrapper_only'});
});
