import { fireEvent, render, screen, within } from "@testing-library/react";
import App from "./App";
import { resetStoreApprovalMocks } from "./admin/api/storeApprovalApi";

const AUTH_STORAGE_KEY = "plate-service.auth";

function createAccessToken(claims = {}) {
  const header = window.btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = window.btoa(
    JSON.stringify({
      sub: "operator@example.com",
      displayName: "Plate Operator",
      ...claims,
    })
  );

  return `${header}.${payload}.signature`;
}

function storeAuth(claims) {
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      accessToken: createAccessToken(claims),
      refreshToken: "test-refresh-token",
    })
  );
}

function renderAt(path) {
  window.history.pushState({}, "", path);
  return render(<App />);
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.pushState({}, "", "/");
  resetStoreApprovalMocks();
});

test("redirects unauthenticated operators to login", () => {
  renderAt("/admin/dashboard");

  expect(screen.getByRole("heading", { name: "운영자 로그인" })).toBeInTheDocument();
  expect(screen.getByText("ADMIN ACCESS")).toBeInTheDocument();
});

test("renders the internal operator dashboard and scoped navigation", async () => {
  storeAuth({
    roles: ["OPERATOR"],
    permissions: ["DASHBOARD_READ", "STORE_READ", "STORE_APPROVE"],
  });

  renderAt("/admin/dashboard");

  expect(screen.getByRole("navigation", { name: "운영자 관리 메뉴" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "대시보드" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "승인 관리" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "FAQ 관리" })).not.toBeInTheDocument();
  expect((await screen.findAllByText("신규 매장 신청")).length).toBeGreaterThan(0);
  expect(screen.getByText("주간 활성 추이")).toBeInTheDocument();
});

test("approves a pending store from the detail drawer", async () => {
  storeAuth({
    roles: ["OPERATOR"],
    permissions: ["STORE_READ", "STORE_APPROVE", "DASHBOARD_READ"],
  });

  renderAt("/admin/store-approvals");

  expect(await screen.findByText("오후의 식탁")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "검토" })[0]);

  const drawer = await screen.findByRole("dialog", { name: "오후의 식탁" });
  expect(within(drawer).getByText("사업자등록증.pdf")).toBeInTheDocument();
  fireEvent.click(within(drawer).getByRole("button", { name: "승인" }));

  const confirmDialog = screen.getByRole("dialog", { name: "매장 신청 승인" });
  fireEvent.click(within(confirmDialog).getByRole("button", { name: "승인하기" }));

  expect(
    await screen.findByText("오후의 식탁 신청을 승인 처리했습니다.")
  ).toBeInTheDocument();
  expect(within(drawer).getAllByText("승인").length).toBeGreaterThan(0);
});

test("keeps approval actions unavailable for viewer role", async () => {
  storeAuth({
    roles: ["VIEWER"],
    permissions: ["STORE_READ", "DASHBOARD_READ"],
  });

  renderAt("/admin/store-approvals");

  expect(await screen.findByText("오후의 식탁")).toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "검토" })[0]);

  const drawer = await screen.findByRole("dialog", { name: "오후의 식탁" });
  expect(
    within(drawer).getByText("조회 권한만 있어 승인 상태를 변경할 수 없습니다.")
  ).toBeInTheDocument();
  expect(within(drawer).queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
});
