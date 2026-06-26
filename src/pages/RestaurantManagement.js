import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteRestaurant, fetchRestaurants } from "../api/restaurantApi";
import PageLayout from "../components/PageLayout";

const initialFilters = {
  keyword: "",
  category: "",
  exposureStatus: "",
};

const categoryOptions = ["한식", "중식", "일식", "양식", "분식", "카페", "디저트", "패스트푸드", "주점", "기타"];
const exposureStatusDescriptions = {
  draft: "고객에게 보이지 않는 상태입니다. 정보를 준비하거나 잠시 숨길 때 사용하세요.",
  review: "노출 전 운영팀 확인이 필요한 상태입니다. 검수가 끝나면 노출 여부를 결정할 수 있습니다.",
  published: "고객에게 바로 보이는 상태입니다. 주소, 메뉴, 대표 이미지를 먼저 확인해 주세요.",
};

function RestaurantManagement() {
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);
  const [restaurantPage, setRestaurantPage] = useState({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [deletingRestaurantId, setDeletingRestaurantId] = useState(null);
  const [pendingDeleteRestaurant, setPendingDeleteRestaurant] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const restaurants = useMemo(() => restaurantPage.content || [], [restaurantPage]);

  const loadRestaurants = useCallback(async (page = 0, nextFilters = appliedFilters) => {
    setIsLoading(true);
    setMessage("");

    try {
      const response = await fetchRestaurants({
        page,
        size: restaurantPage.size,
        ...nextFilters,
      });
      setRestaurantPage(normalizeRestaurantPage(response));
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "매장 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [appliedFilters, restaurantPage.size]);

  useEffect(() => {
    loadRestaurants(0, appliedFilters);
  }, [appliedFilters, loadRestaurants]);

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
  }

  function requestDelete(restaurant) {
    const restaurantId = restaurant.id || restaurant.restaurantId;

    if (!restaurantId) {
      return;
    }

    setPendingDeleteRestaurant(restaurant);
    setMessage("");
  }

  async function confirmDelete() {
    const restaurantId = pendingDeleteRestaurant?.id || pendingDeleteRestaurant?.restaurantId;

    if (!restaurantId) {
      return;
    }

    setDeletingRestaurantId(restaurantId);
    setMessage("");

    try {
      await deleteRestaurant(restaurantId);
      setMessageType("success");
      setMessage("매장 정보가 삭제되었습니다.");
      await loadRestaurants(restaurantPage.page, appliedFilters);
      setPendingDeleteRestaurant(null);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "매장 삭제에 실패했습니다.");
    } finally {
      setDeletingRestaurantId(null);
    }
  }

  return (
    <PageLayout
      title="내 매장 관리"
      description="내 계정에 연결된 매장 정보를 확인하고 메뉴, 사진, 노출 상태를 관리합니다."
    >
      <div className="stack-layout restaurant-registration">
        {message ? (
          <div className={messageType === "success" ? "api-status api-status--success" : "api-status api-status--error"}>
            {message}
          </div>
        ) : null}

        <section className="support-panel">
          <form className="restaurant-filter-form" onSubmit={handleSearch}>
            <label className="admin-field">
              <span>검색어</span>
              <input
                type="search"
                value={filters.keyword}
                onChange={(event) => updateFilter("keyword", event.target.value)}
                placeholder="매장 이름 또는 주소"
              />
            </label>

            <label className="admin-field">
              <span>카테고리</span>
              <select
                value={filters.category}
                onChange={(event) => updateFilter("category", event.target.value)}
              >
                <option value="">전체</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>노출 상태</span>
              <select
                value={filters.exposureStatus}
                onChange={(event) => updateFilter("exposureStatus", event.target.value)}
              >
                <option value="">전체</option>
                <option value="draft">임시 저장</option>
                <option value="review">검수 요청</option>
                <option value="published">즉시 노출</option>
              </select>
            </label>

            <div className="admin-actions restaurant-filter-actions">
              <button type="button" onClick={resetFilters}>
                초기화
              </button>
              <button type="submit" className="button-primary">
                조회
              </button>
            </div>
          </form>
          <ExposureStatusGuide />
        </section>

        <section className="support-panel">
          <div className="support-panel__header restaurant-menu-header">
            <div>
              <span className="support-kicker">목록</span>
              <h3>총 {restaurantPage.totalElements.toLocaleString()}개</h3>
            </div>
            <Link className="restaurant-text-link" to="/business/signup">
              새 입점 신청
            </Link>
          </div>

            <div className="restaurant-table" role="table" aria-label="내 매장 목록">
              <div className="restaurant-table__head" role="row">
              <span role="columnheader">매장</span>
              <span role="columnheader">카테고리</span>
              <span role="columnheader">상태</span>
              <span role="columnheader">메뉴</span>
              <span role="columnheader">수정일</span>
              <span role="columnheader">작업</span>
            </div>

            <div className="restaurant-table__body">
              {isLoading ? (
                <div className="board-empty">매장 목록을 불러오는 중입니다.</div>
              ) : restaurants.length === 0 ? (
                <div className="board-empty">조회된 매장이 없습니다.</div>
              ) : (
                restaurants.map((restaurant) => {
                  const restaurantId = restaurant.id || restaurant.restaurantId;
                  const representativeImageUrl = getRepresentativeImageUrl(restaurant);
                  const isDeletingThisRow = deletingRestaurantId === restaurantId;

                  return (
                    <div key={restaurantId || restaurant.title} className="restaurant-table__row" role="row">
                      <div className="restaurant-list-title" role="cell" data-label="매장">
                        {representativeImageUrl ? (
                          <img src={representativeImageUrl} alt={`${restaurant.title || restaurant.name || "매장"} 대표 이미지`} />
                        ) : (
                          <span className="restaurant-list-title__empty" aria-label="대표 이미지 없음" />
                        )}
                        <div>
                          <strong>{restaurant.title || restaurant.name || "-"}</strong>
                          <p>{restaurant.address || "-"}</p>
                        </div>
                      </div>
                      <span role="cell" data-label="카테고리">{formatCategories(restaurant.categories)}</span>
                      <span
                        role="cell"
                        data-label="상태"
                        className={`status-pill status-pill--${restaurant.exposureStatus || "default"}`}
                      >
                        {toExposureStatusLabel(restaurant.exposureStatus)}
                      </span>
                      <span role="cell" data-label="메뉴">{Number(restaurant.menuCount || 0).toLocaleString()}개</span>
                      <span role="cell" data-label="수정일">{formatDate(restaurant.updatedAt || restaurant.updated_at)}</span>
                      <div className="restaurant-row-actions" role="cell" data-label="작업">
                        <Link to={`/business/stores/${restaurantId}`}>상세</Link>
                        <button
                          type="button"
                          onClick={() => requestDelete(restaurant)}
                          disabled={deletingRestaurantId !== null}
                        >
                          {isDeletingThisRow ? "삭제 중" : "삭제"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="monitoring-pagination">
            <button
              type="button"
              onClick={() => loadRestaurants(Math.max(0, restaurantPage.page - 1))}
              disabled={restaurantPage.page === 0 || isLoading}
            >
              이전
            </button>
            <span>
              {restaurantPage.page + 1} / {restaurantPage.totalPages}
            </span>
            <button
              type="button"
              onClick={() => loadRestaurants(restaurantPage.page + 1)}
              disabled={!restaurantPage.hasNext || isLoading}
            >
              다음
            </button>
          </div>
        </section>
        <DeleteRestaurantDialog
          restaurant={pendingDeleteRestaurant}
          isSubmitting={deletingRestaurantId !== null}
          onCancel={() => setPendingDeleteRestaurant(null)}
          onConfirm={confirmDelete}
        />
      </div>
    </PageLayout>
  );
}

function ExposureStatusGuide() {
  return (
    <dl className="restaurant-exposure-guide">
      {Object.entries(exposureStatusDescriptions).map(([status, description]) => (
        <div key={status}>
          <dt>{toExposureStatusLabel(status)}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}

function DeleteRestaurantDialog({ restaurant, isSubmitting, onCancel, onConfirm }) {
  if (!restaurant) {
    return null;
  }

  const restaurantName = restaurant.title || restaurant.name || "선택한 매장";

  return (
    <div className="restaurant-dialog-layer">
      <div className="restaurant-dialog" role="dialog" aria-modal="true" aria-label="매장 삭제">
        <header>
          <h3>매장 정보 삭제</h3>
          <p>
            {restaurantName} 정보를 삭제할까요? 등록된 메뉴와 미디어 정보도 함께 삭제됩니다.
          </p>
        </header>
        <div className="restaurant-dialog__actions">
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            취소
          </button>
          <button type="button" className="button-danger" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "삭제 중" : "삭제하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

function normalizeRestaurantPage(response) {
  const payload = response?.data || response || {};
  const content = Array.isArray(payload.content) ? payload.content : Array.isArray(payload) ? payload : [];

  return {
    content,
    page: Number(payload.page || 0),
    size: Number(payload.size || 20),
    totalElements: Number(payload.totalElements ?? content.length),
    totalPages: Math.max(1, Number(payload.totalPages || 1)),
    hasNext: Boolean(payload.hasNext),
  };
}

function formatCategories(categories) {
  if (!categories) {
    return "-";
  }

  if (Array.isArray(categories)) {
    return categories.join(", ") || "-";
  }

  return String(categories);
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

function getRepresentativeImageUrl(restaurant) {
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

export default RestaurantManagement;
