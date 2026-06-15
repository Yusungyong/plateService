import { normalizeDashboardData } from "./admin/api/adminDashboardApi";
import {
  normalizeStoreApprovalDetail,
  normalizeStoreApprovalPage,
} from "./admin/api/storeApprovalApi";
import {
  ADMIN_PERMISSIONS,
  userHasAdminAccess,
  userHasAdminPermission,
} from "./admin/constants/adminPermissions";

test("normalizes the server dashboard DTO for the admin UI", () => {
  const result = normalizeDashboardData({
    summary: {
      metrics: [
        {
          key: "newStoreApplications",
          label: "신규 매장 신청",
          value: 3,
          changeRate: 50,
          comparison: "previous_period",
        },
      ],
    },
    trends: [
      {
        date: "2026-06-15",
        activeStoreCount: 2,
        postCount: 4,
        reactionCount: 7,
      },
    ],
    regions: [
      {
        regionCode: "SEOUL",
        regionName: "서울",
        postCount: 9,
      },
    ],
    activities: {
      content: [
        {
          id: 1,
          occurredAt: "2026-06-15T01:00:00Z",
          resourceType: "STORE_APPROVAL",
          resourceId: "10",
          storeName: "테스트 매장",
          action: "STORE_APPROVED",
          actionLabel: "매장 승인",
          operatorName: "운영자",
          status: "approved",
        },
      ],
    },
  });

  expect(result.metrics[0]).toEqual(
    expect.objectContaining({
      value: 3,
      change: 50,
      note: "이전 기간 대비",
      tone: "primary",
    })
  );
  expect(result.activityTrends[0]).toEqual(
    expect.objectContaining({
      stores: 2,
      posts: 4,
      reactions: 7,
    })
  );
  expect(result.regionDistribution[0]).toEqual(
    expect.objectContaining({ region: "서울", count: 9 })
  );
  expect(result.recentActivities[0]).toEqual(
    expect.objectContaining({
      storeName: "테스트 매장",
      action: "매장 승인",
      operator: "운영자",
      status: "approved",
    })
  );
});

test("normalizes nested store approval codes and names", () => {
  const page = normalizeStoreApprovalPage({
    content: [
      {
        id: 10,
        name: "테스트 매장",
        categories: [{ code: "KOREAN", name: "한식" }],
        region: { code: "SEOUL", name: "서울" },
      },
    ],
    page: 0,
    size: 20,
    totalElements: 1,
    totalPages: 1,
    hasNext: false,
  });
  const detail = normalizeStoreApprovalDetail({
    ...page.content[0],
    region: { code: "SEOUL", name: "서울" },
    categories: [{ code: "KOREAN", name: "한식" }],
    representativeMenus: [{ id: 1, name: "비빔밥", price: 12000 }],
    documents: [{ id: 2, name: "사업자등록증.pdf" }],
    version: 4,
  });

  expect(page.content[0]).toEqual(
    expect.objectContaining({
      category: "한식",
      categoryCode: "KOREAN",
      region: "서울",
    })
  );
  expect(detail).toEqual(
    expect.objectContaining({
      category: "한식",
      region: "서울",
      version: 4,
    })
  );
});

test("requires ADMIN_ACCESS together with each granular permission", () => {
  const incompleteUser = {
    roles: ["OPERATOR"],
    permissions: ["STORE_READ"],
  };
  const operator = {
    roles: ["OPERATOR"],
    permissions: ["ADMIN_ACCESS", "STORE_READ", "STORE_APPROVE"],
  };

  expect(userHasAdminAccess(incompleteUser)).toBe(false);
  expect(userHasAdminAccess(operator)).toBe(true);
  expect(
    userHasAdminPermission(operator, ADMIN_PERMISSIONS.STORE_APPROVE)
  ).toBe(true);
  expect(
    userHasAdminPermission(operator, ADMIN_PERMISSIONS.FEED_MODERATE)
  ).toBe(false);
});
