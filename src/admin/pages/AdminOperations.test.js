import React from "react";
import {
  act,
  render,
  screen,
  waitFor,
  fireEvent,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminOperationsHome from "./AdminOperationsHome";
import AdminOperationsIncidents from "./AdminOperationsIncidents";
import AdminOperationsReleases from "./AdminOperationsReleases";
import {
  getOperationsSnapshot,
  getPushAttempt,
  createOperationsRelease,
  recordReleaseCheck,
} from "../api/operationsApi";
import { useAuth } from "../../auth/AuthContext";
jest.mock("../api/operationsApi", () => ({
  getOperationsSnapshot: jest.fn(),
  getPushAttempt: jest.fn(),
  createOperationsRelease: jest.fn(),
  recordReleaseCheck: jest.fn(),
}));
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
const snapshot = {
  schemaVersion: 1,
  collectedAt: "2026-10-12T06:00:00Z",
  api: { runtimeMetrics: [], clientErrors: { available: false } },
  push: { available: true, counts: [], attempts: [], skips: [] },
  reports: { available: false },
  releases: { available: true, items: [], checks: [], workflows: [] },
  github: { status: "NOT_CONFIGURED" },
};
afterEach(() => {
  cleanup();
  jest.useRealTimers();
});
beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  getOperationsSnapshot.mockResolvedValue(snapshot);
  useAuth.mockReturnValue({
    user: { accountSubject: "su12ng", roles: ["ADMIN"] },
    canAdmin: () => true,
  });
});
const mount = (Component, path = "/admin/operations") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Component />
    </MemoryRouter>
  );
test("home distinguishes unavailable, empty and uncollected metrics", async () => {
  mount(AdminOperationsHome);
  await screen.findByText("FCM 접수 성공률");
  expect(screen.getAllByText("확인 불가").length).toBeGreaterThan(0);
  expect(screen.getByText("전송 기록 없음")).toBeInTheDocument();
  expect(screen.getByText("미수집")).toBeInTheDocument();
});
test("failed refresh clears privileged stale data instead of presenting it as current", async () => {
  getOperationsSnapshot
    .mockResolvedValueOnce({
      ...snapshot,
      reports: { available: true, activeFlags: 17 },
    })
    .mockRejectedValueOnce(new Error("권한이 변경됐습니다."));
  mount(AdminOperationsHome);
  await screen.findByText("17건");
  fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
  await screen.findByRole("alert");
  expect(screen.queryByText("17건")).not.toBeInTheDocument();
});
test("API and push diagnostics have independent empty states", async () => {
  mount(AdminOperationsIncidents, "/admin/operations/incidents?view=push");
  await screen.findByText("최근 24시간 전송 시도 기록이 없습니다.");
  expect(screen.getByText("관측된 생략 기록 없음")).toBeInTheDocument();
});
test("a successful provider attempt still shows missing receipt as unknown", async () => {
  getOperationsSnapshot.mockResolvedValue({
    ...snapshot,
    push: {
      available: true,
      counts: [{ status: "SUCCESS", count: 1 }],
      skips: [],
      attempts: [
        {
          deliveryId: 5,
          providerStatus: "SUCCESS",
          platform: "IOS",
          attemptedAt: "2026-10-12T06:00:00",
          receivedAt: "",
          openedAt: "",
          errorCode: "UNKNOWN",
        },
      ],
    },
  });
  mount(AdminOperationsIncidents, "/admin/operations/incidents?view=push");
  await screen.findByText("전송 #5 보기");
  expect(screen.getAllByText("확인 불가").length).toBeGreaterThan(2);
  expect(screen.queryByText("수신 확인")).not.toBeInTheDocument();
});
test("query-only operator has no release mutation buttons", async () => {
  useAuth.mockReturnValue({
    user: { accountSubject: "su12ng", roles: ["VIEWER"] },
    canAdmin: () => false,
  });
  mount(AdminOperationsReleases);
  await screen.findByText(
    "등록된 버전이 없습니다. 확인할 버전을 등록해 점검을 시작하세요."
  );
  expect(
    screen.queryByRole("button", { name: "버전 등록" })
  ).not.toBeInTheDocument();
});
test("manually marking a check sends its exact release and a retry-safe UUID", async () => {
  getOperationsSnapshot.mockResolvedValue({
    ...snapshot,
    releases: {
      available: true,
      items: [
        {
          releaseId: "r1",
          platform: "ANDROID",
          version: "2.0.13",
          build: "32",
          revision: "a".repeat(40),
        },
      ],
      checks: [],
      workflows: [],
    },
  });
  recordReleaseCheck.mockResolvedValue({ recorded: true });
  Object.defineProperty(window, "crypto", {
    configurable: true,
    value: { randomUUID: () => "11111111-1111-4111-8111-111111111111" },
  });
  mount(AdminOperationsReleases);
  fireEvent.click(
    await screen.findByRole("button", { name: "채팅 송수신 통과 기록" })
  );
  await waitFor(() =>
    expect(recordReleaseCheck).toHaveBeenCalledWith("r1", {
      eventId: "11111111-1111-4111-8111-111111111111",
      check: "CHAT",
      result: "PASS",
    })
  );
  expect(createOperationsRelease).not.toHaveBeenCalled();
});
test("late response from previous account cannot restore privileged data", async () => {
  let resolve;
  getOperationsSnapshot.mockImplementationOnce(
    () =>
      new Promise((r) => {
        resolve = r;
      })
  );
  const view = mount(AdminOperationsHome);
  await waitFor(() => expect(getOperationsSnapshot).toHaveBeenCalledTimes(1));
  useAuth.mockReturnValue({
    user: { accountSubject: "other-admin", roles: ["ADMIN"] },
    canAdmin: () => true,
  });
  getOperationsSnapshot.mockResolvedValue({
    ...snapshot,
    reports: { available: false },
  });
  view.rerender(
    <MemoryRouter>
      <AdminOperationsHome />
    </MemoryRouter>
  );
  await act(async () => {
    resolve({ ...snapshot, reports: { available: true, activeFlags: 98765 } });
  });
  expect(screen.queryByText("98765건")).not.toBeInTheDocument();
});

test("selecting a push attempt loads its current receipt detail", async () => {
  const attempt = {
    deliveryId: 5,
    providerStatus: "SUCCESS",
    platform: "IOS",
    attemptedAt: "2026-10-12T06:00:00",
    receivedAt: "",
    openedAt: "",
  };
  getOperationsSnapshot.mockResolvedValue({
    ...snapshot,
    push: { available: true, counts: [], skips: [], attempts: [attempt] },
  });
  getPushAttempt.mockResolvedValue({
    ...attempt,
    receivedAt: "2026-10-12T06:00:05",
    openedAt: "2026-10-12T06:00:10",
  });
  mount(AdminOperationsIncidents, "/admin/operations/incidents?view=push");
  fireEvent.click(await screen.findByRole("button", { name: "전송 #5 보기" }));
  await waitFor(() =>
    expect(getPushAttempt).toHaveBeenCalledWith(
      5,
      expect.objectContaining({ signal: expect.anything() })
    )
  );
  await waitFor(() => expect(screen.getAllByText("✓ 확인")).toHaveLength(4));
});
