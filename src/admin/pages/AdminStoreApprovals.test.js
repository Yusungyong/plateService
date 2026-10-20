import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, createMemoryRouter, RouterProvider } from "react-router-dom";
import AdminStoreApprovals from "./AdminStoreApprovals";
import { approveStore, getStoreApprovalDetail, getStoreApprovals } from "../api/storeApprovalApi";

jest.mock("../../auth/AuthContext", () => ({ useAuth: () => ({ canAdmin: () => true }) }));
jest.mock("../api/storeApprovalApi", () => ({
  approveStore: jest.fn(),
  getStoreApprovalDetail: jest.fn(),
  getStoreDocumentAccessUrl: jest.fn(),
  getStoreApprovals: jest.fn(),
  holdStore: jest.fn(),
  rejectStore: jest.fn(),
}));

const store = {
  id: 42,
  name: "모닝 베이크",
  ownerName: "신청자",
  region: "서울",
  category: "카페",
  approvalStatus: "pending",
  verificationStatus: "reviewing",
  appliedAt: "2026-10-20T09:00:00Z",
  version: 7,
  representativeMenus: [],
  documents: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  getStoreApprovals.mockResolvedValue({ content: [store], page: 0, size: 10, totalElements: 1, totalPages: 1, hasNext: false });
  getStoreApprovalDetail.mockResolvedValue(store);
});

function renderApprovals() {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><AdminStoreApprovals /></MemoryRouter>);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

test("keeps submitted keywords and applies status filters without hiding search", async () => {
  renderApprovals();
  await screen.findByRole("button", { name: "검토" });
  expect(screen.queryByRole("combobox", { name: "지역" })).not.toBeInTheDocument();
  expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole("searchbox", { name: "검색어" }), { target: { value: "모닝" } });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(getStoreApprovals).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "모닝", page: 0 })));
  expect(screen.getByRole("searchbox")).toHaveValue("모닝");

  fireEvent.click(within(screen.getByRole("group", { name: "승인 상태 빠른 필터" })).getByRole("button", { name: "보류" }));
  await waitFor(() => expect(getStoreApprovals).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "모닝", status: "on_hold", page: 0 })));
  expect(screen.getByRole("button", { name: "보류" })).toHaveAttribute("aria-pressed", "true");

  fireEvent.click(screen.getByRole("button", { name: "상세 필터 열기" }));
  fireEvent.change(screen.getByRole("combobox", { name: "지역" }), { target: { value: "SEOUL" } });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(getStoreApprovals).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "모닝", status: "on_hold", region: "SEOUL" })));
  expect(screen.getByRole("searchbox")).toHaveValue("모닝");

  fireEvent.click(screen.getByRole("button", { name: "초기화" }));
  await waitFor(() => expect(getStoreApprovals).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "", status: "", region: "" })));
});

test("preserves version confirmation and refreshes a conflicting approval", async () => {
  approveStore.mockRejectedValue(Object.assign(new Error("conflict"), { status: 409, code: "STORE_APPROVAL_VERSION_CONFLICT" }));
  getStoreApprovalDetail.mockResolvedValueOnce(store).mockResolvedValueOnce({ ...store, version: 8, approvalStatus: "approved" });
  renderApprovals();

  fireEvent.click(await screen.findByRole("button", { name: "검토" }));
  const drawer = await screen.findByRole("dialog", { name: store.name });
  fireEvent.click(within(drawer).getByRole("button", { name: "승인" }));
  expect(approveStore).not.toHaveBeenCalled();
  fireEvent.click(within(screen.getByRole("dialog", { name: "매장 신청 승인" })).getByRole("button", { name: "승인하기" }));

  await waitFor(() => expect(approveStore).toHaveBeenCalledWith(42, { version: 7, comment: "" }));
  expect(await within(drawer).findByRole("alert")).toHaveTextContent("다른 운영자가 먼저 처리했습니다. 최신 정보를 다시 불러왔습니다.");
  expect(within(drawer).getByText("승인 상태")).toBeInTheDocument();
  expect(within(drawer).queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
});

test("ignores a stale filter failure while keeping the newest request loading", async () => {
  renderApprovals();
  await screen.findByRole("button", { name: "검토" });
  const oldRequest = deferred();
  const newRequest = deferred();
  getStoreApprovals.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
  const filters = within(screen.getByRole("group", { name: "승인 상태 빠른 필터" }));
  fireEvent.click(filters.getByRole("button", { name: "보류" }));
  fireEvent.click(filters.getByRole("button", { name: "승인" }));
  await act(async () => { oldRequest.reject(new Error("이전 필터 조회 실패")); });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "검토" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "다음" })).toBeDisabled();
  await act(async () => {
    newRequest.resolve({ content: [{ ...store, name: "최신 승인 매장", approvalStatus: "approved" }], page: 0, size: 10, totalElements: 1, totalPages: 1, hasNext: false });
  });
  expect(screen.getByRole("button", { name: "최신 승인 매장 신청 상세 검토" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "모닝 베이크 신청 상세 검토" })).not.toBeInTheDocument();
});

