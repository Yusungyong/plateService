import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import MediaUploadField from "./components/MediaUploadField";

const AUTH_STORAGE_KEY = "plate-service.auth";

function createJsonResponse(payload, options = {}) {
  return Promise.resolve({
    ok: options.ok ?? true,
    status: options.status ?? 200,
    headers: {
      get(name) {
        return name.toLowerCase() === "content-type" ? "application/json" : "";
      },
    },
    json: () => Promise.resolve(payload),
  });
}

function createAccessToken(claims = {}) {
  const header = window.btoa(JSON.stringify({ alg: "none", typ: "JWT" }));
  const payload = window.btoa(
    JSON.stringify({
      sub: "owner@example.com",
      displayName: "Store Owner",
      permissions: ["RESTAURANT_MANAGE"],
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
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("redirects unauthenticated restaurant managers to login", () => {
  renderAt("/admin/restaurants");

  expect(screen.getByRole("heading", { name: "고객 지원 센터" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "내 가게 관리" })).not.toBeInTheDocument();
});

test("shows restaurant manager shell and loads linked stores", async () => {
  storeAuth();
  global.fetch.mockResolvedValueOnce(
    await createJsonResponse({
      content: [
        {
          id: 7,
          title: "플레이팅 키친 강남점",
          address: "서울 강남구 테헤란로 123",
          categories: ["한식", "카페"],
          exposureStatus: "published",
          menuCount: 3,
          updatedAt: "2026-06-12T09:00:00Z",
        },
      ],
      page: 0,
      size: 20,
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    })
  );

  renderAt("/admin/restaurants");

  expect(screen.getAllByRole("heading", { name: "내 가게 관리" }).length).toBeGreaterThan(0);
  expect(screen.getByRole("link", { name: "내 가게 등록" })).toBeInTheDocument();
  expect(await screen.findByText("플레이팅 키친 강남점")).toBeInTheDocument();
  expect(screen.getAllByText("즉시 노출").length).toBeGreaterThan(0);
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/admin/restaurants?page=0&size=20"),
    expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: expect.stringContaining("Bearer "),
      }),
    })
  );
});

test("shows operator menu when logged in with admin authority", async () => {
  storeAuth({
    roles: ["ADMIN"],
    permissions: ["ADMIN_ACCESS", "RESTAURANT_MANAGE"],
  });
  global.fetch.mockResolvedValueOnce(
    await createJsonResponse({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 1,
      hasNext: false,
    })
  );

  renderAt("/admin/restaurants");

  expect(await screen.findByText("조회된 가게가 없습니다.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "FAQ 관리" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Q&A 관리" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "회원 모니터링" })).toBeInTheDocument();
});

test("shows previews for existing image and video media on the detail page", async () => {
  storeAuth();
  global.fetch.mockResolvedValueOnce(
    await createJsonResponse({
      data: {
        id: 42,
        title: "프리뷰 테스트 매장",
        address: "서울 중구 테스트로 1",
        categories: ["한식"],
        exposureStatus: "draft",
        media: [
          {
            id: 1,
            mediaType: "image",
            usageType: "representative",
            fileUrl: "https://cdn.example.com/store.jpg",
            originalName: "store.jpg",
          },
          {
            id: 2,
            mediaType: "video",
            usageType: "representative",
            fileUrl: "https://cdn.example.com/store.mp4",
            originalName: "store.mp4",
            mimeType: "video/mp4",
          },
        ],
        menus: [
          {
            id: 9,
            name: "테스트 메뉴",
            price: 12000,
            media: [
              {
                id: 3,
                mediaType: "image",
                usageType: "menu",
                fileUrl: "https://cdn.example.com/menu.jpg",
                originalName: "menu.jpg",
              },
              {
                id: 4,
                mediaType: "video",
                usageType: "menu",
                fileUrl: "https://cdn.example.com/menu.mp4",
                originalName: "menu.mp4",
                mimeType: "video/mp4",
              },
            ],
          },
        ],
      },
    })
  );

  const { container } = renderAt("/admin/restaurants/42");

  expect(await screen.findByText("store.jpg")).toBeInTheDocument();
  expect(screen.getByText("store.mp4")).toBeInTheDocument();
  expect(screen.getByText("menu.jpg")).toBeInTheDocument();
  expect(screen.getByText("menu.mp4")).toBeInTheDocument();
  expect(screen.getAllByAltText("이미지 미리보기")).toHaveLength(2);
  expect(container.querySelectorAll(".restaurant-existing-media__preview video")).toHaveLength(2);
  expect(screen.getAllByRole("link", { name: "원본 열기" })).toHaveLength(4);

  fireEvent.error(screen.getAllByAltText("이미지 미리보기")[0]);
  expect(screen.getByText("미리보기 불가")).toBeInTheDocument();
  expect(screen.getByText("원본 파일을 열어 확인해 주세요.")).toBeInTheDocument();
});

