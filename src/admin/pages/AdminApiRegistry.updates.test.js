import {fireEvent, render, screen, within} from "@testing-library/react";
import AdminApiRegistry from "./AdminApiRegistry";
import {getApiRegistry} from "../api/apiRegistryApi";
jest.mock("../api/apiRegistryApi", () => ({...jest.requireActual("../api/apiRegistryApi"), getApiRegistry: jest.fn()}));
const snapshot = {activeRoutes: [{method: "GET", path: "/api/chat/home", module: "social"}]};
beforeEach(() => {jest.clearAllMocks();getApiRegistry.mockResolvedValue(snapshot);});

test("feature tab shows applied source evidence and pending contracts without additional requests", async () => {
  render(<AdminApiRegistry />);
  fireEvent.click(await screen.findByRole("tab", {name: "기능·최적화"}));
  expect(screen.getByRole("region", {name: "추가 기능"})).toBeInTheDocument();
  expect(screen.getByRole("region", {name: "최적화"})).toBeInTheDocument();
  expect(screen.getByText("프로필 이미지 캐시·썸네일")).toBeInTheDocument();
  expect(screen.getAllByText("서버 Issue #147 · 구현 대기")).toHaveLength(3);
  fireEvent.click(screen.getByRole("button", {name: "홈에서 대화·약속 바로가기 연결 API 보기"}));
  expect(screen.getByRole("tab", {name: "메뉴와 API 관계"})).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("3개 표시")).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "관계도 GET /api/chat/home"})).toBeInTheDocument();
  expect(within(screen.getByRole("table")).getAllByText("서버 등록 확인")).toHaveLength(1);
  expect(getApiRegistry).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", {name: /메뉴 홈 > 콘텐츠/}));
  expect(screen.getByRole("button", {name: "관계도 GET /api/chat/home"})).toBeInTheDocument();
});

test("third tab supports keyboard wrapping and authorization failure clears its private view", async () => {
  getApiRegistry.mockResolvedValueOnce(snapshot).mockRejectedValueOnce(new Error("권한 없음"));
  render(<AdminApiRegistry />);
  const first = await screen.findByRole("tab", {name: "메뉴와 API 관계"});
  fireEvent.keyDown(first, {key: "End"});
  const third = screen.getByRole("tab", {name: "기능·최적화"});
  expect(third).toHaveFocus();
  fireEvent.keyDown(third, {key: "ArrowRight"});
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, {key: "ArrowLeft"});
  expect(third).toHaveFocus();
  fireEvent.click(screen.getByRole("button", {name: "새로고침"}));
  await screen.findByRole("alert");
  expect(screen.queryByRole("region", {name: "추가 기능"})).not.toBeInTheDocument();
});

test("JSON export includes feature evidence, optimizations and runtime registration truth", async () => {
  render(<AdminApiRegistry />);
  await screen.findByRole("tab", {name: "기능·최적화"});
  let exported;
  const original = global.Blob;
  global.Blob = class {constructor(parts) {exported = JSON.parse(parts[0]);}};
  URL.createObjectURL = jest.fn(() => "blob:registry-test");
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  try {
    fireEvent.click(screen.getByRole("button", {name: "JSON 저장"}));
    expect(exported.updateCatalog.features).toHaveLength(10);
    expect(exported.updateCatalog.optimizations).toHaveLength(8);
    expect(exported.effectiveRows.filter(row => row.active)).toHaveLength(1);
    expect(exported.updateSummary.find(item => item.id === "groups").registeredCount).toBe(0);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:registry-test");
  } finally {global.Blob = original;click.mockRestore();}
});
