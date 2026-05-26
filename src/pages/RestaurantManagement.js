import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { deleteRestaurant, fetchRestaurants } from "../api/restaurantApi";
import PageLayout from "../components/PageLayout";

const initialFilters = {
  keyword: "",
  category: "",
  exposureStatus: "",
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
  const [isDeleting, setIsDeleting] = useState(false);
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
      setMessage(error.message || "식당 목록을 불러오지 못했습니다.");
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

  async function handleDelete(restaurant) {
    const restaurantId = restaurant.id || restaurant.restaurantId;

    if (!restaurantId) {
      return;
    }

    const confirmed = window.confirm(`${restaurant.title || restaurant.name || "식당"} 정보를 삭제할까요?`);

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setMessage("");

    try {
      await deleteRestaurant(restaurantId);
      setMessageType("success");
      setMessage("식당 정보가 삭제되었습니다.");
      await loadRestaurants(restaurantPage.page, appliedFilters);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "식당 삭제에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <PageLayout
      title="식당 정보 관리"
      description="등록된 식당을 조회하고 상세 정보 수정 또는 삭제를 처리합니다."
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
                placeholder="식당명 또는 주소"
              />
            </label>

            <label className="admin-field">
              <span>카테고리</span>
              <input
                type="text"
                value={filters.category}
                onChange={(event) => updateFilter("category", event.target.value)}
                placeholder="예: 한식"
              />
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
        </section>

        <section className="support-panel">
          <div className="support-panel__header restaurant-menu-header">
            <div>
              <span className="support-kicker">목록</span>
              <h3>총 {restaurantPage.totalElements.toLocaleString()}개</h3>
            </div>
            <Link className="restaurant-text-link" to="/admin/restaurant-registration">
              새 식당 등록
            </Link>
          </div>

            <div className="restaurant-table" role="table" aria-label="식당 목록">
              <div className="restaurant-table__head" role="row">
              <span role="columnheader">식당</span>
              <span role="columnheader">카테고리</span>
              <span role="columnheader">상태</span>
              <span role="columnheader">메뉴</span>
              <span role="columnheader">수정일</span>
              <span role="columnheader">작업</span>
            </div>

            <div className="restaurant-table__body">
              {isLoading ? (
                <div className="board-empty">식당 목록을 불러오는 중입니다.</div>
              ) : restaurants.length === 0 ? (
                <div className="board-empty">조회된 식당이 없습니다.</div>
              ) : (
                restaurants.map((restaurant) => {
                  const restaurantId = restaurant.id || restaurant.restaurantId;
                  const representativeImageUrl = getRepresentativeImageUrl(restaurant);

                  return (
                    <div key={restaurantId || restaurant.title} className="restaurant-table__row" role="row">
                      <div className="restaurant-list-title" role="cell">
                        {representativeImageUrl ? (
                          <img src={representativeImageUrl} alt={`${restaurant.title || restaurant.name || "식당"} 대표 이미지`} />
                        ) : (
                          <span className="restaurant-list-title__empty" aria-label="대표 이미지 없음" />
                        )}
                        <div>
                          <strong>{restaurant.title || restaurant.name || "-"}</strong>
                          <p>{restaurant.address || "-"}</p>
                        </div>
                      </div>
                      <span role="cell">{formatCategories(restaurant.categories)}</span>
                      <span role="cell" className={`status-pill status-pill--${restaurant.exposureStatus || "default"}`}>
                        {toExposureStatusLabel(restaurant.exposureStatus)}
                      </span>
                      <span role="cell">{Number(restaurant.menuCount || 0).toLocaleString()}개</span>
                      <span role="cell">{formatDate(restaurant.updatedAt || restaurant.updated_at)}</span>
                      <div className="restaurant-row-actions" role="cell">
                        <Link to={`/admin/restaurants/${restaurantId}`}>상세</Link>
                        <button type="button" onClick={() => handleDelete(restaurant)} disabled={isDeleting}>
                          삭제
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
      </div>
    </PageLayout>
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
