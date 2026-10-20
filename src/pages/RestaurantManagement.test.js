import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import RestaurantManagement from "./RestaurantManagement";
import { deleteAdminRestaurant, fetchAdminRestaurants, fetchRestaurants } from "../api/restaurantApi";

jest.mock("../api/restaurantApi", () => ({
  deleteAdminRestaurant: jest.fn(),
  fetchAdminRestaurants: jest.fn(),
  fetchRestaurants: jest.fn(),
}));

const restaurant = {
  restaurantId: 17,
  title: "검수할 식당",
  address: "서울 중구",
  categories: ["한식"],
  exposureStatus: "review",
  menuCount: 2,
  updatedAt: "2026-10-20T00:00:00Z",
};
const page = { content: [restaurant], page: 0, size: 20, totalElements: 1, totalPages: 1, hasNext: false };

beforeEach(() => {
  jest.clearAllMocks();
  fetchAdminRestaurants.mockResolvedValue(page);
  fetchRestaurants.mockResolvedValue(page);
  deleteAdminRestaurant.mockResolvedValue({});
});

function renderManagement(adminMode = true) {
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><RestaurantManagement adminMode={adminMode} /></MemoryRouter>);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => { resolve = resolvePromise; reject = rejectPromise; });
  return { promise, resolve, reject };
}

test("filters review work and requires selecting and confirming the store before deletion", async () => {
  renderManagement();
  await screen.findByRole("button", { name: "검수할 식당 관리 작업 열기" });
  expect(screen.queryByRole("button", { name: "매장 삭제" })).not.toBeInTheDocument();

  fireEvent.click(within(screen.getByRole("group", { name: "매장 노출 상태 빠른 필터" })).getByRole("button", { name: "검수 요청" }));
  await waitFor(() => expect(fetchAdminRestaurants).toHaveBeenLastCalledWith(expect.objectContaining({ exposureStatus: "review", page: 0 })));
  fireEvent.click(await screen.findByRole("button", { name: "검수할 식당 관리 작업 열기" }));
  const drawer = screen.getByRole("dialog", { name: "검수할 식당" });
  expect(within(drawer).getByRole("link", { name: "매장 정보 편집" })).toHaveAttribute("href", "/admin/stores/17");
  expect(within(drawer).getByText("서울 중구")).toBeInTheDocument();

  fireEvent.click(within(drawer).getByRole("button", { name: "매장 삭제" }));
  let confirmation = screen.getByRole("dialog", { name: "매장 삭제" });
  expect(within(confirmation).getByText(/검수할 식당 정보를 삭제할까요/)).toBeInTheDocument();
  expect(deleteAdminRestaurant).not.toHaveBeenCalled();
  fireEvent.click(within(confirmation).getByRole("button", { name: "취소" }));
  expect(screen.getByRole("dialog", { name: "검수할 식당" })).toBeInTheDocument();
  expect(deleteAdminRestaurant).not.toHaveBeenCalled();

  fireEvent.click(within(drawer).getByRole("button", { name: "매장 삭제" }));
  confirmation = screen.getByRole("dialog", { name: "매장 삭제" });
  fetchAdminRestaurants.mockResolvedValue({ ...page, content: [], totalElements: 0 });
  fireEvent.click(within(confirmation).getByRole("button", { name: "삭제하기" }));
  expect(await screen.findByRole("status")).toHaveTextContent("매장 정보가 삭제되었습니다.");
  expect(deleteAdminRestaurant).toHaveBeenCalledWith(17);
  expect(fetchAdminRestaurants).toHaveBeenLastCalledWith(expect.objectContaining({ exposureStatus: "review" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("keeps the existing owner search, detail route and exposure guide", async () => {
  renderManagement(false);
  await screen.findByText("검수할 식당");
  expect(fetchAdminRestaurants).not.toHaveBeenCalled();
  expect(screen.getByRole("heading", { name: "내 매장 관리" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "상세" })).toHaveAttribute("href", "/business/stores/17");
  expect(screen.getByRole("link", { name: "새 입점 신청" })).toHaveAttribute("href", "/business/signup");
  expect(screen.queryByRole("button", { name: /관리 작업 열기/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("group", { name: "매장 노출 상태 빠른 필터" })).not.toBeInTheDocument();

  fireEvent.change(screen.getByRole("combobox", { name: "노출 상태" }), { target: { value: "published" } });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));
  await waitFor(() => expect(fetchRestaurants).toHaveBeenLastCalledWith(expect.objectContaining({ exposureStatus: "published" })));
  expect(deleteAdminRestaurant).not.toHaveBeenCalled();
});

test("keeps the newest quick filter results when earlier requests finish late", async () => {
  renderManagement();
  await screen.findByRole("button", { name: "검수할 식당 관리 작업 열기" });
  const oldRequest = deferred();
  const newRequest = deferred();
  fetchAdminRestaurants.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise);
  const filters = within(screen.getByRole("group", { name: "매장 노출 상태 빠른 필터" }));
  fireEvent.click(filters.getByRole("button", { name: "검수 요청" }));
  fireEvent.click(filters.getByRole("button", { name: "즉시 노출" }));

  await act(async () => {
    newRequest.resolve({ ...page, content: [{ ...restaurant, title: "최신 노출 매장", exposureStatus: "published" }] });
  });
  expect(screen.getByRole("button", { name: "최신 노출 매장 관리 작업 열기" })).toBeInTheDocument();
  await act(async () => { oldRequest.resolve(page); });
  expect(screen.getByRole("button", { name: "최신 노출 매장 관리 작업 열기" })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "검수할 식당 관리 작업 열기" })).not.toBeInTheDocument();
  expect(filters.getByRole("button", { name: "즉시 노출" })).toHaveAttribute("aria-pressed", "true");
});

test("shows a deletion failure in the open drawer and permits a deliberate retry", async () => {
  deleteAdminRestaurant.mockRejectedValueOnce(new Error("연결이 끊겨 삭제 결과를 확인하지 못했습니다."));
  renderManagement();
  fireEvent.click(await screen.findByRole("button", { name: "검수할 식당 관리 작업 열기" }));
  const drawer = screen.getByRole("dialog", { name: "검수할 식당" });
  fireEvent.click(within(drawer).getByRole("button", { name: "매장 삭제" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: "매장 삭제" })).getByRole("button", { name: "삭제하기" }));

  expect(await within(drawer).findByRole("alert")).toHaveTextContent("연결이 끊겨 삭제 결과를 확인하지 못했습니다.");
  expect(screen.queryByRole("dialog", { name: "매장 삭제" })).not.toBeInTheDocument();
  expect(deleteAdminRestaurant).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(within(drawer).getByRole("button", { name: "매장 삭제" })).toBeEnabled();
  fireEvent.click(within(drawer).getByRole("button", { name: "매장 삭제" }));
  expect(screen.getByRole("dialog", { name: "매장 삭제" })).toBeInTheDocument();
  expect(deleteAdminRestaurant).toHaveBeenCalledTimes(1);
});
