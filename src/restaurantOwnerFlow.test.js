import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "./App";

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
  const header = encodeBase64UrlJson({ alg: "none", typ: "JWT" });
  const payload = encodeBase64UrlJson({
      sub: "owner@example.com",
      displayName: "Store Owner",
      permissions: ["OWNER_ACCESS"],
      ...claims,
  });

  return `${header}.${payload}.signature`;
}

function encodeBase64UrlJson(value) {
  return window
    .btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
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
  window.sessionStorage.clear();
  window.history.pushState({}, "", "/");
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("redirects unauthenticated restaurant managers to login", () => {
  renderAt("/business/stores");

  expect(screen.getByRole("heading", { name: "비즈니스 로그인" })).toBeInTheDocument();
  expect(screen.getByText("BUSINESS ACCESS")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "매장 관리" })).not.toBeInTheDocument();
});

test.each(["/business", "/business/signup", "/business/stores/new"])("requires login before applying at %s", (path) => {
  renderAt(path);
  expect(screen.getByRole("heading", { name: "비즈니스 로그인" })).toBeInTheDocument();
  expect(screen.queryByLabelText("담당자 이름")).not.toBeInTheDocument();
  expect(global.fetch).not.toHaveBeenCalled();
});

test("shows the application status navigation from regular pages after login", async () => {
  storeAuth();
  global.fetch.mockResolvedValue(
    await createJsonResponse({
      content: [],
      page: 0,
      size: 20,
      totalElements: 0,
      totalPages: 1,
    })
  );

  renderAt("/faq");

  expect(screen.queryByText("식당 파트너")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "식당 점주" })).toHaveAttribute(
    "href",
    "/business/dashboard"
  );
  expect(await screen.findByText(/조회된 FAQ가 없습니다/)).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("분류"), {
    target: { value: "account" },
  });
  fireEvent.change(screen.getByLabelText("검색어"), {
    target: { value: "비밀번호" },
  });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));

  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
  const lastRequestUrl = global.fetch.mock.calls.at(-1)[0];
  expect(lastRequestUrl).toContain("/api/faqs?");
  expect(lastRequestUrl).toContain("category=account");
  expect(decodeURIComponent(lastRequestUrl)).toContain("keyword=비밀번호");
});

test("decodes Korean display names from JWT claims", () => {
  storeAuth({
    displayName: "김사장",
    permissions: [],
  });

  renderAt("/business/signup");

  expect(screen.getByText("김사장")).toBeInTheDocument();
});

test("shows owner shell and loads linked stores", async () => {
  storeAuth();
  global.fetch.mockResolvedValueOnce(
    await createJsonResponse({
      data: {
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
      },
    })
  );

  renderAt("/business/stores");

  expect(screen.getByRole("heading", { level: 1, name: "내 매장 관리" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "내 매장 관리" })).toHaveAttribute("href", "/business/stores");
  expect(screen.getByRole("link", { name: "새 입점 신청" })).toHaveAttribute("href", "/business/signup");
  expect(await screen.findByText("플레이팅 키친 강남점")).toBeInTheDocument();
  expect(screen.getAllByText("즉시 노출").length).toBeGreaterThan(0);
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/owner/stores?page=0&size=20"),
    expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: expect.stringContaining("Bearer "),
      }),
    })
  );
});

