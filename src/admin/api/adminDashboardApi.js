import { apiClient } from "../../api";
import { dashboardSummary } from "../mocks/dashboard";
import {
  getDefaultDashboardRange,
  shouldUseAdminMocks,
  unwrapAdminResponse,
} from "./adminApiUtils";
import { mockRequest } from "./mockApiUtils";

const METRIC_PRESENTATION = {
  newStoreApplications: { tone: "primary", defaultNote: "이전 기간 대비" },
  pendingApprovals: { tone: "warning", defaultNote: "현재 대기" },
  activeStores: { tone: "success", defaultNote: "조회 기간" },
  userReports: { tone: "danger", defaultNote: "조회 기간" },
  seasonalMenus: { tone: "seasonal", defaultNote: "집계 준비 중" },
  regionalPosts: { tone: "neutral", defaultNote: "조회 기간" },
};

export async function getDashboardSummary(params = {}) {
  if (shouldUseAdminMocks()) {
    if (params.scenario === "error") {
      return mockRequest(null, {
        error: new Error("대시보드 데이터를 불러오지 못했습니다."),
      });
    }

    return mockRequest(dashboardSummary);
  }

  const range = {
    ...getDefaultDashboardRange(),
    ...params,
  };
  const dateQuery = {
    from: range.from,
    to: range.to,
  };

  const [summaryResponse, trendsResponse, regionsResponse, activitiesResponse] =
    await Promise.all([
      apiClient.get("/api/admin/dashboard/summary", { query: dateQuery }),
      apiClient.get("/api/admin/dashboard/activity-trends", {
        query: { ...dateQuery, interval: "day" },
      }),
      apiClient.get("/api/admin/dashboard/region-distribution", {
        query: dateQuery,
      }),
      apiClient.get("/api/admin/activities", {
        query: { page: 0, size: 20, sort: "occurredAt,desc" },
      }),
    ]);

  return normalizeDashboardData({
    summary: unwrapAdminResponse(summaryResponse),
    trends: unwrapAdminResponse(trendsResponse),
    regions: unwrapAdminResponse(regionsResponse),
    activities: unwrapAdminResponse(activitiesResponse),
  });
}

export function normalizeDashboardData({
  summary = {},
  trends = [],
  regions = [],
  activities = {},
} = {}) {
  return {
    metrics: (summary.metrics || []).map((metric) => {
      const presentation = METRIC_PRESENTATION[metric.key] || {
        tone: "neutral",
        defaultNote: "조회 기간",
      };

      return {
        key: metric.key,
        label: metric.label,
        value: metric.value,
        change: metric.changeRate,
        note: comparisonLabel(metric.comparison, presentation.defaultNote),
        tone: presentation.tone,
      };
    }),
    activityTrends: trends.map((item) => ({
      date: item.date,
      label: formatTrendLabel(item.date),
      stores: item.activeStoreCount,
      posts: item.postCount,
      reactions: item.reactionCount,
    })),
    regionDistribution: regions.map((item) => ({
      regionCode: item.regionCode,
      region: item.regionName || item.regionCode || "기타",
      count: item.postCount,
    })),
    recentActivities: (activities.content || []).map((item) => ({
      id: item.id,
      occurredAt: item.occurredAt,
      storeName:
        item.storeName ||
        [item.resourceType, item.resourceId].filter(Boolean).join(" #") ||
        "운영 기록",
      action: item.actionLabel || item.action || "관리자 작업",
      operator: item.operatorName || "미배정",
      status: item.status || actionStatus(item.action),
    })),
  };
}

function comparisonLabel(comparison, fallback) {
  switch (comparison) {
    case "previous_period":
      return "이전 기간 대비";
    case "current":
      return "현재 기준";
    case "current_period":
      return "조회 기간";
    case "not_available":
      return "집계 준비 중";
    default:
      return fallback;
  }
}

function formatTrendLabel(value) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    weekday: "short",
  }).format(date);
}

function actionStatus(action) {
  switch (action) {
    case "STORE_APPROVED":
      return "approved";
    case "STORE_HELD":
      return "on_hold";
    case "STORE_REJECTED":
      return "rejected";
    default:
      return "recorded";
  }
}