test("validates required fields before creating a store", async () => {
  storeAuth();
  renderAt("/admin/restaurant-registration");

  fireEvent.click(screen.getByRole("button", { name: "등록" }));

  expect((await screen.findAllByText("가게 이름을 입력해 주세요.")).length).toBeGreaterThan(0);
  expect(global.fetch).not.toHaveBeenCalled();
});

test("registers a store and exposes follow-up actions", async () => {
  storeAuth();
  global.fetch.mockResolvedValueOnce(await createJsonResponse({ data: { restaurantId: 42 } }));

  renderAt("/admin/restaurant-registration");

  fireEvent.change(screen.getByLabelText(/가게 이름/), {
    target: { value: "테스트 비스트로" },
  });
  fireEvent.change(screen.getByLabelText(/주소/), {
    target: { value: "서울 중구 테스트로 1" },
  });
  fireEvent.click(screen.getByRole("button", { name: "등록" }));

  expect(await screen.findByText("가게 정보가 등록되었습니다. 등록 ID: 42")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "등록한 가게 수정" })).toHaveAttribute(
    "href",
    "/admin/restaurants/42"
  );
  expect(screen.getByRole("link", { name: "내 가게 목록" })).toHaveAttribute(
    "href",
    "/admin/restaurants"
  );
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/admin/restaurants"),
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"title":"테스트 비스트로"'),
    })
  );
});

test("previews selected media and supports clearing the file", () => {
  URL.createObjectURL = jest.fn(() => "blob:preview");
  URL.revokeObjectURL = jest.fn();
  const handleChange = jest.fn();
  const file = new File(["x".repeat(2048)], "store.jpg", { type: "image/jpeg" });
  const { container, rerender } = render(
    <MediaUploadField
      label="가게 대표 이미지"
      accept="image/*"
      file={null}
      emptyText="대표 이미지를 선택해 주세요."
      onChange={handleChange}
    />
  );

  fireEvent.change(container.querySelector('input[type="file"]'), {
    target: { files: [file] },
  });

  expect(handleChange).toHaveBeenCalledWith(file);

  rerender(
    <MediaUploadField
      label="가게 대표 이미지"
      accept="image/*"
      file={file}
      emptyText="대표 이미지를 선택해 주세요."
      onChange={handleChange}
    />
  );

  expect(screen.getByAltText("가게 대표 이미지 미리보기")).toHaveAttribute("src", "blob:preview");
  expect(screen.getByText("store.jpg")).toBeInTheDocument();
  expect(screen.getByText("2.0KB")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "선택 취소" }));
  rerender(
    <MediaUploadField
      label="가게 대표 이미지"
      accept="image/*"
      file={null}
      emptyText="대표 이미지를 선택해 주세요."
      onChange={handleChange}
    />
  );

  expect(handleChange).toHaveBeenLastCalledWith(null);
  expect(URL.createObjectURL).toHaveBeenCalledWith(file);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:preview");
});