test("shows an owner dashboard with tasks and recent performance", async () => {
  storeAuth();
  global.fetch
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          content: [
            {
              id: 7,
              title: "플레이팅 키친 강남점",
              address: "서울 강남구 테헤란로 123",
              categories: ["한식"],
              exposureStatus: "published",
              menuCount: 2,
              updatedAt: "2026-07-10T09:00:00Z",
            },
          ],
          page: 0,
          size: 20,
          totalElements: 1,
          totalPages: 1,
          hasNext: false,
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          content: [
            {
              applicationId: 100,
              storeName: "플레이팅 키친 강남점",
              approvalStatus: "approved",
              updatedAt: "2026-07-10T09:00:00Z",
            },
          ],
          page: 0,
          size: 5,
          totalElements: 1,
          totalPages: 1,
          hasNext: false,
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          id: 7,
          title: "플레이팅 키친 강남점",
          address: "서울 강남구 테헤란로 123",
          categories: ["한식"],
          phone: "",
          businessHours: "11:00-21:00",
          exposureStatus: "published",
          media: [],
          menus: [
            {
              id: 1,
              name: "대표 파스타",
            },
          ],
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          source: {
            storeId: 7,
            hasLinkedContent: true,
            hasLinkedVideoContent: true,
            hasLinkedImageContent: false,
            videoStoreIds: [301],
            imageFeedIds: [],
          },
          metrics: [
            {
              key: "homeImpressions",
              value: 1200,
            },
            {
              key: "storeDetailViews",
              value: 210,
            },
            {
              key: "directionClicks",
              value: 16,
            },
            {
              key: "phoneClicks",
              value: 9,
            },
          ],
        },
      })
    );

  renderAt("/business/dashboard");

  expect(await screen.findByRole("heading", { name: "매장 운영 현황" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "매장 운영 현황" })).toHaveAttribute("href", "/business/dashboard");
  expect((await screen.findAllByText("플레이팅 키친 강남점")).length).toBeGreaterThan(0);
  expect(screen.getByRole("heading", { name: "먼저 보면 좋은 항목" })).toBeInTheDocument();
  expect(screen.getAllByText("대표 이미지").length).toBeGreaterThan(0);
  expect(screen.getByText("전화 클릭 수")).toBeInTheDocument();
  expect(screen.getByText("1,200")).toBeInTheDocument();

  const requestUrls = global.fetch.mock.calls.map(([url]) => String(url));
  const summaryUrl = requestUrls.find((url) => url.includes("/api/owner/stores/7/analytics/summary?"));

  expect(requestUrls.some((url) => url.includes("/api/owner/stores?page=0&size=20"))).toBe(true);
  expect(requestUrls.some((url) => url.includes("/api/owner/store-applications?page=0&size=5"))).toBe(true);
  expect(requestUrls.some((url) => url.includes("/api/owner/stores/7"))).toBe(true);
  expect(summaryUrl).toBeTruthy();
  expect(summaryUrl).toMatch(/from=\d{4}-\d{2}-\d{2}/);
  expect(summaryUrl).toMatch(/to=\d{4}-\d{2}-\d{2}/);
  expect(summaryUrl).not.toContain("T00%3A00%3A00");
});

test("switches the dashboard snapshot between stores and labels partial status counts", async () => {
  storeAuth();
  global.fetch
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          content: [
            { id: 7, title: "강남점", exposureStatus: "published" },
            { id: 8, title: "성수점", exposureStatus: "draft" },
          ],
          page: 0,
          size: 20,
          totalElements: 25,
          totalPages: 2,
          hasNext: true,
        },
      })
    )
    .mockResolvedValueOnce(await createJsonResponse({ data: { content: [] } }))
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: { id: 7, title: "강남점", address: "서울 강남구", categories: [], media: [], menus: [] },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({ data: { source: { hasLinkedContent: true }, metrics: [] } })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: { id: 8, title: "성수점", address: "서울 성동구", categories: [], media: [], menus: [] },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: { source: { hasLinkedContent: true }, metrics: [{ key: "homeImpressions", value: 88 }] },
      })
    );

  renderAt("/business/dashboard");

  expect(await screen.findByLabelText("기준 매장")).toHaveValue("7");
  expect(screen.getAllByText("불러온 2개 매장 기준")).toHaveLength(3);

  fireEvent.change(screen.getByLabelText("기준 매장"), { target: { value: "8" } });

  expect(await screen.findByText("서울 성동구")).toBeInTheDocument();
  expect(await screen.findByText("88")).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/owner/stores/8/analytics/summary?"),
    expect.any(Object)
  );
});

