import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  approveStore,
  getStoreApprovalDetail,
  getStoreDocumentAccessUrl,
  getStoreApprovals,
  holdStore,
  rejectStore,
} from "../api/storeApprovalApi";
import AdminPageHeader from "../components/AdminPageHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import DetailDrawer from "../components/DetailDrawer";
import PermissionGuard from "../components/PermissionGuard";
import ReasonDialog from "../components/ReasonDialog";
import StatusBadge from "../components/StatusBadge";
import { ADMIN_PERMISSIONS } from "../constants/adminPermissions";
import {
  STORE_APPROVAL_STATUS,
  STORE_APPROVAL_STATUS_LABELS,
  STORE_CATEGORY_OPTIONS,
  STORE_REGION_OPTIONS,
  STORE_REJECTION_REASON_OPTIONS,
  VERIFICATION_STATUS_LABELS,
} from "../constants/adminStatuses";

const initialFilters = {
  keyword: "",
  region: "",
  category: "",
  status: "",
  verificationStatus: "",
  appliedFrom: "",
  appliedTo: "",
};

const initialPage = {
  content: [],
  page: 0,
  size: 10,
  totalElements: 0,
  totalPages: 1,
  hasNext: false,
};

function AdminStoreApprovals() {
  const [searchParams] = useSearchParams();
  const queryKeyword = searchParams.get("keyword") || "";
  const [filters, setFilters] = useState(() => ({
    ...initialFilters,
    keyword: queryKeyword,
  }));
  const [appliedFilters, setAppliedFilters] = useState(() => ({
    ...initialFilters,
    keyword: queryKeyword,
  }));
  const [approvalPage, setApprovalPage] = useState(initialPage);
  const [selectedStore, setSelectedStore] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [documentAccessId, setDocumentAccessId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pendingAction, setPendingAction] = useState(null);

  const loadApprovals = useCallback(
    async (page = 0, nextFilters = appliedFilters) => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        setApprovalPage(
          await getStoreApprovals({
            page,
            size: approvalPage.size,
            ...nextFilters,
          })
        );
      } catch (error) {
        setErrorMessage(error.message || "매장 승인 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [appliedFilters, approvalPage.size]
  );

  useEffect(() => {
    loadApprovals(0, appliedFilters);
  }, [appliedFilters, loadApprovals]);

  useEffect(() => {
    if (queryKeyword === appliedFilters.keyword) {
      return;
    }

    const nextFilters = {
      ...initialFilters,
      keyword: queryKeyword,
    };
    setFilters(nextFilters);
    setAppliedFilters(nextFilters);
  }, [appliedFilters.keyword, queryKeyword]);

  const activeFilterCount = useMemo(
    () => Object.values(appliedFilters).filter(Boolean).length,
    [appliedFilters]
  );

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();
    setAppliedFilters(filters);
    setSuccessMessage("");
    setIsMobileFiltersOpen(false);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setIsMobileFiltersOpen(false);
  }

  async function openStoreDetail(storeId) {
    setIsDetailLoading(true);
    setErrorMessage("");
    setSelectedStore({ id: storeId, name: "매장 신청 정보" });

    try {
      setSelectedStore(await getStoreApprovalDetail(storeId));
    } catch (error) {
      setSelectedStore(null);
      setErrorMessage(error.message || "매장 신청 상세를 불러오지 못했습니다.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function requestAction(type) {
    if (!selectedStore) {
      return;
    }

    setPendingAction({
      type,
      store: selectedStore,
    });
  }

  async function executeAction(reason = "", reasonCode = "") {
    if (!pendingAction) {
      return;
    }

    const action = pendingAction;
    setPendingAction(null);
    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let updatedStore;
      if (action.type === "approve") {
        updatedStore = await approveStore(action.store.id, {
          version: action.store.version,
          comment: "",
        });
      } else if (action.type === "hold") {
        updatedStore = await holdStore(action.store.id, {
          version: action.store.version,
          reason,
        });
      } else if (action.type === "reject") {
        updatedStore = await rejectStore(action.store.id, {
          version: action.store.version,
          reasonCode,
          reason,
        });
      }

      const storeWithReview = {
        ...updatedStore,
        reviewReason:
          updatedStore.reviewReason ||
          (action.type === "hold" || action.type === "reject"
            ? reason
            : ""),
        reviewReasonCode:
          updatedStore.reviewReasonCode ||
          (action.type === "reject" ? reasonCode : ""),
      };

      setSelectedStore(storeWithReview);
      setSuccessMessage(
        `${storeWithReview.name} 신청을 ${STORE_APPROVAL_STATUS_LABELS[storeWithReview.approvalStatus]} 처리했습니다.`
      );
      await loadApprovals(approvalPage.page, appliedFilters);
    } catch (error) {
      if (error.status === 409 && action.store?.id) {
        try {
          const refreshedStore = await getStoreApprovalDetail(
            action.store.id
          );
          setSelectedStore(refreshedStore);
          await loadApprovals(approvalPage.page, appliedFilters);
        } catch (refreshError) {
          // Preserve the original conflict message if the refresh also fails.
        }
      }

      setErrorMessage(
        error.code === "STORE_APPROVAL_VERSION_CONFLICT"
          ? "다른 운영자가 먼저 처리했습니다. 최신 정보를 다시 불러왔습니다."
          : error.message || "승인 상태 변경에 실패했습니다."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function openDocument(document) {
    if (!selectedStore || !document?.id) {
      return;
    }

    const previewWindow =
      typeof window !== "undefined" ? window.open("", "_blank") : null;

    if (previewWindow) {
      previewWindow.opener = null;
    }

    setDocumentAccessId(document.id);
    setErrorMessage("");

    try {
      const result = await getStoreDocumentAccessUrl(
        selectedStore.id,
        document.id,
        "preview"
      );

      if (previewWindow) {
        previewWindow.location.replace(result.accessUrl);
      } else if (typeof window !== "undefined") {
        window.open(result.accessUrl, "_blank", "noopener,noreferrer");
      }
    } catch (error) {
      previewWindow?.close();
      setErrorMessage(error.message || "문서 접근 URL을 발급하지 못했습니다.");
    } finally {
      setDocumentAccessId(null);
    }
  }

  const reasonDialogOpen = ["hold", "reject"].includes(
    pendingAction?.type
  );
  const reasonDialogTitle = getReasonDialogTitle(pendingAction);
  const reasonDialogDescription = getReasonDialogDescription(pendingAction);
  const selectedStatus = selectedStore?.approvalStatus;
  const canHold = selectedStatus === STORE_APPROVAL_STATUS.PENDING;
  const canApprove =
    selectedStatus === STORE_APPROVAL_STATUS.PENDING ||
    selectedStatus === STORE_APPROVAL_STATUS.ON_HOLD ||
    selectedStatus === STORE_APPROVAL_STATUS.REJECTED;
  const canReject =
    selectedStatus === STORE_APPROVAL_STATUS.PENDING ||
    selectedStatus === STORE_APPROVAL_STATUS.ON_HOLD ||
    selectedStatus === STORE_APPROVAL_STATUS.APPROVED;

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="STORE ONBOARDING"
        title="매장 승인 관리"
        description="신규 매장 신청과 제출 서류를 검토하고 승인, 보류, 반려 처리합니다."
        actions={
          <div className="admin-page-summary">
            <span>조회 결과</span>
            <strong>{approvalPage.totalElements.toLocaleString()}건</strong>
          </div>
        }
      />

      {successMessage ? (
        <div className="admin-notice admin-notice--success" role="status">
          {successMessage}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="admin-notice admin-notice--error" role="alert">
          <span>{errorMessage}</span>
          <button type="button" onClick={() => loadApprovals(approvalPage.page, appliedFilters)}>
            다시 시도
          </button>
        </div>
      ) : null}

      <section className="admin-panel">
        <div className="admin-mobile-filter-toolbar">
          <div>
            <strong>검색 및 필터</strong>
            <span>적용 {activeFilterCount}개</span>
          </div>
          <button
            type="button"
            aria-expanded={isMobileFiltersOpen}
            onClick={() => setIsMobileFiltersOpen((current) => !current)}
          >
            {isMobileFiltersOpen ? "상세 필터 닫기" : "상세 필터 열기"}
          </button>
        </div>
        <form
          className={
            isMobileFiltersOpen
              ? "admin-filter-form admin-filter-form--expanded"
              : "admin-filter-form admin-filter-form--collapsed"
          }
          onSubmit={handleSearch}
        >
          <label className="admin-filter-field admin-filter-field--wide">
            <span>검색어</span>
            <input
              type="search"
              value={filters.keyword}
              onChange={(event) => updateFilter("keyword", event.target.value)}
              placeholder="매장명, 대표자명, 연락처, 주소"
            />
          </label>
          <label className="admin-filter-field">
            <span>지역</span>
            <select
              value={filters.region}
              onChange={(event) => updateFilter("region", event.target.value)}
            >
              <option value="">전체</option>
              {STORE_REGION_OPTIONS.map((region) => (
                <option value={region.value} key={region.value}>
                  {region.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-filter-field">
            <span>업종</span>
            <select
              value={filters.category}
              onChange={(event) => updateFilter("category", event.target.value)}
            >
              <option value="">전체</option>
              {STORE_CATEGORY_OPTIONS.map((category) => (
                <option value={category.value} key={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-filter-field">
            <span>승인 상태</span>
            <select
              value={filters.status}
              onChange={(event) => updateFilter("status", event.target.value)}
            >
              <option value="">전체</option>
              {Object.entries(STORE_APPROVAL_STATUS_LABELS).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="admin-filter-field">
            <span>사업자 인증</span>
            <select
              value={filters.verificationStatus}
              onChange={(event) => updateFilter("verificationStatus", event.target.value)}
            >
              <option value="">전체</option>
              {Object.entries(VERIFICATION_STATUS_LABELS).map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
          <label className="admin-filter-field">
            <span>신청일 시작</span>
            <input
              type="date"
              value={filters.appliedFrom}
              onChange={(event) => updateFilter("appliedFrom", event.target.value)}
            />
          </label>
          <label className="admin-filter-field">
            <span>신청일 종료</span>
            <input
              type="date"
              value={filters.appliedTo}
              onChange={(event) => updateFilter("appliedTo", event.target.value)}
            />
          </label>
          <div className="admin-filter-actions">
            <button type="button" className="admin-button admin-button--secondary" onClick={resetFilters}>
              초기화
            </button>
            <button type="submit" className="admin-button admin-button--primary">
              조회
            </button>
          </div>
        </form>
        <div className="admin-filter-caption">
          <span>적용된 필터 {activeFilterCount}개</span>
          <span>행을 선택하면 우측에서 제출 서류와 상세 정보를 확인할 수 있습니다.</span>
        </div>
      </section>

      <section className="admin-panel admin-panel--table">
        <div className="admin-table-scroll admin-approval-table">
          <table className="admin-data-table admin-data-table--interactive">
            <thead>
              <tr>
                <th className="admin-table-checkbox">
                  <input type="checkbox" aria-label="현재 페이지 전체 선택" disabled />
                </th>
                <th>매장명</th>
                <th>업종</th>
                <th>지역</th>
                <th>사업자 인증</th>
                <th>상태</th>
                <th>신청일</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="admin-table-state">매장 신청 목록을 불러오는 중입니다.</td>
                </tr>
              ) : approvalPage.content.length === 0 ? (
                <tr>
                  <td colSpan={8} className="admin-table-state">
                    조건에 맞는 매장 신청이 없습니다.
                  </td>
                </tr>
              ) : (
                approvalPage.content.map((store) => (
                  <tr
                    key={store.id}
                    className={selectedStore?.id === store.id ? "admin-table-row--selected" : ""}
                    onClick={() => openStoreDetail(store.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openStoreDetail(store.id);
                      }
                    }}
                    tabIndex={0}
                  >
                    <td className="admin-table-checkbox">
                      <input
                        type="checkbox"
                        aria-label={`${store.name} 선택`}
                        onClick={(event) => event.stopPropagation()}
                      />
                    </td>
                    <td>
                      <strong>{store.name}</strong>
                      <small>{store.ownerName}</small>
                    </td>
                    <td>{store.category}</td>
                    <td>{store.region}</td>
                    <td>
                      <StatusBadge
                        status={store.verificationStatus}
                        label={VERIFICATION_STATUS_LABELS[store.verificationStatus]}
                      />
                    </td>
                    <td>
                      <StatusBadge
                        status={store.approvalStatus}
                        label={STORE_APPROVAL_STATUS_LABELS[store.approvalStatus]}
                      />
                    </td>
                    <td>{formatDate(store.appliedAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="admin-table-action"
                        onClick={(event) => {
                          event.stopPropagation();
                          openStoreDetail(store.id);
                        }}
                      >
                        검토
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div
          className="admin-mobile-card-list admin-mobile-approval-list"
          aria-label="모바일 매장 승인 목록"
        >
          {isLoading ? (
            <div className="admin-mobile-card-state">
              매장 신청 목록을 불러오는 중입니다.
            </div>
          ) : approvalPage.content.length === 0 ? (
            <div className="admin-mobile-card-state">
              조건에 맞는 매장 신청이 없습니다.
            </div>
          ) : (
            approvalPage.content.map((store) => (
              <article
                className={
                  selectedStore?.id === store.id
                    ? "admin-mobile-approval-card admin-mobile-approval-card--selected"
                    : "admin-mobile-approval-card"
                }
                key={store.id}
              >
                <header>
                  <div>
                    <span>{[store.region, store.category].filter(Boolean).join(" · ")}</span>
                    <h2>{store.name}</h2>
                    <small>대표자 {store.ownerName}</small>
                  </div>
                  <StatusBadge
                    status={store.approvalStatus}
                    label={STORE_APPROVAL_STATUS_LABELS[store.approvalStatus]}
                  />
                </header>

                <div className="admin-mobile-approval-card__meta">
                  <div>
                    <span>사업자 인증</span>
                    <StatusBadge
                      status={store.verificationStatus}
                      label={VERIFICATION_STATUS_LABELS[store.verificationStatus]}
                    />
                  </div>
                  <div>
                    <span>신청일</span>
                    <strong>{formatDate(store.appliedAt)}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  className="admin-mobile-approval-card__action"
                  onClick={() => openStoreDetail(store.id)}
                  aria-label={`${store.name} 신청 상세 검토`}
                >
                  신청 상세 검토
                </button>
              </article>
            ))
          )}
        </div>

        <div className="admin-pagination">
          <span>
            {approvalPage.totalElements.toLocaleString()}건 중{" "}
            {approvalPage.totalElements === 0 ? 0 : approvalPage.page * approvalPage.size + 1}-
            {Math.min(
              approvalPage.totalElements,
              (approvalPage.page + 1) * approvalPage.size
            )}
          </span>
          <div>
            <button
              type="button"
              onClick={() => loadApprovals(Math.max(0, approvalPage.page - 1), appliedFilters)}
              disabled={approvalPage.page === 0 || isLoading}
            >
              이전
            </button>
            <strong>{approvalPage.page + 1} / {approvalPage.totalPages}</strong>
            <button
              type="button"
              onClick={() => loadApprovals(approvalPage.page + 1, appliedFilters)}
              disabled={!approvalPage.hasNext || isLoading}
            >
              다음
            </button>
          </div>
        </div>
      </section>

      <DetailDrawer
        isOpen={Boolean(selectedStore)}
        title={selectedStore?.name || "매장 신청 상세"}
        description={selectedStore ? `${selectedStore.region || ""} ${selectedStore.category || ""}`.trim() : ""}
        onClose={() => setSelectedStore(null)}
        footer={
          <PermissionGuard
            permission={ADMIN_PERMISSIONS.STORE_APPROVE}
            fallback={<p className="admin-permission-message">조회 권한만 있어 승인 상태를 변경할 수 없습니다.</p>}
          >
            {isDetailLoading ? (
              <p className="admin-permission-message">신청 상태를 확인하고 있습니다.</p>
            ) : (
              <div className="admin-status-transition-actions">
                {selectedStatus === STORE_APPROVAL_STATUS.APPROVED ? (
                  <p className="admin-permission-message">
                    현재 승인 상태입니다. 반려로 변경하려면 신청자에게 전달할 사유를 입력해야 합니다.
                  </p>
                ) : selectedStatus === STORE_APPROVAL_STATUS.REJECTED ? (
                  <p className="admin-permission-message">
                    현재 반려 상태입니다. 다시 승인하면 운영 매장으로 전환됩니다.
                  </p>
                ) : null}
                <div className="admin-drawer-actions">
                  {canHold ? (
                    <button
                      type="button"
                      className="admin-button admin-button--secondary"
                      onClick={() => requestAction("hold")}
                      disabled={isSubmitting}
                    >
                      보류
                    </button>
                  ) : null}
                  {canReject ? (
                    <button
                      type="button"
                      className="admin-button admin-button--danger-outline"
                      onClick={() => requestAction("reject")}
                      disabled={isSubmitting}
                    >
                      반려
                    </button>
                  ) : null}
                  {canApprove ? (
                    <button
                      type="button"
                      className="admin-button admin-button--primary"
                      onClick={() => requestAction("approve")}
                      disabled={isSubmitting}
                    >
                      승인
                    </button>
                  ) : null}
                </div>
              </div>
            )}
          </PermissionGuard>
        }
      >
        {isDetailLoading ? (
          <div className="admin-drawer-loading">상세 정보를 불러오는 중입니다.</div>
        ) : selectedStore ? (
          <StoreApprovalDetail
            store={selectedStore}
            documentAccessId={documentAccessId}
            onDocumentOpen={openDocument}
          />
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        isOpen={pendingAction?.type === "approve"}
        title="매장 신청 승인"
        description={getApproveDialogDescription(pendingAction)}
        confirmLabel="승인하기"
        isSubmitting={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => executeAction()}
      />

      <ReasonDialog
        isOpen={reasonDialogOpen}
        title={reasonDialogTitle}
        description={reasonDialogDescription}
        confirmLabel={getReasonDialogConfirmLabel(pendingAction)}
        reasonCodeOptions={
          pendingAction?.type === "reject"
            ? STORE_REJECTION_REASON_OPTIONS
            : []
        }
        isSubmitting={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={executeAction}
      />
    </div>
  );
}

function StoreApprovalDetail({
  store,
  documentAccessId,
  onDocumentOpen,
}) {
  return (
    <div className="admin-store-detail">
      {store.mainImageUrl ? (
        <img className="admin-store-detail__image" src={store.mainImageUrl} alt={`${store.name} 대표`} />
      ) : (
        <div className="admin-store-detail__image admin-store-detail__image--empty">대표 이미지 없음</div>
      )}

      <div className="admin-store-detail__badges">
        <StatusBadge
          status={store.approvalStatus}
          label={STORE_APPROVAL_STATUS_LABELS[store.approvalStatus]}
        />
        <StatusBadge
          status={store.verificationStatus}
          label={VERIFICATION_STATUS_LABELS[store.verificationStatus]}
        />
      </div>

      <section>
        <h3>신청 정보</h3>
        <dl className="admin-detail-list">
          <div><dt>대표자</dt><dd>{store.ownerName}</dd></div>
          <div><dt>사업자등록번호</dt><dd>{store.businessNumber}</dd></div>
          <div><dt>연락처</dt><dd>{store.phone}</dd></div>
          <div><dt>이메일</dt><dd>{store.email}</dd></div>
          <div><dt>주소</dt><dd>{store.address}</dd></div>
          <div><dt>신청일</dt><dd>{formatDateTime(store.appliedAt)}</dd></div>
        </dl>
      </section>

      <section>
        <h3>매장 소개</h3>
        <p>{store.description}</p>
      </section>

      <section>
        <h3>대표 메뉴</h3>
        <div className="admin-tag-list">
          {store.representativeMenus.map((menu) => (
            <span key={typeof menu === "string" ? menu : menu.id || menu.name}>
              {typeof menu === "string" ? menu : menu.name}
              {typeof menu === "object" && menu.price != null
                ? ` · ${formatPrice(menu.price)}`
                : ""}
            </span>
          ))}
        </div>
      </section>

      <section>
        <h3>제출 서류</h3>
        <div className="admin-document-list">
          {store.documents.map((document) => (
            <button
              type="button"
              key={document.id}
              onClick={() => onDocumentOpen(document)}
              disabled={documentAccessId === document.id}
            >
              <span>{document.name}</span>
              <strong>
                {documentAccessId === document.id ? "발급 중" : "미리보기"}
              </strong>
            </button>
          ))}
        </div>
      </section>

      {store.reviewReason ? (
        <section className="admin-review-reason">
          <h3>최근 처리 사유</h3>
          {store.reviewReasonCode ? (
            <span>{getReviewReasonCodeLabel(store.reviewReasonCode)}</span>
          ) : null}
          <p>{store.reviewReason}</p>
        </section>
      ) : null}
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function formatPrice(value) {
  return `${Number(value).toLocaleString("ko-KR")}원`;
}

function getReviewReasonCodeLabel(reasonCode) {
  return (
    STORE_REJECTION_REASON_OPTIONS.find((option) => option.value === reasonCode)
      ?.label || reasonCode
  );
}

function getReasonDialogTitle(action) {
  if (action?.type === "hold") {
    return "매장 신청 보류";
  }
  if (action?.type === "reject") {
    return "매장 신청 반려";
  }

  return "매장 상태 변경";
}

function getReasonDialogDescription(action) {
  if (action?.type === "hold") {
    return "추가 확인이 필요한 내용을 기록하고 신청을 보류합니다.";
  }
  if (action?.type === "reject") {
    return action?.store?.approvalStatus === STORE_APPROVAL_STATUS.APPROVED
      ? "승인 상태를 반려로 변경합니다. 신청자에게 전달할 반려 사유를 구체적으로 입력해 주세요."
      : "신청자에게 전달할 수 있도록 반려 사유를 구체적으로 입력해 주세요.";
  }

  return "변경할 상태를 확인해 주세요.";
}

function getReasonDialogConfirmLabel(action) {
  if (action?.type === "hold") {
    return "보류하기";
  }
  if (action?.type === "reject") {
    return "반려하기";
  }

  return "변경하기";
}

function getApproveDialogDescription(action) {
  const storeName = action?.store?.name || "선택한 매장";

  return action?.store?.approvalStatus === STORE_APPROVAL_STATUS.REJECTED
    ? `${storeName}의 반려 상태를 승인으로 변경하고 운영 매장으로 전환할까요?`
    : `${storeName}을 승인하고 운영 매장으로 전환할까요?`;
}

export default AdminStoreApprovals;
