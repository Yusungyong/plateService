import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBusinessApplications } from "../api/businessApplicationApi";
import PageLayout from "../components/PageLayout";

function BusinessApplications() {
  const [applicationPage, setApplicationPage] = useState({
    content: [],
    page: 0,
    size: 20,
    totalElements: 0,
    totalPages: 1,
    hasNext: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState("");
  const applications = useMemo(() => applicationPage.content || [], [applicationPage]);

  const loadApplications = useCallback(
    async (page = 0) => {
      setIsLoading(true);
      setMessage("");

      try {
        const response = await fetchBusinessApplications({
          page,
          size: applicationPage.size,
        });
        setApplicationPage(normalizeApplicationPage(response));
      } catch (error) {
        setMessage(error.message || "입점 신청 목록을 불러오지 못했습니다.");
      } finally {
        setIsLoading(false);
      }
    },
    [applicationPage.size]
  );

  useEffect(() => {
    loadApplications(0);
  }, [loadApplications]);

  return (
    <PageLayout
      title="입점 신청 현황"
      description="제출한 식당 입점 신청의 검토 상태와 보완 필요 여부를 확인합니다."
    >
      <div className="stack-layout restaurant-registration">
        {message ? (
          <div className="api-status api-status--error" role="alert">
            {message}
          </div>
        ) : null}

        <section className="support-panel">
          <div className="support-panel__header restaurant-menu-header">
            <div>
              <span className="support-kicker">APPLICATIONS</span>
              <h3>총 {applicationPage.totalElements.toLocaleString()}건</h3>
            </div>
            <Link className="restaurant-text-link" to="/business/signup">
              새 입점 신청
            </Link>
          </div>

          <div className="business-application-table" role="table" aria-label="입점 신청 목록">
            <div className="business-application-table__head" role="row">
              <span role="columnheader">매장명</span>
              <span role="columnheader">심사 상태</span>
              <span role="columnheader">입점 심사</span>
              <span role="columnheader">수정일</span>
              <span role="columnheader">작업</span>
            </div>

            <div className="business-application-table__body">
              {isLoading ? (
                <div className="board-empty">입점 신청 목록을 불러오는 중입니다.</div>
              ) : applications.length === 0 ? (
                <div className="board-empty">
                  아직 입점 신청이 없습니다. 새 입점 신청을 시작해 주세요.
                </div>
              ) : (
                applications.map((application) => (
                  <div
                    key={application.applicationId}
                    className="business-application-table__row"
                    role="row"
                  >
                    <div role="cell" data-label="매장명">
                      <strong>{application.storeName || "-"}</strong>
                      <p>신청 ID {application.applicationId}</p>
                    </div>
                    <span
                      className={`status-pill status-pill--${application.approvalStatus || "default"}`}
                      role="cell"
                      data-label="심사 상태"
                    >
                      {toApprovalStatusLabel(application.approvalStatus)}
                    </span>
                    <span role="cell" data-label="입점 심사">
                      {toVerificationStatusLabel(application.verificationStatus)}
                    </span>
                    <span role="cell" data-label="수정일">
                      {formatDate(application.updatedAt || application.appliedAt)}
                    </span>
                    <div className="restaurant-row-actions" role="cell" data-label="작업">
                      <Link to={`/business/applications/${application.applicationId}`}>
                        {toApplicationActionLabel(application.approvalStatus)}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="monitoring-pagination">
            <button
              type="button"
              onClick={() => loadApplications(Math.max(0, applicationPage.page - 1))}
              disabled={applicationPage.page === 0 || isLoading}
            >
              이전
            </button>
            <span>
              {applicationPage.page + 1} / {applicationPage.totalPages}
            </span>
            <button
              type="button"
              onClick={() => loadApplications(applicationPage.page + 1)}
              disabled={!applicationPage.hasNext || isLoading}
            >
              다음
            </button>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

function normalizeApplicationPage(response) {
  const content = Array.isArray(response?.content) ? response.content : [];

  return {
    content,
    page: Number(response?.page || 0),
    size: Number(response?.size || 20),
    totalElements: Number(response?.totalElements ?? content.length),
    totalPages: Math.max(1, Number(response?.totalPages || 1)),
    hasNext: Boolean(response?.hasNext),
  };
}

function toApplicationActionLabel(status) {
  switch (status) {
    case "draft":
      return "상세 보기";
    case "on_hold":
      return "보완 확인";
    case "approved":
      return "승인 상세";
    case "rejected":
      return "반려 상세";
    case "pending":
    default:
      return "상세 보기";
  }
}

export function toApprovalStatusLabel(status) {
  switch (status) {
    case "draft":
      return "작성 중";
    case "pending":
      return "검토 중";
    case "on_hold":
      return "보완 요청";
    case "approved":
      return "승인";
    case "rejected":
      return "반려";
    default:
      return status || "-";
  }
}

export function toVerificationStatusLabel(status) {
  switch (status) {
    case "not_requested":
      return "심사 전";
    case "reviewing":
      return "심사 중";
    case "verified":
      return "심사 완료";
    case "rejected":
      return "심사 반려";
    default:
      return status || "-";
  }
}

export function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString().slice(0, 10).replace(/-/g, ".");
}

export default BusinessApplications;