test("loads store analytics from the owner store detail", async () => {
  storeAuth();
  global.fetch
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          id: 7,
          title: "플레이팅 키친 강남점",
          address: "서울 강남구 테헤란로 123",
          categories: ["한식"],
          exposureStatus: "published",
          media: [],
          menus: [],
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          source: {
            storeId: 7,
            storeName: "플레이팅 키친 강남점",
            hasLinkedVideoContent: true,
            hasLinkedImageContent: true,
            hasLinkedContent: true,
            videoStoreIds: [301],
            imageFeedIds: [1204],
          },
          from: "2026-07-01",
          to: "2026-07-07",
          metrics: [
            {
              key: "homeImpressions",
              label: "Home impressions",
              value: 1200,
              changeRate: 12.5,
              unit: "count",
            },
            {
              key: "videoViews",
              label: "Video views",
              value: 340,
              changeRate: -3.2,
              unit: "count",
            },
            {
              key: "imageImpressions",
              label: "Image impressions",
              value: 300,
              changeRate: 8,
              unit: "count",
            },
            {
              key: "activeImageLikes",
              label: "Active image likes",
              value: 44,
              changeRate: null,
              unit: "count",
            },
          ],
          watch: {
            totalViews: 340,
            uniqueViewers: 210,
            completedViews: 90,
            averageWatchSeconds: 18.43,
            completionRate: 0.2647,
          },
          funnel: {
            impressions: 1100,
            clicks: 180,
            plays: 150,
            completes: 70,
            hides: 3,
            reports: 1,
            clickThroughRate: 0.1636,
            playRate: 0.1364,
            completeRate: 0.4667,
          },
          storeActions: {
            detailViews: 210,
            mapImpressions: 80,
            searchImpressions: 45,
            phoneClicks: 9,
            directionClicks: 16,
            shareClicks: 3,
            menuViews: 52,
            visitConversions: 2,
          },
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          source: {
            storeId: 7,
            hasLinkedVideoContent: true,
            hasLinkedImageContent: true,
            hasLinkedContent: true,
            videoStoreIds: [301],
            imageFeedIds: [1204],
          },
          from: "2026-07-01",
          to: "2026-07-07",
          interval: "day",
          points: [
            {
              date: "2026-07-01",
              impressions: 130,
              views: 42,
              completedViews: 11,
              saves: 2,
              imageLikes: 5,
              comments: 1,
              detailViews: 18,
              phoneClicks: 1,
              directionClicks: 2,
            },
          ],
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          source: {
            storeId: 7,
            hasLinkedVideoContent: true,
            hasLinkedImageContent: true,
            hasLinkedContent: true,
            videoStoreIds: [301],
            imageFeedIds: [1204],
          },
          from: "2026-07-01",
          to: "2026-07-07",
          content: [
            {
              contentType: "video",
              contentId: 301,
              videoStoreId: 301,
              feedId: null,
              title: "신메뉴 버거 소개",
              createdAt: "2026-06-30",
              impressions: 900,
              views: 240,
              uniqueViewers: 160,
              completedViews: 62,
              averageWatchSeconds: 20.1,
              completionRate: 0.2583,
              activeSaveCount: 61,
              newSaveCount: 10,
              commentCount: 6,
            },
            {
              contentType: "image",
              contentId: 1204,
              videoStoreId: null,
              feedId: 1204,
              title: "이미지 방문 기록",
              createdAt: "2026-07-02",
              impressions: 300,
              views: 0,
              uniqueViewers: 0,
              completedViews: 0,
              averageWatchSeconds: 0,
              completionRate: 0,
              activeSaveCount: 44,
              newSaveCount: 7,
              commentCount: 9,
            },
          ],
          page: 0,
          size: 20,
          totalElements: 2,
          totalPages: 1,
          hasNext: false,
        },
      })
    );

  renderAt("/business/stores/7");

  expect(await screen.findByRole("heading", { name: "플레이팅 키친 강남점" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("tab", { name: "성과" }));

  expect(await screen.findByText("홈 노출")).toBeInTheDocument();
  expect(screen.getByText("영상 조회")).toBeInTheDocument();
  expect(screen.getByText("이미지 노출")).toBeInTheDocument();
  expect(screen.getByText("이미지 좋아요")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "고객이 매장에서 한 행동" })).toBeInTheDocument();
  expect(screen.getByText("일자별 노출과 조회")).toBeInTheDocument();
  expect(screen.getByText("신메뉴 버거 소개")).toBeInTheDocument();
  expect(screen.getByText("이미지 방문 기록")).toBeInTheDocument();
  expect(screen.getByText("이미지")).toBeInTheDocument();

  const requestUrls = global.fetch.mock.calls.map(([url]) => String(url));
  const summaryUrl = requestUrls.find((url) => url.includes("/api/owner/stores/7/analytics/summary?"));
  const trendsUrl = requestUrls.find((url) => url.includes("/api/owner/stores/7/analytics/trends?"));
  const contentsUrl = requestUrls.find((url) => url.includes("/api/owner/stores/7/analytics/contents?"));

  expect(summaryUrl).toBeTruthy();
  expect(trendsUrl).toBeTruthy();
  expect(contentsUrl).toBeTruthy();
  expect(summaryUrl).toMatch(/from=\d{4}-\d{2}-\d{2}/);
  expect(summaryUrl).toMatch(/to=\d{4}-\d{2}-\d{2}/);
  expect(summaryUrl).not.toContain("T00%3A00%3A00");
  expect(trendsUrl).toContain("interval=day");
  expect(contentsUrl).toContain("page=0");
  expect(contentsUrl).toContain("size=20");
});

