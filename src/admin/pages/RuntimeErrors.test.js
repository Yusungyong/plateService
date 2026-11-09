import React from "react";
import { act, fireEvent, render, screen } from "@testing-library/react";
import RuntimeErrors from "./RuntimeErrors";
import { getRuntimeErrors } from "../api/runtimeErrorsApi";
import { useAuth } from "../../auth/AuthContext";
jest.mock("../api/runtimeErrorsApi", () => ({ getRuntimeErrors: jest.fn() }));
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
const sample = {
  available: true, windowStart: "2026-11-09T00:00:00Z", windowEnd: "2026-11-10T00:00:00Z", retentionDays: 7,
  total: 3, kindCounts: [{ kind: "REACT_RENDER", count: 1 }, { kind: "JS_FATAL", count: 1 }, { kind: "JS_NONFATAL", count: 1 }], groups: [],
  hourly: [{ bucketStart: "2026-11-09T00:00:00Z", count: 2 }], recentLimit: 50, hasMore: false,
  recent: [
    { eventId: "1", receivedAt: "2026-11-09T00:10:00Z", kind: "REACT_RENDER", screenLabel: "내 주변", identity: "VERIFIED", username: "test-user", client: "ANDROID", appVersion: "2.0.15", buildNumber: "34", errorType: "TypeError", frames: [{ line: 12, column: 15 }], message: "PRIVATE_INPUT", stack: "PRIVATE_STACK" },
    { eventId: "2", receivedAt: "2026-11-09T00:15:00Z", kind: "JS_FATAL", identity: "UNAVAILABLE", client: "IOS", frames: [] },
    { eventId: "3", receivedAt: "2026-11-09T00:20:00Z", kind: "JS_NONFATAL", screenLabel: "친구", identity: "VERIFIED", username: "test-friend", client: "IOS", frames: [] },
  ],
};
beforeEach(() => { jest.clearAllMocks(); useAuth.mockReturnValue({ user: { accountSubject: "su12ng", roles: ["ADMIN"] } }); });
test("renders counts and recent records, supports type filtering and safe position details", async () => {
  getRuntimeErrors.mockResolvedValue(sample);
  render(<RuntimeErrors />);
  expect(screen.getByRole("status")).toHaveTextContent("불러오는 중");
  expect(await screen.findByText("@test-user")).toBeInTheDocument();
  expect(screen.getByText(/같은 위치의 반복 오류는 짧은 시간 동안 하나로 묶일 수 있어요/)).toBeInTheDocument();
  expect(screen.getByText("계정 확인 불가")).toBeInTheDocument();
  expect(screen.getByText("2.0.15 (34)")).toBeInTheDocument();
  expect(screen.getByRole("img", { name: /시간별 앱 오류 발생/ })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /화면 렌더링.*1건/ }));
  expect(screen.queryByText("계정 확인 불가")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /오류 위치 보기/ }));
  expect(screen.getByText(/숫자 위치: 12:15/)).toBeInTheDocument();
  expect(screen.getByText(/릴리스 소스맵/)).toBeInTheDocument();
  expect(screen.queryByText(/PRIVATE_INPUT|PRIVATE_STACK/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "유형 선택 해제" }));
  expect(screen.getByText("계정 확인 불가")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /JS 실행 오류.*1건/ }));
  expect(screen.getByText("@test-friend")).toBeInTheDocument();
  expect(screen.queryByText("@test-user")).not.toBeInTheDocument();
});
test("renders a true zero independently of collection failures", async () => {
  getRuntimeErrors.mockResolvedValue({ ...sample, total: 0, recent: [], kindCounts: [] });
  render(<RuntimeErrors />);
  expect(await screen.findByText(/보고된 앱 화면 오류가 없어요/)).toBeInTheDocument();
});
test("failed refresh clears old sensitive data, distinguishes permission and allows retry", async () => {
  getRuntimeErrors.mockResolvedValueOnce(sample).mockRejectedValueOnce({status: 403}).mockResolvedValueOnce(sample);
  render(<RuntimeErrors />);
  await screen.findByText("@test-user");
  fireEvent.click(screen.getByRole("button", {name: "앱 오류 새로고침"}));
  expect(screen.getByText("@test-user")).toBeInTheDocument();
  expect(await screen.findByRole("alert")).toHaveTextContent("권한");
  expect(screen.queryByText("@test-user")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "다시 시도"}));
  expect(await screen.findByText("@test-user")).toBeInTheDocument();
});
test("identity changes immediately hide the previous account's result", async () => {
  getRuntimeErrors.mockResolvedValueOnce(sample).mockImplementationOnce(() => new Promise(() => {}));
  const view = render(<RuntimeErrors />);
  await screen.findByText("@test-user");
  useAuth.mockReturnValue({ user: { accountSubject: "another", roles: [] } });
  act(() => view.rerender(<RuntimeErrors />));
  expect(screen.queryByText("@test-user")).not.toBeInTheDocument();
});
test("the shared refresh also reloads runtime diagnostics", async () => {
  let finishRefresh;
  getRuntimeErrors.mockResolvedValueOnce(sample).mockImplementationOnce(() => new Promise(resolve => {finishRefresh = resolve;}));
  const first = {};
  const view = render(<RuntimeErrors snapshotRevision={first} />);
  await screen.findByText("@test-user");
  expect(getRuntimeErrors).toHaveBeenCalledTimes(1);
  view.rerender(<RuntimeErrors snapshotRevision={{}} />);
  expect(getRuntimeErrors).toHaveBeenCalledTimes(2);
  expect(screen.getByText("@test-user")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("갱신하고 있어요");
  await act(async () => finishRefresh(sample));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
