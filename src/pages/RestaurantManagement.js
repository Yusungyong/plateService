import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteAdminRestaurant,
  fetchAdminRestaurants,
  fetchRestaurants,
} from "../api/restaurantApi";
import PageLayout from "../components/PageLayout";
import ConfirmDialog from "../admin/components/ConfirmDialog";
import DetailDrawer from "../admin/components/DetailDrawer";
import UnsavedChangesGuard from "../components/UnsavedChangesGuard";
import "../admin/styles/store-workspace.css";

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

function RestaurantManagement({ adminMode = false }) {
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
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [deletingRestaurantId, setDeletingRestaurantId] = useState(null);
  const [pendingDeleteRestaurant, setPendingDeleteRestaurant] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");
  const mounted = useRef(false);
  const listRequest = useRef(0);
  const deleteInFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      listRequest.current += 1;
    };
  }, []);

  const restaurants = useMemo(() => restaurantPage.content || [], [restaurantPage]);

  const loadRestaurants = useCallback(async (page = 0, nextFilters = appliedFilters) => {
    const request = ++listRequest.current;
    const isCurrent = () => mounted.current && request === listRequest.current;
    setIsLoading(true);
    setMessage("");

    try {
      const fetchRestaurantPage = adminMode ? fetchAdminRestaurants : fetchRestaurants;
      const response = await fetchRestaurantPage({
        page,
        size: restaurantPage.size,
        ...nextFilters,
      });
      if (!isCurrent()) return false;
      setRestaurantPage(normalizeRestaurantPage(response));
      return true;
    } catch (error) {
      if (!isCurrent()) return false;
      setMessageType("error");
      setMessage(error.message || "매장 목록을 불러오지 못했습니다.");
      return false;
    } finally {
      if (isCurrent()) setIsLoading(false);
    }
  }, [adminMode, appliedFilters, restaurantPage.size]);

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
    setSelectedRestaurant(null);
  }

  function applyExposureStatus(exposureStatus) {
    const nextFilters = { ...filters, exposureStatus };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
    setSelectedRestaurant(null);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setSelectedRestaurant(null);
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
    if (!adminMode || deleteInFlight.current) return;
    const restaurantId = pendingDeleteRestaurant?.id || pendingDeleteRestaurant?.restaurantId;

    if (!restaurantId) {
      return;
    }

    deleteInFlight.current = true;
    setDeletingRestaurantId(restaurantId);
    setMessage("");

    try {
      await deleteAdminRestaurant(restaurantId);
      if (!mounted.current) return;
      setPendingDeleteRestaurant(null);
      setSelectedRestaurant(null);
      const nextPage = restaurants.length === 1 ? Math.max(0, restaurantPage.page - 1) : restaurantPage.page;
      const refreshed = await loadRestaurants(nextPage, appliedFilters);
      if (refreshed && mounted.current) {
        setMessageType("success");
        setMessage("매장 정보가 삭제되었습니다.");
      }
    } catch (error) {
      if (!mounted.current) return;
      setPendingDeleteRestaurant(null);
      setMessageType("error");
      setMessage(error.message || "매장 삭제에 실패했습니다.");
    } finally {
      deleteInFlight.current = false;
      if (mounted.current) setDeletingRestaurantId(null);
    }
  }

  return (
    <PageLayout
      className={adminMode ? "store-workspace" : ""}
      title={adminMode ? "매장 관리" : "내 매장 관리"}
      description={
        adminMode
          ? "검수할 매장을 찾고, 정보를 확인한 뒤 편집하세요."
          : "내 계정에 연결된 매장 정보를 확인하고 메뉴, 사진, 노출 상태를 관리합니다."
      }
    >
      <div className="stack-layout restaurant-registration">
        <UnsavedChangesGuard pending={deletingRestaurantId !== null} />
        {message && !selectedRestaurant ? (
          <div role={messageType === "success" ? "status" : "alert"} className={messageType === "success" ? "api-status api-status--success" : "api-status api-status--error"}>
            {message}
          </div>
        ) : null}

        <section className="support-panel">
          {adminMode ? (
            <div className="store-workspace__status-filters" role="group" aria-label="매장 노출 상태 빠른 필터">
              {[["", "전체"], ["review", "검수 요청"], ["draft", "임시 저장"], ["published", "즉시 노출"]].map(([value, label]) => (
                <button key={value} type="button" aria-pressed={appliedFilters.exposureStatus === value} onClick={() => applyExposureStatus(value)}>
                  {label}
                </button>
              ))}
            </div>
          ) : null}
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

            {!adminMode ? <label className="admin-field">
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
            </label> : null}

            <div className="admin-actions restaurant-filter-actions">
              <button type="button" onClick={resetFilters}>
                초기화
              </button>
              <button type="submit" className="button-primary">
                조회
              </button>
            </div>
          </form>
          {adminMode ? (
            <p className="store-workspace__hint">
              {exposureStatusDescriptions[appliedFilters.exposureStatus] || "검수 요청 매장을 먼저 확인하세요. 매장 이름을 선택하면 상태와 관리 작업을 확인할 수 있습니다."}
            </p>
          ) : <ExposureStatusGuide />}
        </section>

        <section className="support-panel">
          <div className="support-panel__header restaurant-menu-header">
            <div>
              <span className="support-kicker">목록</span>
              <h3>총 {restaurantPage.totalElements.toLocaleString()}개</h3>
            </div>
            {adminMode ? null : (
              <Link className="restaurant-text-link" to="/business/signup">
                새 입점 신청
              </Link>
            )}
          </div>

            <div className="restaurant-table" role="table" aria-label={adminMode ? "매장 목록" : "내 매장 목록"}>
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

                  return (
                    <div key={restaurantId || restaurant.title} className={`restaurant-table__row${adminMode && selectedRestaurant === restaurant ? " store-workspace__row--selected" : ""}`} role="row">
                      <div className="restaurant-list-title" role="cell" data-label="매장">
                        {representativeImageUrl ? (
                          <img src={representativeImageUrl} alt={`${restaurant.title || restaurant.name || "매장"} 대표 이미지`} />
                        ) : (
                          <span className="restaurant-list-title__empty" aria-label="대표 이미지 없음" />
                        )}
                        <div>
                          {adminMode ? (
                            <button type="button" className="store-workspace__select-store" onClick={() => { setMessage(""); setSelectedRestaurant(restaurant); }} aria-label={`${restaurant.title || restaurant.name || "매장"} 관리 작업 열기`}>
                              {restaurant.title || restaurant.name || "-"}
                            </button>
                          ) : <strong>{restaurant.title || restaurant.name || "-"}</strong>}
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
                        <Link to={`${adminMode ? "/admin/stores" : "/business/stores"}/${restaurantId}`}>상세</Link>
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
        {adminMode ? (
          <DetailDrawer
            isOpen={Boolean(selectedRestaurant)}
            title={selectedRestaurant?.title || selectedRestaurant?.name || "매장 정보"}
            description="매장 상태와 관리 작업"
            onClose={() => { if (!deleteInFlight.current) setSelectedRestaurant(null); }}
            footer={selectedRestaurant ? (
              <div className="store-workspace__detail-actions">
                <button type="button" className="admin-button admin-button--danger-outline" onClick={() => requestDelete(selectedRestaurant)} disabled={deletingRestaurantId !== null}>매장 삭제</button>
                <Link className="admin-button admin-button--primary" to={`/admin/stores/${selectedRestaurant.id || selectedRestaurant.restaurantId}`}>매장 정보 편집</Link>
              </div>
            ) : null}
          >
            {message ? (
              <div role={messageType === "success" ? "status" : "alert"} className={messageType === "success" ? "api-status api-status--success" : "api-status api-status--error"}>
                {message}
              </div>
            ) : null}
            {selectedRestaurant ? (
              <div className="store-workspace__summary">
                <div className="store-workspace__next-step">
                  <strong>{toExposureStatusLabel(selectedRestaurant.exposureStatus)}</strong>
                  <p>{exposureStatusDescriptions[selectedRestaurant.exposureStatus] || "매장 정보를 열어 현재 상태를 확인하세요."}</p>
                </div>
                {getRepresentativeImageUrl(selectedRestaurant) ? <img className="store-workspace__summary-image" src={getRepresentativeImageUrl(selectedRestaurant)} alt={`${selectedRestaurant.title || selectedRestaurant.name || "매장"} 대표 이미지`} /> : null}
                <dl className="admin-detail-list">
                  <div><dt>주소</dt><dd>{selectedRestaurant.address || "-"}</dd></div>
                  <div><dt>카테고리</dt><dd>{formatCategories(selectedRestaurant.categories)}</dd></div>
                  <div><dt>메뉴</dt><dd>{Number(selectedRestaurant.menuCount || 0).toLocaleString()}개</dd></div>
                  <div><dt>최근 수정</dt><dd>{formatDate(selectedRestaurant.updatedAt || selectedRestaurant.updated_at)}</dd></div>
                </dl>
                <p className="store-workspace__hint">매장 정보 편집에서 기본 정보, 메뉴, 사진과 노출 상태를 변경할 수 있습니다.</p>
              </div>
            ) : null}
          </DetailDrawer>
        ) : null}
        <DeleteRestaurantDialog
          restaurant={pendingDeleteRestaurant}
          isSubmitting={deletingRestaurantId !== null}
          onCancel={() => { if (!deleteInFlight.current) setPendingDeleteRestaurant(null); }}
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
  const restaurantName = restaurant?.title || restaurant?.name || "선택한 매장";

  return (
    <div className="store-workspace__delete-confirm">
      <ConfirmDialog
        isOpen={Boolean(restaurant)}
        title="매장 삭제"
        description={`${restaurantName} 정보를 삭제할까요? 등록된 메뉴와 미디어 정보도 함께 삭제됩니다.`}
        confirmLabel="삭제하기"
        isSubmitting={isSubmitting}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />
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
