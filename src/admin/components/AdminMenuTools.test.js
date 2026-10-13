import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminMenuTools, { MENU_SCOPES } from "./AdminMenuTools";
import { useAuth } from "../../auth/AuthContext";
import { getOperationsReviews, saveOperationsReview } from "../api/operationsReviewApi";
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/operationsReviewApi", () => ({
  getOperationsReviews: jest.fn(),
  saveOperationsReview: jest.fn(),
}));
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({
    user: { accountSubject: "su12ng", roles: ["ADMIN"] },
    canAdmin: () => true,
  });
  getOperationsReviews.mockResolvedValue([]);
  saveOperationsReview.mockResolvedValue({ recorded: true });
});
function mount(path = "/admin/dashboard") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminMenuTools />
    </MemoryRouter>
  );
}
test("all twelve menu scopes have tools without eager requests", () => {
  expect(Object.keys(MENU_SCOPES)).toHaveLength(12);
  const rendered = mount();
  expect(screen.getByRole("button", { name: "운영 점검 기록" })).toBeInTheDocument();
  expect(getOperationsReviews).not.toHaveBeenCalled();
  rendered.unmount();
});
test("other administrator accounts cannot see or call operator tools", () => {
  useAuth.mockReturnValue({
    user: { accountSubject: "other", roles: ["SUPER_ADMIN"] },
    canAdmin: () => true,
  });
  mount();
  expect(screen.queryByRole("button", { name: "운영 점검 기록" })).not.toBeInTheDocument();
  expect(getOperationsReviews).not.toHaveBeenCalled();
});
test("a reviewed target and reason are persisted without changing business status", async () => {
  mount("/admin/feeds");
  fireEvent.click(screen.getByRole("button", { name: "운영 점검 기록" }));
  await screen.findByText("저장된 점검 기록이 없습니다.");
  fireEvent.change(screen.getByLabelText("점검 대상"), { target: { value: "42" } });
  fireEvent.change(screen.getByLabelText("점검 결과"), { target: { value: "VERIFIED" } });
  fireEvent.change(screen.getByLabelText("점검 내용"), {
    target: { value: "게시물 내용을 검토하고 확인했습니다." },
  });
  fireEvent.click(screen.getByRole("button", { name: "점검 기록 저장" }));
  await screen.findByRole("status");
  expect(saveOperationsReview).toHaveBeenCalledWith({
    scope: "FEEDS",
    target: "42",
    status: "VERIFIED",
    reason: "게시물 내용을 검토하고 확인했습니다.",
  });
  expect(getOperationsReviews).toHaveBeenLastCalledWith(
    "FEEDS",
    "42",
    expect.objectContaining({ signal: expect.anything() })
  );
});
test("read-only operator can query but cannot enter or save reviews", async () => {
  useAuth.mockReturnValue({
    user: { accountSubject: "su12ng", roles: ["ADMIN"] },
    canAdmin: (p) => p !== "SETTING_MANAGE",
  });
  mount();
  fireEvent.click(screen.getByRole("button", { name: "운영 점검 기록" }));
  await screen.findByText("저장된 점검 기록이 없습니다.");
  expect(screen.queryByRole("button", { name: "점검 기록 저장" })).not.toBeInTheDocument();
  expect(saveOperationsReview).not.toHaveBeenCalled();
});
test("selected target is queried using the current menu scope", async () => {
  let first;
  getOperationsReviews.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        first = resolve;
      })
  );
  mount();
  fireEvent.click(screen.getByRole("button", { name: "운영 점검 기록" }));
  await act(async () => first([]));
  fireEvent.change(screen.getByLabelText("점검 대상"), { target: { value: "new" } });
  getOperationsReviews.mockResolvedValueOnce([
    {
      id: 1,
      at: "2026-10-13T00:00:00Z",
      status: "VERIFIED",
      reason: "새 대상의 최신 점검 기록입니다.",
      actorUserId: 1,
    },
  ]);
  fireEvent.click(screen.getByRole("button", { name: "대상 기록 조회" }));
  await screen.findByText("새 대상의 최신 점검 기록입니다.");
  expect(screen.getByText("new · 최근 점검 20개")).toBeInTheDocument();
});