test("keeps internal operators out of owner-only business routes", async () => {
  storeAuth({
    roles: ["ADMIN"],
    permissions: ["ADMIN_ACCESS", "STORE_READ"],
  });

  renderAt("/business/stores");

  expect(await screen.findByRole("heading", { name: "자주 묻는 질문" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "매장 관리" })).not.toBeInTheDocument();
});

test("allows signed-in applicants without owner permission to see application status", async () => {
  storeAuth({
    permissions: [],
  });
  global.fetch.mockResolvedValueOnce(
    await createJsonResponse({
      data: {
        content: [
          {
            applicationId: 100,
            storeName: "검토 중인 식당",
            approvalStatus: "pending",
            verificationStatus: "reviewing",
            updatedAt: "2026-06-17T09:00:00Z",
            version: 1,
          },
        ],
        page: 0,
        size: 20,
        totalElements: 1,
        totalPages: 1,
        hasNext: false,
      },
    })
  );

  renderAt("/business/applications");

  expect(await screen.findByText("검토 중인 식당")).toBeInTheDocument();
  expect(screen.getByText("검토 중")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "매장 관리" })).not.toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/owner/store-applications?page=0&size=20"),
    expect.objectContaining({
      method: "GET",
      headers: expect.objectContaining({
        Authorization: expect.stringContaining("Bearer "),
      }),
    })
  );
});

test("shows the rejection reason to the applicant on the application detail", async () => {
  storeAuth({ permissions: [] });
  global.fetch.mockResolvedValueOnce(
    await createJsonResponse({
      data: {
        applicationId: 100,
        store: {
          storeName: "반려된 식당",
          address: "서울 강남구 테헤란로 123",
        },
        ownerProfile: {},
        business: {},
        categories: [],
        menus: [],
        approvalStatus: "rejected",
        verificationStatus: "verified",
        reviews: [
          {
            reasonCode: "BUSINESS_INFO_MISMATCH",
            reason: "사업자 정보와 신청 정보가 일치하지 않습니다.",
          },
        ],
        appliedAt: "2026-06-17T09:00:00Z",
        updatedAt: "2026-06-18T09:00:00Z",
        version: 2,
      },
    })
  );

  renderAt("/business/applications/100");

  expect(
    await screen.findByRole("heading", { name: "입점 신청이 반려되었습니다." })
  ).toBeInTheDocument();
  expect(screen.getByText("사업자 정보 불일치")).toBeInTheDocument();
  expect(
    screen.getByText("사업자 정보와 신청 정보가 일치하지 않습니다.")
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "운영팀에 문의하기" })).toHaveAttribute(
    "href",
    "/qna"
  );
});

