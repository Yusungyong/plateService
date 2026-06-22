import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function createDeferred() {
  let resolve;
  const promise = new Promise((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
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

test("hides application status link during public business signup", () => {
  renderAt("/business/signup");

  expect(screen.getByRole("heading", { name: "식당 입점 신청" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "신청 현황 보기" })).not.toBeInTheDocument();
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

  expect(screen.getByText("식당 파트너")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "신청 현황" })).toHaveAttribute(
    "href",
    "/business/applications"
  );
  expect(await screen.findByText("조회된 FAQ가 없습니다.")).toBeInTheDocument();
});

test("checks business signup account fields on blur", async () => {
  global.fetch.mockResolvedValueOnce(
    await createJsonResponse({
      data: {
        field: "username",
        available: false,
        message: "이미 사용 중인 회원 ID입니다.",
      },
    })
  );

  renderAt("/business/signup");

  fireEvent.change(screen.getByLabelText("회원 ID"), {
    target: { value: "owner01" },
  });
  fireEvent.blur(screen.getByLabelText("회원 ID"));

  expect(await screen.findAllByText("이미 사용 중인 회원 ID입니다.")).toHaveLength(2);
  expect(global.fetch).toHaveBeenCalledWith(
    expect.stringContaining("/api/owner/signup-account-validations"),
    expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"value":"owner01"'),
    })
  );

});

test("ignores an outdated account validation response", async () => {
  const firstRequest = createDeferred();
  global.fetch
    .mockReturnValueOnce(firstRequest.promise)
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          field: "username",
          value: "owner02",
          available: true,
          message: "사용 가능한 회원 ID입니다.",
        },
      })
    );

  renderAt("/business/signup");

  const usernameInput = screen.getByLabelText("회원 ID");
  fireEvent.change(usernameInput, {
    target: { value: "owner01" },
  });
  fireEvent.blur(usernameInput);
  fireEvent.blur(usernameInput);
  expect(global.fetch).toHaveBeenCalledTimes(1);

  fireEvent.change(usernameInput, {
    target: { value: "owner02" },
  });
  fireEvent.blur(usernameInput);

  expect(await screen.findByText("사용 가능한 회원 ID입니다.")).toBeInTheDocument();

  const outdatedResponse = await createJsonResponse({
    data: {
      field: "username",
      value: "owner01",
      available: false,
      message: "이미 사용 중인 회원 ID입니다.",
    },
  });
  await act(async () => {
    firstRequest.resolve(outdatedResponse);
    await Promise.resolve();
  });

  expect(screen.queryByText("이미 사용 중인 회원 ID입니다.")).not.toBeInTheDocument();
  expect(screen.getByText("사용 가능한 회원 ID입니다.")).toBeInTheDocument();
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

  expect(screen.getByRole("heading", { name: "식당 비즈니스 센터" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "매장 관리" })).toHaveAttribute("href", "/business/stores");
  expect(screen.getByRole("link", { name: "새 가게 등록" })).toHaveAttribute("href", "/business/signup");
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

test("redirects legacy new-store route to business signup", () => {
  storeAuth();

  renderAt("/business/stores/new");

  expect(screen.getByRole("heading", { name: "식당 입점 신청" })).toBeInTheDocument();
  expect(screen.getByText("담당자 정보")).toBeInTheDocument();
});

test("submits a public business signup through the owner application API", async () => {
  global.fetch
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          field: "username",
          available: true,
          message: "사용 가능한 회원 ID입니다.",
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          field: "email",
          available: true,
          message: "사용 가능한 이메일입니다.",
        },
      })
    )
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          field: "nickname",
          available: true,
          message: "사용 가능한 닉네임입니다.",
        },
      })
    )
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
    .mockResolvedValueOnce(
      await createJsonResponse({
        data: {
          accessToken: createAccessToken({ permissions: [] }),
          refreshToken: "next-refresh-token",
        },
      })
    )
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

  fireEvent.change(screen.getByLabelText("회원 ID"), {
    target: { value: "owner01" },
  });
  fireEvent.blur(screen.getByLabelText("회원 ID"));
  fireEvent.change(screen.getByLabelText("이메일"), {
    target: { value: "owner@example.com" },
  });
  fireEvent.blur(screen.getByLabelText("이메일"));
  fireEvent.change(screen.getByLabelText("비밀번호"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("비밀번호 확인"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("닉네임"), {
    target: { value: "김사장" },
  });
  fireEvent.blur(screen.getByLabelText("닉네임"));
  expect(await screen.findByText("사용 가능한 회원 ID입니다.")).toBeInTheDocument();
  expect(await screen.findByText("사용 가능한 이메일입니다.")).toBeInTheDocument();
  expect(await screen.findByText("사용 가능한 닉네임입니다.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "다음" }));

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
  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-account-validations"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"field":"username"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-account-validations"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"field":"email"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-account-validations"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"field":"nickname"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/business-verifications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"representativeName":"김대표"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"storeName":"새로운 식당"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"ownerPhone":"010-1234-5678"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"businessNumber":"123-45-67890"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"openingDate":"2024-01-15"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"phone":"02-1234-5678"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"username":"owner01"'),
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/owner/signup-applications"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"email":"owner@example.com"'),
      })
    );
  });
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
