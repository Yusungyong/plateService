import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    permissions: [
      "ADMIN_ACCESS",
      "DASHBOARD_READ",
      "STORE_READ",
      "STORE_APPROVE",
    ],
  });

  renderAt("/admin/dashboard");

  expect(screen.getByRole("navigation", { name: "운영자 관리 메뉴" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "대시보드" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "입점 신청 심사" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "FAQ 관리" })).not.toBeInTheDocument();
  expect((await screen.findAllByText("신규 매장 신청")).length).toBeGreaterThan(0);
  expect(screen.getByText("주간 활성 추이")).toBeInTheDocument();
});

test("approves a pending store from the detail drawer", async () => {
  storeAuth({
    roles: ["OPERATOR"],
    permissions: [
      "ADMIN_ACCESS",
      "STORE_READ",
      "STORE_APPROVE",
      "DASHBOARD_READ",
    ],
  });

  renderAt("/admin/store-approvals");

  expect((await screen.findAllByText("모닝 베이크")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole("button", { name: "검토" })[1]);

  const drawer = await screen.findByRole("dialog", { name: "모닝 베이크" });
  expect(within(drawer).getByText("사업자등록증.pdf")).toBeInTheDocument();
  fireEvent.click(within(drawer).getByRole("button", { name: "승인" }));

  const confirmDialog = screen.getByRole("dialog", { name: "매장 신청 승인" });
  fireEvent.click(within(confirmDialog).getByRole("button", { name: "승인하기" }));

  expect(
    screen.queryByRole("dialog", { name: "매장 신청 승인" })
  ).not.toBeInTheDocument();

  expect(
    await screen.findByText("모닝 베이크 신청을 승인 처리했습니다.")
  ).toBeInTheDocument();
  expect(within(drawer).getAllByText("승인").length).toBeGreaterThan(0);
});

test("allows approval after the application-level business verification", async () => {
  storeAuth({
    roles: ["OPERATOR"],
    permissions: [
      "ADMIN_ACCESS",
      "STORE_READ",
      "STORE_APPROVE",
      "DASHBOARD_READ",
    ],
  });

  renderAt("/admin/store-approvals");

  expect((await screen.findAllByText("오후의 식탁")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole("button", { name: "검토" })[0]);

  const drawer = await screen.findByRole("dialog", { name: "오후의 식탁" });
  const approveButton = within(drawer).getByRole("button", { name: "승인" });
  expect(approveButton).toBeEnabled();

  fireEvent.click(approveButton);
  expect(screen.getByRole("dialog", { name: "매장 신청 승인" })).toBeInTheDocument();
});

test("closes the rejection dialog and keeps the submitted reason in the detail", async () => {
  storeAuth({
    roles: ["OPERATOR"],
    permissions: [
      "ADMIN_ACCESS",
      "STORE_READ",
      "STORE_APPROVE",
      "DASHBOARD_READ",
    ],
  });

  renderAt("/admin/store-approvals");

  expect((await screen.findAllByText("오후의 식탁")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole("button", { name: "검토" })[0]);

  const drawer = await screen.findByRole("dialog", { name: "오후의 식탁" });
  fireEvent.click(within(drawer).getByRole("button", { name: "반려" }));

  const rejectDialog = screen.getByRole("dialog", { name: "매장 신청 반려" });
  fireEvent.change(within(rejectDialog).getByLabelText("처리 사유"), {
    target: { value: "사업자 정보와 신청 정보가 일치하지 않습니다." },
  });
  fireEvent.click(within(rejectDialog).getByRole("button", { name: "반려하기" }));

  expect(
    screen.queryByRole("dialog", { name: "매장 신청 반려" })
  ).not.toBeInTheDocument();
  expect(
    await within(drawer).findByText("사업자 정보와 신청 정보가 일치하지 않습니다.")
  ).toBeInTheDocument();
  expect(within(drawer).getByText("필수 서류 누락")).toBeInTheDocument();
});

test("changes an approved application directly to rejected with a reason", async () => {
  storeAuth({
    roles: ["OPERATOR"],
    permissions: [
      "ADMIN_ACCESS",
      "STORE_READ",
      "STORE_APPROVE",
      "DASHBOARD_READ",
    ],
  });

  renderAt("/admin/store-approvals");

  expect((await screen.findAllByText("제주 초록상")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole("button", { name: "검토" })[3]);

  const drawer = await screen.findByRole("dialog", { name: "제주 초록상" });
  fireEvent.click(within(drawer).getByRole("button", { name: "반려" }));

  const rejectDialog = screen.getByRole("dialog", { name: "매장 신청 반려" });
  fireEvent.change(within(rejectDialog).getByLabelText("처리 사유"), {
    target: { value: "운영 정책상 승인할 수 없는 정보가 확인됐습니다." },
  });
  fireEvent.click(
    within(rejectDialog).getByRole("button", { name: "반려하기" })
  );

  expect(
    screen.queryByRole("dialog", { name: "매장 신청 반려" })
  ).not.toBeInTheDocument();
  expect(
    await screen.findByText("제주 초록상 신청을 반려 처리했습니다.")
  ).toBeInTheDocument();
  expect(
    within(drawer).getByText("운영 정책상 승인할 수 없는 정보가 확인됐습니다.")
  ).toBeInTheDocument();
  expect(within(drawer).getByRole("button", { name: "승인" })).toBeEnabled();
});

test("changes a rejected application directly back to approved", async () => {
  storeAuth({
    roles: ["OPERATOR"],
    permissions: [
      "ADMIN_ACCESS",
      "STORE_READ",
      "STORE_APPROVE",
      "DASHBOARD_READ",
    ],
  });

  renderAt("/admin/store-approvals");

  expect((await screen.findAllByText("산골 국수")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole("button", { name: "검토" })[4]);

  const drawer = await screen.findByRole("dialog", { name: "산골 국수" });
  fireEvent.click(within(drawer).getByRole("button", { name: "승인" }));

  const approveDialog = screen.getByRole("dialog", { name: "매장 신청 승인" });
  expect(
    within(approveDialog).getByText(
      "산골 국수의 반려 상태를 승인으로 변경하고 운영 매장으로 전환할까요?"
    )
  ).toBeInTheDocument();
  fireEvent.click(
    within(approveDialog).getByRole("button", { name: "승인하기" })
  );

  expect(
    await screen.findByText("산골 국수 신청을 승인 처리했습니다.")
  ).toBeInTheDocument();
  expect(within(drawer).getByRole("button", { name: "반려" })).toBeEnabled();
});

test("keeps approval actions unavailable for viewer role", async () => {
  storeAuth({
    roles: ["VIEWER"],
    permissions: ["ADMIN_ACCESS", "STORE_READ", "DASHBOARD_READ"],
  });

  renderAt("/admin/store-approvals");

  expect((await screen.findAllByText("오후의 식탁")).length).toBeGreaterThan(0);
  fireEvent.click(screen.getAllByRole("button", { name: "검토" })[0]);

  const drawer = await screen.findByRole("dialog", { name: "오후의 식탁" });
  expect(
    within(drawer).getByText("조회 권한만 있어 승인 상태를 변경할 수 없습니다.")
  ).toBeInTheDocument();
  expect(within(drawer).queryByRole("button", { name: "승인" })).not.toBeInTheDocument();
});

test("provides mobile approval cards and collapsible filters", async () => {
  storeAuth({
    roles: ["OPERATOR"],
    permissions: [
      "ADMIN_ACCESS",
      "STORE_READ",
      "STORE_APPROVE",
      "DASHBOARD_READ",
    ],
  });

  renderAt("/admin/store-approvals");

  const filterToggle = screen.getByRole("button", {
    name: "상세 필터 열기",
  });
  expect(filterToggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.click(filterToggle);
  expect(
    screen.getByRole("button", { name: "상세 필터 닫기" })
  ).toHaveAttribute("aria-expanded", "true");

  const mobileList = screen.getByLabelText("모바일 매장 승인 목록");
  expect(
    await within(mobileList).findByRole("button", {
      name: "모닝 베이크 신청 상세 검토",
    })
  ).toBeInTheDocument();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("connects the admin store menu to the admin restaurant API", async () => {
  storeAuth({
    roles: ["ADMIN"],
    permissions: [
      "ADMIN_ACCESS",
      "DASHBOARD_READ",
      "RESTAURANT_MANAGE",
    ],
  });

  const fetchSpy = jest.spyOn(global, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => ({
      content: [
        {
          id: 17,
          title: "관리자 테스트 매장",
          address: "서울시 중구",
          categories: ["KOREAN"],
          exposureStatus: "published",
          menuCount: 2,
          updatedAt: "2026-08-28T00:00:00Z",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    }),
    text: async () => "",
    blob: async () => new Blob(),
  });

  renderAt("/admin/stores");

  expect(screen.getByRole("link", { name: "매장 관리" })).toHaveAttribute(
    "href",
    "/admin/stores"
  );
  expect(await screen.findByText("관리자 테스트 매장")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "상세" })).toHaveAttribute(
    "href",
    "/admin/stores/17"
  );

  await waitFor(() => {
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/api/admin/restaurants?page=0&size=20"),
      expect.any(Object)
    );
  });

  fetchSpy.mockRestore();
});

test("creates a seasonal curation from the admin menu", async () => {
  storeAuth({
    roles: ["CONTENT_MANAGER"],
    permissions: [
      "ADMIN_ACCESS",
      "DASHBOARD_READ",
      "SEASONAL_READ",
      "SEASONAL_MANAGE",
    ],
  });

  const originalCreateObjectURL = URL.createObjectURL;
  const originalRevokeObjectURL = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => "blob:seasonal-preview");
  URL.revokeObjectURL = jest.fn();

  const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url, options = {}) => {
    const method = options.method || "GET";
    const isFileUpload = String(url).endsWith("/api/admin/seasonal-curations/files");
    const body = isFileUpload
      ? {
          data: {
            fileUrl: "https://cdn.example.com/seasonal/autumn.webp",
            originalName: "autumn.webp",
            mimeType: "image/webp",
            fileSizeBytes: 4,
          },
        }
      : method === "POST"
      ? {
          data: {
            id: 31,
            title: "가을 제철 생선",
            status: "DRAFT",
            displayOrder: 0,
            month: 9,
            storeIds: [],
            menuIds: [],
            version: 0,
            cardImageUrl: "https://cdn.example.com/seasonal/autumn.webp",
          },
        }
      : {
          data: {
            content: [],
            page: 0,
            size: 20,
            totalElements: 0,
            totalPages: 0,
            hasNext: false,
          },
        };

    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => body,
      text: async () => "",
      blob: async () => new Blob(),
    };
  });

  renderAt("/admin/seasonal-curations");

  expect(screen.getByRole("link", { name: "제철 큐레이션" })).toHaveAttribute(
    "href",
    "/admin/seasonal-curations"
  );
  fireEvent.change(screen.getByLabelText("제목 *"), {
    target: { value: "가을 제철 생선" },
  });
  fireEvent.change(screen.getByLabelText("월 *"), {
    target: { value: "9" },
  });
  fireEvent.change(screen.getAllByLabelText("이미지 선택")[0], {
    target: {
      files: [new File([new Uint8Array([0x52, 0x49, 0x46, 0x46])], "autumn.webp", { type: "image/webp" })],
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "등록하기" }));

  expect(await screen.findByText("제철 큐레이션을 등록했습니다.")).toBeInTheDocument();
  await waitFor(() => {
    const createCall = fetchSpy.mock.calls.find(
      ([url, options]) =>
        String(url).endsWith("/api/admin/seasonal-curations") && options?.method === "POST"
    );
    expect(createCall).toBeTruthy();
    expect(JSON.parse(createCall[1].body)).toEqual(
      expect.objectContaining({
        title: "가을 제철 생선",
        month: 9,
        cardImageUrl: "https://cdn.example.com/seasonal/autumn.webp",
      })
    );
  });

  expect(
    fetchSpy.mock.calls.some(
      ([url, options]) =>
        String(url).endsWith("/api/admin/seasonal-curations/files") &&
        options?.method === "POST" &&
        options?.body instanceof FormData
    )
  ).toBe(true);
  URL.createObjectURL = originalCreateObjectURL;
  URL.revokeObjectURL = originalRevokeObjectURL;
}, 15000);

test("imports app foods explicitly and refreshes the administrator list", async () => {
  storeAuth({roles: ["CONTENT_MANAGER"], permissions: ["ADMIN_ACCESS", "SEASONAL_READ", "SEASONAL_MANAGE"]});
  let imported = false;
  const fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url, options = {}) => {
    const isImport = String(url).endsWith("/import-foods");
    if (isImport) imported = true;
    const data = isImport ? {created: 1} : {content: imported ? [{id: 99, title: "대하", status: "DRAFT", month: 9, version: 0}] : [], totalElements: imported ? 1 : 0, page: 0, size: 20, totalPages: 1};
    return {ok: true, status: 200, headers: {get: () => "application/json"}, json: async () => ({data}), text: async () => ""};
  });
  renderAt("/admin/seasonal-curations");
  const button = screen.getByRole("button", {name: "앱 식재료 가져오기"});
  await waitFor(() => expect(button).toBeEnabled());
  expect(imported).toBe(false);
  fireEvent.click(button);
  expect(await screen.findByText("대하")).toBeInTheDocument();
  expect(screen.getByText(/1개 식재료를 현재 관리자 계정의 초안으로/)).toBeInTheDocument();
  expect(fetchSpy.mock.calls.some(([url, options]) => String(url).endsWith("/import-foods") && options.method === "POST")).toBe(true);
  fetchSpy.mockRestore();
});