test("redirects legacy new-store route to business signup", () => {
  storeAuth();

  renderAt("/business/stores/new");

  expect(screen.getByRole("heading", { name: "식당 입점 신청" })).toBeInTheDocument();
  expect(screen.getByText("담당자 정보")).toBeInTheDocument();
});

test("submits an application as a logged-in member without owner permission", async () => {
  storeAuth({ permissions: [] });
  global.fetch
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          verified: true,
          verificationStatus: "verified",
          message: "사업자 정보가 확인되었습니다.",
          provider: "NTS",
          verifiedAt: "2026-06-17T09:10:00Z",
        },
      })
    )
    .mockResolvedValueOnce(await createJsonResponse({ data: { applicationId: 100, approvalStatus: "draft" } }))
    .mockResolvedValueOnce(await createJsonResponse({ data: { applicationId: 100, version: 1 } }))
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          applicationId: 100,
          approvalStatus: "pending",
          verificationStatus: "reviewing",
          version: 2,
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          applicationId: 100,
          store: {
            storeName: "새로운 식당",
            address: "서울 강남구 테헤란로 123",
          },
          ownerProfile: {
            ownerName: "김사장",
            ownerPhone: "010-1234-5678",
            ownerEmail: "owner@example.com",
          },
          business: {
            businessName: "플레이트컴퍼니",
            businessNumber: "123-**-*****",
          },
          categories: [{ categoryCode: "KOREAN", displayOrder: 0 }],
          menus: [],
          documents: [],
          approvalStatus: "pending",
          verificationStatus: "reviewing",
          appliedAt: "2026-06-17T09:00:00Z",
          updatedAt: "2026-06-17T09:00:00Z",
          version: 2,
        },
      })
    );

  renderAt("/business/signup");

  expect(screen.queryByLabelText("회원 ID")).not.toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("담당자 이름"), {
    target: { value: "김사장" },
  });
  fireEvent.change(screen.getByLabelText("담당자 연락처"), {
    target: { value: "01012345678" },
  });
  expect(screen.getByLabelText("담당자 연락처")).toHaveValue("010-1234-5678");
  fireEvent.click(screen.getByRole("button", { name: "다음" }));

  fireEvent.change(screen.getByLabelText("사업자등록번호"), {
    target: { value: "1234567890" },
  });
  expect(screen.getByLabelText("사업자등록번호")).toHaveValue("123-45-67890");
  fireEvent.change(screen.getByLabelText("대표자명"), {
    target: { value: "김대표" },
  });
  fireEvent.change(screen.getByLabelText("개업일자"), {
    target: { value: "2024-01-15" },
  });
  fireEvent.change(screen.getByLabelText("상호명"), {
    target: { value: "플레이트컴퍼니" },
  });
  fireEvent.click(screen.getByRole("button", { name: "사업자등록번호 확인" }));
  expect(await screen.findByText("사업자 정보가 확인되었습니다.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다음" }));

  fireEvent.change(screen.getByLabelText("매장명"), {
    target: { value: "새로운 식당" },
  });
  fireEvent.change(screen.getByLabelText("매장 연락처"), {
    target: { value: "0212345678" },
  });
  expect(screen.getByLabelText("매장 연락처")).toHaveValue("02-1234-5678");
  fireEvent.change(screen.getByLabelText("주소"), {
    target: { value: "서울 강남구 테헤란로 123" },
  });
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  fireEvent.click(screen.getByRole("button", { name: "다음" }));
  fireEvent.click(screen.getByRole("button", { name: "입점 신청 제출" }));

  expect(await screen.findByText("입점 신청이 접수되었습니다. 운영팀 검토가 끝나면 상태가 변경됩니다.")).toBeInTheDocument();
  expect(await screen.findByText("운영팀이 신청 정보를 검토 중입니다.")).toBeInTheDocument();
  expect(screen.getByText("한식")).toBeInTheDocument();
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/business-verifications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"representativeName":"김대표"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/store-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"storeName":"새로운 식당"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/store-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"ownerPhone":"010-1234-5678"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/store-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"businessNumber":"123-45-67890"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/store-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"openingDate":"2024-01-15"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/store-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"phone":"02-1234-5678"'),
      })
    );
  });
  expect(global.fetch.mock.calls.some(([url]) => url.includes("/signup-applications"))).toBe(false);
  const createCall = global.fetch.mock.calls.find(([url, options]) => url.endsWith("/api/owner/store-applications") && options.method === "POST");
  expect(createCall[1].headers.Authorization).toBe(`Bearer ${createAccessToken({ permissions: [] })}`);
  expect(JSON.parse(createCall[1].body)).not.toHaveProperty("account");
  expect(global.fetch).not.toHaveBeenCalledWith(
    expect.stringContaining("/api/owner/store-applications/100/documents?documentType=business_registration"),
    expect.anything()
  );
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/owner/store-applications/100/submit"),
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"version":1'),
    })
  );
});


