import {act, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import AdminApiRegistry from "./AdminApiRegistry";
import {getApiRegistry} from "../api/apiRegistryApi";
jest.mock("../api/apiRegistryApi", () => ({...jest.requireActual("../api/apiRegistryApi"), getApiRegistry: jest.fn()}));
const stamp = "2026-10-08T06:20:00Z";
const socialError = {method: "POST", path: "/api/test/social", errorCount: 4, http4xxCount: 1, http5xxCount: 1, networkCount: 1, timeoutCount: 1, lastSeenAt: stamp,
  clients: ["ANDROID", "IOS", "WEB"], recent: [{kind: "HTTP", status: 409, client: "ANDROID", count: 1, lastSeenAt: stamp}, {kind: "HTTP", status: 503, client: "WEB", count: 1, lastSeenAt: stamp},
    {kind: "NETWORK", status: null, client: "IOS", count: 1, lastSeenAt: stamp}, {kind: "TIMEOUT", status: null, client: "ANDROID", count: 1, lastSeenAt: stamp}]};
const snapshot = {declaredBaseline: {routes: [{id: "home", method: "GET", path: "/api/test/home", module: "discovery", menuIds: ["app:Home"], surfaces: ["app"]},
  {id: "social", method: "POST", path: "/api/test/social", module: "social", menuIds: ["test-friends"], surfaces: ["app"]}], menus: [{id: "app:Home", label: "홈"}, {id: "test-friends", label: "친구 요청 테스트"}]},
  activeRoutes: [{method: "GET", path: "/api/test/home", module: "discovery"}, {method: "POST", path: "/api/test/social", module: "social"}],
  clientErrors: {available: true, windowHours: 24, windowStart: "2026-10-07T07:00:00Z", windowEnd: "2026-10-08T06:28:00Z", source: "client-reported", rows: [socialError]}};
beforeEach(() => {jest.clearAllMocks(); getApiRegistry.mockResolvedValue(snapshot);});
afterEach(() => {jest.useRealTimers();});

test("global error action reaches failures outside the default Home menu, highlights graph/list/menu and preserves three columns", async () => {
  render(<AdminApiRegistry />);
  await screen.findByRole("button", {name: "GET /api/test/home"});
  const monitor = screen.getByRole("region", {name: "클라이언트 오류 모니터링"});
  expect(within(monitor).getByText("오류 보고")).toBeInTheDocument();
  expect(within(monitor).getByText("4")).toBeInTheDocument();
  await waitFor(() => expect(screen.queryByRole("button", {name: "POST /api/test/social"})).not.toBeInTheDocument());
  expect(screen.getByText("최근 24시간 구간 · 서버 수신 시각 기준")).toBeInTheDocument();
  expect(monitor.querySelector('time[datetime="2026-10-07T07:00:00Z"]')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("검색"), {target: {value: "home"}});
  fireEvent.click(screen.getByRole("checkbox", {name: "오류가 보고된 API만"}));
  expect(screen.getByLabelText("검색")).toHaveValue("");
  expect(screen.getByLabelText("메뉴 선택")).toHaveValue("");
  expect(screen.getByText("1개 표시")).toBeInTheDocument();
  const route = screen.getByRole("button", {name: "POST /api/test/social"});
  expect(route.closest("tr")).toHaveAttribute("data-error-severity", "critical");
  expect(screen.getByRole("button", {name: "관계도 POST /api/test/social 오류 보고 4건"})).toHaveAttribute("data-error-severity", "critical");
  expect(screen.getByRole("button", {name: "메뉴 친구 요청 테스트 1개 API 오류 보고 4건"})).toHaveAttribute("data-error-severity", "critical");
  expect(screen.getAllByRole("columnheader")).toHaveLength(3);
  fireEvent.click(route);
  const detail = screen.getByRole("region", {name: "API 오류 보고 상세"});
  expect(within(detail).getByText("HTTP 503")).toBeInTheDocument();
  expect(within(detail).getByText("보고한 클라이언트: Android · iOS · 웹")).toBeInTheDocument();
  expect(within(detail).getByText("최근 오류 분류 (최대 20개 그룹) · 유형·상태·클라이언트별")).toBeInTheDocument();
  expect(within(detail).getByText("서버·연결 오류 4건")).toBeInTheDocument();
});
test("unavailable or malformed monitoring remains visible and never hides APIs as if no reports existed", async () => {
  getApiRegistry.mockResolvedValue({...snapshot, clientErrors: {available: false, rows: []}});
  render(<AdminApiRegistry />);
  await screen.findByRole("button", {name: "GET /api/test/home"});
  expect(screen.getByText("오류 집계를 확인할 수 없습니다. 보고 0건으로 판단하지 마세요.")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", {name: "오류가 보고된 API만"})).toBeDisabled();
  fireEvent.click(await screen.findByRole("button", {name: "필터 초기화"}));
  expect(screen.getByText("2개 표시")).toBeInTheDocument();
});
test("HTTP 4xx reports have an accessible request-error label and amber severity", async () => {
  getApiRegistry.mockResolvedValue({...snapshot, clientErrors: {...snapshot.clientErrors, rows: [{...socialError, errorCount: 1, http4xxCount: 1, http5xxCount: 0, networkCount: 0, timeoutCount: 0, recent: socialError.recent.slice(0, 1)}]}});
  render(<AdminApiRegistry />);
  await screen.findByRole("checkbox", {name: "오류가 보고된 API만"});
  fireEvent.click(screen.getByRole("checkbox", {name: "오류가 보고된 API만"}));
  expect(screen.getByRole("button", {name: "POST /api/test/social"}).closest("tr")).toHaveAttribute("data-error-severity", "warning");
  expect(screen.getAllByText("요청 오류 1건").length).toBeGreaterThan(0);
});
test("automatic refresh only runs while visible, respects off, and cleans up on unmount", async () => {
  jest.useFakeTimers();
  const view = render(<AdminApiRegistry />);
  await act(async () => {await Promise.resolve();});
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
  const visibility = jest.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
  fireEvent(document, new Event("visibilitychange"));
  await act(async () => {jest.advanceTimersByTime(60000);});
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue("visible");
  await act(async () => {fireEvent(document, new Event("visibilitychange"));});
  expect(getApiRegistry).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole("checkbox", {name: "30초 자동 새로고침"}));
  await act(async () => {jest.advanceTimersByTime(60000);});
  expect(getApiRegistry).toHaveBeenCalledTimes(2);
  expect(screen.getByText(/자동 새로고침 꺼짐/)).toBeInTheDocument();
  view.unmount(); visibility.mockRestore();
  await act(async () => {jest.advanceTimersByTime(60000);});
  expect(getApiRegistry).toHaveBeenCalledTimes(2);
});
test("auto refresh and manual reload cannot overlap and unmount aborts the outstanding load", async () => {
  jest.useFakeTimers();
  let resolve;
  getApiRegistry.mockImplementation(() => new Promise(done => {resolve = done;}));
  const view = render(<AdminApiRegistry />);
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
  const signal = getApiRegistry.mock.calls[0][0].signal;
  await act(async () => {jest.advanceTimersByTime(90000);});
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => {resolve(snapshot);});
  await act(async () => {jest.advanceTimersByTime(90000);});
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
});
test("compact menu selector uses the same error-filtered routes", async () => {
  render(<AdminApiRegistry />);
  await screen.findByRole("button", {name: "GET /api/test/home"});
  fireEvent.click(screen.getByRole("checkbox", {name: "오류가 보고된 API만"}));
  fireEvent.change(screen.getByLabelText("메뉴 선택"), {target: {value: "test-friends"}});
  expect(screen.getByText("1개 표시")).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "메뉴 친구 요청 테스트 1개 API 오류 보고 4건"})).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByText("친구 요청 테스트 · 1개 API · 오류 4건", {selector: "option"})).toBeInTheDocument();
});