test("does not reopen a drawer closed before its detail request finishes", async () => {
  const pendingDetail = deferred();
  getStoreApprovalDetail.mockReturnValueOnce(pendingDetail.promise);
  renderApprovals();
  fireEvent.click(await screen.findByRole("button", { name: "검토" }));
  const drawer = screen.getByRole("dialog", { name: "매장 신청 정보" });
  fireEvent.click(within(drawer).getByRole("button", { name: "닫기" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await act(async () => { pendingDetail.resolve(store); });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(approveStore).not.toHaveBeenCalled();
});

test("keeps an in-flight approval visible and shows a failure inside its drawer", async () => {
  const pendingApproval = deferred();
  approveStore.mockReturnValueOnce(pendingApproval.promise);
  renderApprovals();
  fireEvent.click(await screen.findByRole("button", { name: "검토" }));
  const drawer = await screen.findByRole("dialog", { name: store.name });
  fireEvent.click(within(drawer).getByRole("button", { name: "승인" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "매장 신청 승인" })).getByRole("button", { name: "승인하기" }));
  fireEvent.click(within(drawer).getByRole("button", { name: "닫기" }));
  expect(drawer).toBeInTheDocument();
  expect(within(drawer).getByRole("button", { name: "승인" })).toBeDisabled();
  expect(within(drawer).getByRole("status")).toHaveTextContent("승인 상태를 변경하고 있습니다.");

  await act(async () => { pendingApproval.reject(new Error("승인을 처리하지 못했습니다.")); });
  expect(within(drawer).getByRole("alert")).toHaveTextContent("승인을 처리하지 못했습니다.");
  expect(approveStore).toHaveBeenCalledTimes(1);
  expect(within(drawer).getByRole("button", { name: "승인" })).toBeEnabled();
  fireEvent.click(within(drawer).getByRole("button", { name: "닫기" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("approval deep links preserve dates and status through URL history and reset", async () => {
  const router = createMemoryRouter([{path: "*", element: <AdminStoreApprovals />}], {initialEntries: ["/admin/store-approvals?status=pending&keyword=모닝&appliedFrom=2026-10-01&appliedTo=2026-10-20"]});
  render(<RouterProvider router={router} />);
  await screen.findByRole("button", {name: "검토"});
  expect(getStoreApprovals).toHaveBeenLastCalledWith(expect.objectContaining({status: "pending", keyword: "모닝", appliedFrom: "2026-10-01", appliedTo: "2026-10-20"}));
  expect(screen.getByLabelText("적용된 신청 조건")).toHaveTextContent("신청일 시작: 2026-10-01");
  fireEvent.click(within(screen.getByRole("group", {name: "승인 상태 빠른 필터"})).getByRole("button", {name: "보류"}));
  await waitFor(() => expect(new URLSearchParams(router.state.location.search).get("status")).toBe("on_hold"));
  await act(async () => router.navigate(-1));
  await waitFor(() => expect(getStoreApprovals).toHaveBeenLastCalledWith(expect.objectContaining({status: "pending", appliedFrom: "2026-10-01"})));
  fireEvent.click(screen.getByRole("button", {name: "조회 결과 1건 신청 목록 보기"}));
  await waitFor(() => expect(screen.getByRole("heading", {name: "신청 목록 1건"})).toHaveFocus());
  fireEvent.click(screen.getByRole("button", {name: "초기화"}));
  await waitFor(() => expect(router.state.location.search).toBe(""));
  expect(approveStore).not.toHaveBeenCalled();
});

test("approval detail status opens its evidence list without approving the store", async () => {
  const router = createMemoryRouter([{path: "*", element: <AdminStoreApprovals />}], {initialEntries: ["/admin/store-approvals"]});
  render(<RouterProvider router={router} />);
  fireEvent.click(await screen.findByRole("button", {name: "검토"}));
  const detail = await screen.findByRole("dialog", {name: store.name});
  fireEvent.click(within(detail).getByRole("button", {name: "입점 심사 중 신청 목록 보기"}));
  await waitFor(() => expect(getStoreApprovals).toHaveBeenLastCalledWith(expect.objectContaining({verificationStatus: "reviewing"})));
  expect(router.state.location.search).toContain("verificationStatus=reviewing");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(approveStore).not.toHaveBeenCalled();
});
