import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBusinessApplications } from "../api/businessApplicationApi";
import { fetchRestaurantDetail, fetchRestaurants } from "../api/restaurantApi";
import { fetchStoreAnalyticsSummary } from "../api/storeAnalyticsApi";
import PageLayout from "../components/PageLayout";

const dashboardStorePageSize = 20;
const dashboardApplicationPageSize = 5;
const performanceMetricOrder = [
  { key: "homeImpressions", label: "홈 화면 노출 횟수" },
  { key: "storeDetailViews", label: "매장 상세 조회 수" },
  { key: "directionClicks", label: "길찾기 클릭 수" },
  { key: "phoneClicks", label: "전화 클릭 수" },
];

function BusinessDashboard() {
  const [restaurantPage, setRestaurantPage] = useState(createEmptyPage());
  const [applications, setApplications] = useState([]);
  const [primaryRestaurant, setPrimaryRestaurant] = useState(null);
  const [analyticsSummary, setAnalyticsSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [notices, setNotices] = useState([]);
  const snapshotRequestId = useRef(0);

  const restaurants = useMemo(() => restaurantPage.content || [], [restaurantPage]);
  const dashboardStats = useMemo(() => buildDashboardStats(restaurants, restaurantPage), [restaurants, restaurantPage]);
  const checklist = useMemo(
    () => buildChecklist(primaryRestaurant, analyticsSummary),
    [analyticsSummary, primaryRestaurant]
  );
  const todayTasks = useMemo(
    () => buildTodayTasks({ checklist, applications, primaryRestaurant }),
    [applications, checklist, primaryRestaurant]
  );

  const loadStoreSnapshot = useCallback(async (store) => {
    const requestId = snapshotRequestId.current + 1;
    snapshotRequestId.current = requestId;
    const storeId = getRestaurantId(store);
    const fallbackRestaurant = normalizeDashboardRestaurant(store);

    setPrimaryRestaurant(fallbackRestaurant);
    setAnalyticsSummary(null);
    setIsSnapshotLoading(Boolean(storeId));

    if (!storeId) {
      setNotices((current) => mergeNotices(current, ["선택한 매장의 식별자가 없어 상세 정보를 불러올 수 없습니다."]));
      setIsSnapshotLoading(false);
      return;
    }

    const [detailResult, summaryResult] = await Promise.allSettled([
      fetchRestaurantDetail(storeId),
      fetchStoreAnalyticsSummary(storeId, getDateRange(7)),
    ]);

    if (snapshotRequestId.current !== requestId) {
      return;
    }

    const nextNotices = [];
    if (detailResult.status === "fulfilled") {
      setPrimaryRestaurant(normalizeDashboardRestaurant(detailResult.value, fallbackRestaurant));
    } else {
      nextNotices.push("매장 상세 정보 일부를 불러오지 못해 목록의 정보로 표시합니다.");
    }

    if (summaryResult.status === "fulfilled") {
      setAnalyticsSummary(summaryResult.value || null);
    } else {
      nextNotices.push("최근 성과를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    }

    setNotices((current) => mergeNotices(current, nextNotices));
    setIsSnapshotLoading(false);
  }, []);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setMessage("");
    setNotices([]);
    setPrimaryRestaurant(null);
    setAnalyticsSummary(null);

    try {
      const [restaurantResult, applicationResult] = await Promise.allSettled([
        fetchRestaurants({ page: 0, size: dashboardStorePageSize }),
        fetchBusinessApplications({ page: 0, size: dashboardApplicationPageSize }),
      ]);

      if (restaurantResult.status === "rejected") {
        throw restaurantResult.reason;
      }

      const nextRestaurantPage = normalizePage(restaurantResult.value);
      const nextRestaurants = nextRestaurantPage.content;
      const primaryStore = nextRestaurants[0] || null;

      setRestaurantPage(nextRestaurantPage);
      setApplications(
        applicationResult.status === "fulfilled"
          ? normalizePage(applicationResult.value).content
          : []
      );

      if (applicationResult.status === "rejected") {
        setNotices(["입점 신청 현황을 불러오지 못했습니다."]);
      }

      if (!primaryStore) {
        return;
      }

      await loadStoreSnapshot(primaryStore);
    } catch (error) {
      setMessage(error.message || "매장 운영 현황 정보를 불러오지 못했습니다.");
      setRestaurantPage(createEmptyPage());
      setApplications([]);
    } finally {
      setIsLoading(false);
    }
  }, [loadStoreSnapshot]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return (
    <PageLayout
      title="매장 운영 현황"
      description="오늘 확인해야 할 매장 상태, 보완 항목, 최근 성과를 한 화면에서 확인합니다."
    >
      <div className="stack-layout restaurant-registration owner-dashboard">
        {message ? (
          <div className="api-status api-status--error" role="alert">
            <span>{message}</span>
            <button type="button" onClick={loadDashboard} disabled={isLoading}>
              다시 시도
            </button>
          </div>
        ) : null}

        {notices.length > 0 ? (
          <div className="api-status" role="status">
            <span>{notices.join(" ")}</span>
          </div>
        ) : null}

        {isLoading ? (
          <div className="board-empty">매장 운영 현황 정보를 불러오는 중입니다.</div>
        ) : restaurants.length === 0 ? (
          <OwnerEmptyStart />
        ) : (
          <>
            <DashboardHero
              stats={dashboardStats}
              restaurants={restaurants}
              primaryRestaurant={primaryRestaurant}
              isSnapshotLoading={isSnapshotLoading}
              onSelectRestaurant={(storeId) => {
                const nextStore = restaurants.find((store) => String(getRestaurantId(store)) === storeId);
                if (nextStore) {
                  setNotices([]);
                  loadStoreSnapshot(nextStore);
                }
              }}
            />

            <div className="owner-dashboard-grid">
              <TodayTasks tasks={todayTasks} />
              <ChecklistPanel checklist={checklist} primaryRestaurant={primaryRestaurant} />
              <PerformancePanel
                summary={analyticsSummary}
                primaryRestaurant={primaryRestaurant}
                isLoading={isSnapshotLoading}
              />
              <RecentStoresPanel restaurants={restaurants} />
              <ApplicationsPanel applications={applications} />
            </div>
          </>
        )}
      </div>
    </PageLayout>
  );
}

function OwnerEmptyStart() {
  return (
    <section className="support-panel owner-dashboard-empty">
      <span className="support-kicker">시작하기</span>
      <h3>아직 관리할 매장이 없습니다.</h3>
      <p>입점 신청이 승인되면 이 화면에서 매장 상태, 보완 항목, 성과를 바로 확인할 수 있습니다.</p>
      <div className="restaurant-next-actions">
        <Link className="restaurant-text-link" to="/business/signup">
          새 입점 신청
        </Link>
        <Link className="restaurant-text-link restaurant-text-link--secondary" to="/business/applications">
          신청 현황 보기
        </Link>
      </div>
    </section>
  );
}

function DashboardHero({ stats, restaurants, primaryRestaurant, isSnapshotLoading, onSelectRestaurant }) {
  return (
    <section className="support-panel owner-dashboard-hero">
      <div className="support-panel__header restaurant-menu-header">
        <div>
          <span className="support-kicker">운영 요약</span>
          <h3>{primaryRestaurant?.title || "내 매장 현황"}</h3>
          <p>{primaryRestaurant?.address || "등록된 매장의 운영 상태를 확인하세요."}</p>
        </div>
        <div className="owner-dashboard-actions">
          {restaurants.length > 1 ? (
            <label className="owner-dashboard-store-picker">
              <span>기준 매장</span>
              <select
                aria-label="기준 매장"
                value={String(primaryRestaurant?.id || "")}
                onChange={(event) => onSelectRestaurant(event.target.value)}
                disabled={isSnapshotLoading}
              >
                {restaurants.map((restaurant) => (
                  <option key={getRestaurantId(restaurant)} value={String(getRestaurantId(restaurant))}>
                    {getRestaurantName(restaurant)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {primaryRestaurant?.id ? (
            <Link className="restaurant-text-link" to={`/business/stores/${primaryRestaurant.id}`}>
              매장 수정
            </Link>
          ) : null}
          <Link className="restaurant-text-link restaurant-text-link--secondary" to="/business/stores">
            전체 매장
          </Link>
        </div>
      </div>

      <div className="owner-dashboard-stat-grid">
        {stats.map((stat) => (
          <article
            key={stat.label}
            className="metric-card owner-dashboard-stat"
            aria-label={`${stat.label} ${stat.value}`}
          >
            <span className="metric-card__label">{stat.label}</span>
            <strong className="metric-card__value">{stat.value}</strong>
            <p className="metric-card__note">{stat.note}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function TodayTasks({ tasks }) {
  return (
    <section className="support-panel owner-dashboard-panel owner-dashboard-panel--wide">
      <div className="support-panel__header">
        <span className="support-kicker">오늘 할 일</span>
        <h3>먼저 보면 좋은 항목</h3>
      </div>
      {tasks.length === 0 ? (
        <div className="board-empty">오늘 바로 처리할 큰 보완 항목이 없습니다.</div>
      ) : (
        <div className="owner-dashboard-task-list">
          {tasks.map((task) => (
            <article key={`${task.label}-${task.to}`} className="owner-dashboard-task">
              <div>
                <strong>{task.label}</strong>
                <p>{task.description}</p>
              </div>
              <Link className="restaurant-text-link" to={task.to}>
                {task.actionLabel}
              </Link>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function ChecklistPanel({ checklist, primaryRestaurant }) {
  return (
    <section className="support-panel owner-dashboard-panel">
      <div className="support-panel__header">
        <span className="support-kicker">완성도</span>
        <h3>매장 기본 점검</h3>
      </div>
      <div className="owner-dashboard-checklist">
        {checklist.map((item) => (
          <div key={item.label} className={`owner-dashboard-checklist__item owner-dashboard-checklist__item--${item.status}`}>
            <span>{toChecklistStatusLabel(item.status)}</span>
            <div>
              <strong>{item.label}</strong>
              <p>{item.description}</p>
            </div>
          </div>
        ))}
      </div>
      {primaryRestaurant?.id ? (
        <Link className="restaurant-text-link" to={`/business/stores/${primaryRestaurant.id}`}>
          빠진 정보 채우기
        </Link>
      ) : null}
    </section>
  );
}

function PerformancePanel({ summary, primaryRestaurant, isLoading }) {
  const source = summary?.source || {};
  const hasLinkedContent =
    source.hasLinkedContent !== undefined ? Boolean(source.hasLinkedContent) : null;
  const metricsByKey = new Map((summary?.metrics || []).map((metric) => [metric.key, metric]));

  return (
    <section className="support-panel owner-dashboard-panel">
      <div className="support-panel__header">
        <span className="support-kicker">최근 7일</span>
        <h3>성과 스냅샷</h3>
      </div>
      {isLoading ? (
        <div className="board-empty">선택한 매장의 성과를 불러오는 중입니다.</div>
      ) : !summary ? (
        <div className="board-empty">성과 데이터를 확인할 수 없습니다.</div>
      ) : hasLinkedContent === false ? (
        <div className="board-empty">연결된 동영상 또는 이미지 피드가 생기면 성과가 표시됩니다.</div>
      ) : (
        <div className="owner-dashboard-performance-grid">
          {performanceMetricOrder.map((item) => {
            const metric = metricsByKey.get(item.key);

            return (
              <div key={item.key}>
                <dt>{item.label}</dt>
                <dd>{formatMetricValue(metric)}</dd>
              </div>
            );
          })}
        </div>
      )}
      {primaryRestaurant?.id ? (
        <Link className="restaurant-text-link" to={`/business/stores/${primaryRestaurant.id}`}>
          성과 자세히 보기
        </Link>
      ) : null}
    </section>
  );
}

function RecentStoresPanel({ restaurants }) {
  return (
    <section className="support-panel owner-dashboard-panel">
      <div className="support-panel__header restaurant-menu-header">
        <div>
          <span className="support-kicker">매장</span>
          <h3>최근 매장</h3>
        </div>
        <Link className="restaurant-text-link" to="/business/stores">
          전체 보기
        </Link>
      </div>
      <div className="owner-dashboard-store-list">
        {restaurants.slice(0, 4).map((restaurant) => {
          const restaurantId = getRestaurantId(restaurant);

          return (
            <article key={restaurantId || getRestaurantName(restaurant)} className="owner-dashboard-store-row">
              <div>
                <strong>{getRestaurantName(restaurant)}</strong>
                <p>{restaurant.address || "-"}</p>
              </div>
              <span className={`status-pill status-pill--${restaurant.exposureStatus || restaurant.exposure_status || "default"}`}>
                {toExposureStatusLabel(restaurant.exposureStatus || restaurant.exposure_status)}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ApplicationsPanel({ applications }) {
  return (
    <section className="support-panel owner-dashboard-panel">
      <div className="support-panel__header restaurant-menu-header">
        <div>
          <span className="support-kicker">입점</span>
          <h3>신청 현황</h3>
        </div>
        <Link className="restaurant-text-link" to="/business/applications">
          전체 보기
        </Link>
      </div>
      {applications.length === 0 ? (
        <div className="board-empty">진행 중인 입점 신청이 없습니다.</div>
      ) : (
        <div className="owner-dashboard-store-list">
          {applications.slice(0, 3).map((application) => (
            <article key={application.applicationId || application.id || application.storeName} className="owner-dashboard-store-row">
              <div>
                <strong>{application.storeName || application.store?.storeName || "입점 신청"}</strong>
                <p>{formatDate(application.updatedAt || application.appliedAt)}</p>
              </div>
              <span className={`status-pill status-pill--${application.approvalStatus || "default"}`}>
                {toApprovalStatusLabel(application.approvalStatus)}
              </span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function buildDashboardStats(restaurants, page) {
  const isPartial = Number(page.totalElements || 0) > restaurants.length;
  const publishedCount = restaurants.filter((restaurant) =>
    (restaurant.exposureStatus || restaurant.exposure_status) === "published"
  ).length;
  const reviewCount = restaurants.filter((restaurant) =>
    (restaurant.exposureStatus || restaurant.exposure_status) === "review"
  ).length;
  const draftCount = restaurants.filter((restaurant) =>
    (restaurant.exposureStatus || restaurant.exposure_status || "draft") === "draft"
  ).length;

  return [
    {
      label: "등록된 전체 매장",
      value: `${Number(page.totalElements || restaurants.length).toLocaleString()}개`,
      note: "내 계정에 연결된 매장",
    },
    {
      label: "고객에게 노출 중인 매장",
      value: `${publishedCount.toLocaleString()}개${isPartial ? "+" : ""}`,
      note: isPartial ? `불러온 ${restaurants.length}개 매장 기준` : "고객에게 보이는 매장",
    },
    {
      label: "검수를 요청한 매장",
      value: `${reviewCount.toLocaleString()}개${isPartial ? "+" : ""}`,
      note: isPartial ? `불러온 ${restaurants.length}개 매장 기준` : "운영팀 확인이 필요한 매장",
    },
    {
      label: "임시 저장한 매장",
      value: `${draftCount.toLocaleString()}개${isPartial ? "+" : ""}`,
      note: isPartial ? `불러온 ${restaurants.length}개 매장 기준` : "정보 보완이 필요한 매장",
    },
  ];
}

function buildTodayTasks({ checklist, applications, primaryRestaurant }) {
  const tasks = [];
  const actionPath = primaryRestaurant?.id ? `/business/stores/${primaryRestaurant.id}` : "/business/stores";

  checklist
    .filter((item) => item.status === "todo")
    .slice(0, 3)
    .forEach((item) => {
      tasks.push({
        label: item.label,
        description: item.description,
        actionLabel: "수정하기",
        to: actionPath,
      });
    });

  applications
    .filter((application) => ["on_hold", "rejected"].includes(application.approvalStatus))
    .slice(0, 2)
    .forEach((application) => {
      tasks.push({
        label: "입점 신청 확인",
        description: `${application.storeName || application.store?.storeName || "신청서"} 상태를 확인해 주세요.`,
        actionLabel: "신청 보기",
        to: application.applicationId
          ? `/business/applications/${application.applicationId}`
          : "/business/applications",
      });
    });

  return tasks.slice(0, 4);
}

function buildChecklist(restaurant, summary) {
  if (!restaurant) {
    return [];
  }

  const source = summary?.source || {};
  const hasLinkedContent =
    source.hasLinkedContent === undefined ? "unknown" : source.hasLinkedContent ? "done" : "todo";

  return [
    {
      label: "고객 노출 상태",
      description:
        restaurant.exposureStatus === "published"
          ? "고객에게 매장이 노출되고 있습니다."
          : "매장을 고객에게 보여주려면 노출 상태를 확인해 주세요.",
      status: restaurant.exposureStatus === "published" ? "done" : "todo",
    },
    {
      label: "대표 이미지",
      description: "목록과 상세에서 매장을 알아볼 수 있게 대표 이미지를 등록해 주세요.",
      status: restaurant.representativeImageUrl ? "done" : "todo",
    },
    {
      label: "대표 메뉴",
      description: "대표 메뉴가 있으면 고객이 방문 결정을 더 쉽게 할 수 있습니다.",
      status: Number(restaurant.menuCount || 0) > 0 ? "done" : "todo",
    },
    {
      label: "카테고리",
      description: "검색과 추천에 쓰일 매장 카테고리를 선택해 주세요.",
      status: restaurant.categories.length > 0 ? "done" : "todo",
    },
    {
      label: "연락처",
      description: "전화 문의와 운영 확인을 위해 연락처를 최신 상태로 유지해 주세요.",
      status: restaurant.phone ? "done" : "todo",
    },
    {
      label: "영업시간",
      description: "방문 전 확인할 수 있도록 영업시간을 입력해 주세요.",
      status: restaurant.businessHours ? "done" : "todo",
    },
    {
      label: "콘텐츠 연결",
      description: "동영상 또는 이미지 피드가 연결되면 성과 지표가 더 풍부해집니다.",
      status: hasLinkedContent,
    },
  ];
}

function normalizePage(response) {
  const payload = response?.data || response || {};
  const content = Array.isArray(payload.content) ? payload.content : Array.isArray(payload) ? payload : [];

  return {
    content,
    page: Number(payload.page || 0),
    size: Number(payload.size || content.length || dashboardStorePageSize),
    totalElements: Number(payload.totalElements ?? content.length),
    totalPages: Math.max(1, Number(payload.totalPages || 1)),
    hasNext: Boolean(payload.hasNext),
  };
}

function normalizeDashboardRestaurant(response, fallback = {}) {
  const payload = response?.data || response || {};
  const categories = normalizeCategories(payload.categories || fallback.categories);
  const menus = Array.isArray(payload.menus) ? payload.menus : Array.isArray(fallback.menus) ? fallback.menus : [];
  const media = Array.isArray(payload.media) ? payload.media : Array.isArray(fallback.media) ? fallback.media : [];

  return {
    id: getRestaurantId(payload) || fallback.id || fallback.restaurantId || "",
    title: getRestaurantName(payload) !== "-" ? getRestaurantName(payload) : getRestaurantName(fallback),
    address: payload.address || fallback.address || "",
    categories,
    phone: payload.phone || fallback.phone || "",
    businessHours: payload.businessHours || payload.business_hours || fallback.businessHours || fallback.business_hours || "",
    exposureStatus: payload.exposureStatus || payload.exposure_status || fallback.exposureStatus || fallback.exposure_status || "draft",
    menuCount: Number(payload.menuCount ?? fallback.menuCount ?? menus.length ?? 0),
    representativeImageUrl: getRepresentativeImageUrl({ ...fallback, ...payload, media }),
    updatedAt: payload.updatedAt || payload.updated_at || fallback.updatedAt || fallback.updated_at || "",
  };
}

function normalizeCategories(categories) {
  if (Array.isArray(categories)) {
    return categories.filter(Boolean);
  }

  if (typeof categories === "string" && categories) {
    return categories.split(",").map((category) => category.trim()).filter(Boolean);
  }

  return [];
}

function getRestaurantId(restaurant = {}) {
  return restaurant.id || restaurant.restaurantId || restaurant.storeId || "";
}

function getRestaurantName(restaurant = {}) {
  return restaurant.title || restaurant.name || restaurant.storeName || "-";
}

function getRepresentativeImageUrl(restaurant = {}) {
  if (restaurant.representativeImageUrl) {
    return restaurant.representativeImageUrl;
  }

  if (restaurant.representative_image_url) {
    return restaurant.representative_image_url;
  }

  const media = Array.isArray(restaurant.media) ? restaurant.media : [];
  const representativeImage = media.find((item) => {
    const mediaType = item.mediaType || item.media_type;
    const usageType = item.usageType || item.usage_type;
    return mediaType === "image" && usageType === "representative";
  });

  return representativeImage?.fileUrl || representativeImage?.file_url || representativeImage?.url || "";
}

function createEmptyPage() {
  return {
    content: [],
    page: 0,
    size: dashboardStorePageSize,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
  };
}

function mergeNotices(current, next) {
  return [...new Set([...current, ...next].filter(Boolean))];
}

function getDateRange(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));

  return {
    from: formatDateInput(from),
    to: formatDateInput(to),
  };
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatMetricValue(metric) {
  if (!metric || metric.value == null || Number.isNaN(Number(metric.value))) {
    return "-";
  }

  return Number(metric.value).toLocaleString();
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10).replace(/-/g, ".");
}

function toChecklistStatusLabel(status) {
  if (status === "done") {
    return "완료";
  }

  if (status === "unknown") {
    return "확인 전";
  }

  return "필요";
}

function toExposureStatusLabel(status) {
  switch (status) {
    case "published":
      return "즉시 노출";
    case "review":
      return "검수 요청";
    case "draft":
      return "임시 저장";
    default:
      return status || "-";
  }
}

function toApprovalStatusLabel(status) {
  switch (status) {
    case "approved":
      return "승인 완료";
    case "pending":
      return "검토 중";
    case "on_hold":
      return "보완 요청";
    case "rejected":
      return "반려";
    default:
      return status || "-";
  }
}

export default BusinessDashboard;
