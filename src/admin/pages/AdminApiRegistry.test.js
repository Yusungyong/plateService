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
  expect(screen.queryByText("20.0%")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "호출 지표 보기"}));
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

test("menu selection keeps graph and table filters aligned without using stale menu counts", async () => {
  getApiRegistry.mockResolvedValue({...snapshot, declaredBaseline: {...snapshot.declaredBaseline, menus: [{id: "editor", label: "앱 > 이미지 등록", apiCount: 99, apiIds: ["removed"]}]}});
  render(<AdminApiRegistry />);
  fireEvent.click(await screen.findByRole("button", {name: "메뉴 앱 > 이미지 등록 1개 API"}));
  expect(screen.getByText("1개 표시")).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "관계도 POST /api/images"})).toBeInTheDocument();
  expect(screen.queryByRole("button", {name: "GET /api/admin/api-registry"})).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("HTTP"), {target: {value: "GET"}});
  expect(screen.getByText("0개 표시")).toBeInTheDocument();
  expect(screen.getByText("연결된 API가 없습니다.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "필터 초기화"}));
  expect(screen.getByText("2개 표시")).toBeInTheDocument();
});

test("relation API opens details and another source menu can be followed", async () => {
  getApiRegistry.mockResolvedValue({...snapshot, declaredBaseline: {routes: [{...snapshot.declaredBaseline.routes[0], menuIds: ["editor", "viewer"]}], menus: [{id: "editor", label: "이미지 등록", source: "Editor.js", sourceLine: 12}, {id: "viewer", label: "이미지 보기", source: "Viewer.js", sourceLine: 24}]}});
  render(<AdminApiRegistry />);
  fireEvent.click(await screen.findByRole("button", {name: "메뉴 이미지 등록 1개 API"}));
  fireEvent.click(screen.getByRole("button", {name: "관계도 POST /api/images"}));
  expect(screen.getByRole("region", {name: "API 상세"})).toBeInTheDocument();
  fireEvent.click(screen.getByText("소스 근거와 요청 형식 보기", {selector: "summary"}));
  expect(screen.getByText("Editor.js:12")).toBeInTheDocument();
  expect(screen.getByText("Viewer.js:24")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "이미지 보기 ↗"}));
  expect(screen.getByRole("button", {name: "메뉴 이미지 보기 1개 API"})).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("1개 표시")).toBeInTheDocument();
});

test("failed refresh clears previous private snapshot instead of leaving stale API details", async () => {
  getApiRegistry.mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("이 작업을 수행할 권한이 없습니다."));
  render(<AdminApiRegistry />);
  await screen.findByRole("button", {name: "POST /api/images"});
  fireEvent.click(screen.getByRole("button", {name: "새로고침"}));
  await screen.findByRole("alert");
  expect(screen.queryByRole("button", {name: "POST /api/images"})).not.toBeInTheDocument();
});

test("structure tab is keyboard navigable and displays backend completion and pending scope", async () => {
  getApiRegistry.mockResolvedValue({...snapshot, architecture: {servicePortCount: 1, modules: [{id: "content", portCount: 1, commandMethodCount: 1, queryMethodCount: 1, ports: []}], dependencies: [], progress: [{id: "foundation", label: "업무 분리", status: "complete", detail: "호환 기반 완료"}, {id: "dto", label: "DTO 분리", status: "pending", detail: "후속 검증 필요"}]}});
  render(<AdminApiRegistry />);
  await screen.findByRole("button", {name: "POST /api/images"});
  fireEvent.keyDown(screen.getByRole("tab", {name: "메뉴와 API 관계"}), {key: "ArrowRight"});
  expect(screen.getByRole("tab", {name: "서비스 모듈 구조"})).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("region", {name: "서비스 모듈 구조"})).toBeInTheDocument();
  expect(screen.queryByLabelText("검색")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("HTTP")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("공통화 현황 보기", {selector: "summary"}));
  expect(screen.getByText("호환 기반 완료")).toBeInTheDocument();
  expect(screen.getByText("후속 검증 필요")).toBeInTheDocument();
});

test("starts with a connected menu and places selected API details before the list", async () => {
  getApiRegistry.mockResolvedValue(snapshot);
  render(<AdminApiRegistry />);
  const menu = await screen.findByRole("button", {name: "메뉴 앱 > 이미지 등록 1개 API"});
  expect(menu).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", {name: "관계도 POST /api/images"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "관계도 POST /api/images"}));
  const detail = screen.getByRole("region", {name: "API 상세"});
  const list = screen.getByRole("region", {name: "API 전체 목록"});
  expect(detail.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  expect(screen.getByText("소스 근거와 요청 형식 보기", {selector: "summary"}).closest("details")).not.toHaveAttribute("open");
  expect(screen.getByText("공통화 현황 보기", {selector: "summary"}).closest("details")).not.toHaveAttribute("open");
});

test("metric display can be enabled and hidden without changing graph or menu selection", async () => {
  getApiRegistry.mockResolvedValue(snapshot);
  render(<AdminApiRegistry />);
  const route = await screen.findByRole("button", {name: "관계도 POST /api/images"});
  expect(screen.queryByRole("columnheader", {name: "서버 호출 수"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "호출 지표 보기"}));
  expect(screen.getByRole("columnheader", {name: "서버 호출 수"})).toBeInTheDocument();
  expect(screen.getByText("20.0%")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "호출 지표 숨기기"}));
  expect(screen.queryByRole("columnheader", {name: "서버 호출 수"})).not.toBeInTheDocument();
  expect(route).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "메뉴 앱 > 이미지 등록 1개 API"})).toHaveAttribute("aria-pressed", "true");
});

test("compact menu selection uses the same filters and preserves selected menus with no matching API", async () => {
  getApiRegistry.mockResolvedValue(snapshot);
  render(<AdminApiRegistry />);
  const menu = await screen.findByRole("button", {name: "메뉴 앱 > 이미지 등록 1개 API"});
  const compactSelect = screen.getByLabelText("메뉴 선택");
  expect(compactSelect).toHaveValue("editor");
  fireEvent.change(screen.getByLabelText("HTTP"), {target: {value: "GET"}});
  expect(compactSelect).toHaveValue("editor");
  expect(screen.getByText("앱 > 이미지 등록 · 연결 API 없음", {selector: "option"})).toBeInTheDocument();
  expect(screen.getByText("0개 표시")).toBeInTheDocument();
  fireEvent.change(compactSelect, {target: {value: ""}});
  expect(screen.getByText("1개 표시")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "필터 초기화"}));
  fireEvent.change(compactSelect, {target: {value: "editor"}});
  expect(menu).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("button", {name: "관계도 POST /api/images"})).toBeInTheDocument();
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
});