test.each([false, true])("returns to the application after authentication (new account: %s)", async (newAccount) => {
  if (newAccount) global.fetch.mockResolvedValueOnce(await createJsonResponse({ data: {} }));
  global.fetch.mockResolvedValueOnce(await createJsonResponse({ data: {
    accessToken: createAccessToken({ permissions: [] }), refreshToken: "refresh-token",
  } }));
  renderAt("/business/signup");
  if (newAccount) {
    fireEvent.click(screen.getByRole("link", { name: "회원가입" }));
    for (const [label, value] of [["회원 ID", "newowner"], ["닉네임", "새사장"], ["이메일", "new@example.com"], ["비밀번호", "password123"], ["비밀번호 확인", "password123"]]) {
      fireEvent.change(screen.getByLabelText(label === "회원 ID" ? /^회원 ID/ : label === "비밀번호" ? /^비밀번호\s*비밀번호는/ : label), { target: { value } });
    }
    fireEvent.click(screen.getByLabelText("이용약관에 동의합니다."));
    fireEvent.click(screen.getByLabelText("개인정보 처리방침에 동의합니다."));
    fireEvent.click(screen.getByRole("button", { name: "가입하기" }));
    expect(await screen.findByRole("heading", { name: "비즈니스 로그인" })).toBeInTheDocument();
  }
  fireEvent.change(screen.getByLabelText("아이디"), { target: { value: "newowner" } });
  fireEvent.change(screen.getByLabelText("비밀번호"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(await screen.findByRole("heading", { name: "식당 입점 신청" })).toBeInTheDocument();
  expect(screen.getByLabelText("담당자 이름")).toBeInTheDocument();
  expect(screen.queryByLabelText("회원 ID")).not.toBeInTheDocument();
  expect(window.location.pathname).toBe("/business/signup");
});


test("keeps the application destination when switching from signup through the header login", () => {
  renderAt("/business/signup");
  fireEvent.click(screen.getByRole("link", { name: "회원가입" }));
  fireEvent.click(screen.getByRole("button", { name: "로그인" }));
  expect(screen.getByRole("heading", { name: "비즈니스 로그인" })).toBeInTheDocument();
  expect(window.history.state.usr.from).toBe("/business/signup");
});
