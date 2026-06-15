import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  approveStore,
  getStoreApprovalDetail,
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
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
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

  async function executeAction(reason = "") {
    if (!pendingAction) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      let updatedStore;
      if (pendingAction.type === "approve") {
        updatedStore = await approveStore(pendingAction.store.id);
      } else if (pendingAction.type === "hold") {
        updatedStore = await holdStore(pendingAction.store.id, reason);
      } else {
        updatedStore = await rejectStore(pendingAction.store.id, reason);
      }

      setSelectedStore(updatedStore);
      setSuccessMessage(
        `${updatedStore.name} 신청을 ${STORE_APPROVAL_STATUS_LABELS[updatedStore.approvalStatus]} 처리했습니다.`
      );
      setPendingAction(null);
      await loadApprovals(approvalPage.page, appliedFilters);
    } catch (error) {
      setErrorMessage(error.message || "승인 상태 변경에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const reasonDialogOpen =
    pendingAction?.type === "hold" || pendingAction?.type === "reject";
  const reasonDialogTitle =
    pendingAction?.type === "hold" ? "매장 신청 보류" : "매장 신청 반려";
  const reasonDialogDescription =
    pendingAction?.type === "hold"
      ? "추가 확인이 필요한 내용을 기록하고 신청을 보류합니다."
      : "신청자에게 전달할 수 있도록 반려 사유를 구체적으로 입력해 주세요.";

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
        <form className="admin-filter-form" onSubmit={handleSearch}>
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
              {["서울", "경기", "부산", "제주", "강원"].map((region) => (
                <option value={region} key={region}>{region}</option>
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
              {["한식", "일식", "분식", "카페", "베이커리"].map((category) => (
                <option value={category} key={category}>{category}</option>
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
        <div className="admin-table-scroll">
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
            <div className="admin-drawer-actions">
              <button
                type="button"
                className="admin-button admin-button--secondary"
                onClick={() => requestAction("hold")}
                disabled={isDetailLoading || isSubmitting}
              >
                보류
              </button>
              <button
                type="button"
                className="admin-button admin-button--danger-outline"
                onClick={() => requestAction("reject")}
                disabled={isDetailLoading || isSubmitting}
              >
                반려
              </button>
              <button
                type="button"
                className="admin-button admin-button--primary"
                onClick={() => requestAction("approve")}
                disabled={
                  isDetailLoading ||
                  isSubmitting ||
                  selectedStore?.approvalStatus === STORE_APPROVAL_STATUS.APPROVED
                }
              >
                승인
              </button>
            </div>
          </PermissionGuard>
        }
      >
        {isDetailLoading ? (
          <div className="admin-drawer-loading">상세 정보를 불러오는 중입니다.</div>
        ) : selectedStore ? (
          <StoreApprovalDetail store={selectedStore} />
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        isOpen={pendingAction?.type === "approve"}
        title="매장 신청 승인"
        description={`${pendingAction?.store?.name || "선택한 매장"}을 승인하고 운영 매장으로 전환할까요?`}
        confirmLabel="승인하기"
        isSubmitting={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={() => executeAction()}
      />

      <ReasonDialog
        isOpen={reasonDialogOpen}
        title={reasonDialogTitle}
        description={reasonDialogDescription}
        confirmLabel={pendingAction?.type === "hold" ? "보류하기" : "반려하기"}
        isSubmitting={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={executeAction}
      />
    </div>
  );
}

function StoreApprovalDetail({ store }) {
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
          {store.representativeMenus.map((menu) => <span key={menu}>{menu}</span>)}
        </div>
      </section>

      <section>
        <h3>제출 서류</h3>
        <div className="admin-document-list">
          {store.documents.map((document) => (
            <button type="button" key={document.id}>
              <span>{document.name}</span>
              <strong>확인</strong>
            </button>
          ))}
        </div>
      </section>

      {store.reviewReason ? (
        <section className="admin-review-reason">
          <h3>최근 처리 사유</h3>
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

export default AdminStoreApprovals;
