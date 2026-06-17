import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  fetchBusinessApplicationDetail,
  submitBusinessApplication,
  uploadBusinessApplicationDocument,
} from "../api/businessApplicationApi";
import PageLayout from "../components/PageLayout";
import {
  formatDate,
  toApprovalStatusLabel,
  toVerificationStatusLabel,
} from "./BusinessApplications";

const editableStatuses = new Set(["draft", "on_hold"]);

function BusinessApplicationDetail() {
  const { applicationId } = useParams();
  const location = useLocation();
  const [application, setApplication] = useState(null);
  const [documentFile, setDocumentFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(location.state?.notice || "");
  const [messageType, setMessageType] = useState(location.state?.notice ? "success" : "error");

  const businessRegistrationDocument = useMemo(() => {
    const documents = Array.isArray(application?.documents) ? application.documents : [];
    return documents.find((document) => document.documentType === "business_registration");
  }, [application]);

  const canSubmit = editableStatuses.has(application?.approvalStatus);

  const loadDetail = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetchBusinessApplicationDetail(applicationId);
      setApplication(response);
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "입점 신청 상세를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [applicationId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  async function handleSubmitReview(event) {
    event.preventDefault();

    if (!application) {
      return;
    }

    if (!businessRegistrationDocument && !documentFile) {
      setMessageType("error");
      setMessage("사업자등록증 파일을 업로드해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      if (documentFile) {
        await uploadBusinessApplicationDocument(application.applicationId, documentFile, {
          documentType: "business_registration",
        });
      }

      await submitBusinessApplication(application.applicationId, {
        version: application.version,
      });

      setMessageType("success");
      setMessage("입점 신청이 제출되었습니다.");
      setDocumentFile(null);
      await loadDetail();
    } catch (error) {
      setMessageType("error");
      setMessage(error.message || "입점 신청 제출에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <PageLayout title="입점 신청 상세" description="입점 신청 정보를 불러오는 중입니다.">
        <div className="board-empty">입점 신청 상세를 불러오는 중입니다.</div>
      </PageLayout>
    );
  }

  if (!application) {
    return (
      <PageLayout title="입점 신청 상세" description="입점 신청 정보를 확인할 수 없습니다.">
        {message ? (
          <div className="api-status api-status--error" role="alert">
            {message}
          </div>
        ) : null}
        <Link className="restaurant-text-link" to="/business/applications">
          신청 목록으로 이동
        </Link>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title={application.store?.storeName || "입점 신청 상세"}
      description={`신청 ID ${application.applicationId}의 검토 상태와 제출 정보를 확인합니다.`}
    >
      <div className="stack-layout restaurant-registration">
        {message ? (
          <div
            className={messageType === "success" ? "api-status api-status--success" : "api-status api-status--error"}
            role={messageType === "success" ? "status" : "alert"}
          >
            {message}
          </div>
        ) : null}

        <section className="support-panel business-detail-hero">
          <div>
            <span className={`status-pill status-pill--${application.approvalStatus || "default"}`}>
              {toApprovalStatusLabel(application.approvalStatus)}
            </span>
            <h3>{application.store?.storeName || "-"}</h3>
            <p>{application.store?.address || "-"}</p>
          </div>
          <div className="admin-actions">
            {application.storeId ? (
              <Link className="restaurant-text-link" to={`/business/stores/${application.storeId}`}>
                매장 관리로 이동
              </Link>
            ) : null}
            <Link className="restaurant-text-link restaurant-text-link--secondary" to="/business/applications">
              목록
            </Link>
          </div>
        </section>

        <div className="business-detail-grid">
          <section className="support-panel">
            <div className="support-panel__header">
              <span className="support-kicker">STATUS</span>
              <h3>검토 상태</h3>
            </div>
            <dl className="restaurant-summary">
              <SummaryRow label="심사 상태" value={toApprovalStatusLabel(application.approvalStatus)} />
              <SummaryRow label="검증 상태" value={toVerificationStatusLabel(application.verificationStatus)} />
              <SummaryRow label="신청일" value={formatDate(application.appliedAt)} />
              <SummaryRow label="수정일" value={formatDate(application.updatedAt)} />
              <SummaryRow label="버전" value={application.version} />
            </dl>
          </section>

          <section className="support-panel">
            <div className="support-panel__header">
              <span className="support-kicker">OWNER</span>
              <h3>담당자와 사업자</h3>
            </div>
            <dl className="restaurant-summary">
              <SummaryRow label="담당자" value={application.ownerProfile?.ownerName} />
              <SummaryRow label="연락처" value={application.ownerProfile?.ownerPhone} />
              <SummaryRow label="이메일" value={application.ownerProfile?.ownerEmail} />
              <SummaryRow label="상호명" value={application.business?.businessName} />
              <SummaryRow label="사업자번호" value={application.business?.businessNumber} />
            </dl>
          </section>
        </div>

        <section className="support-panel">
          <div className="support-panel__header">
            <span className="support-kicker">STORE</span>
            <h3>매장 정보</h3>
          </div>
          <dl className="restaurant-summary">
            <SummaryRow label="매장명" value={application.store?.storeName} />
            <SummaryRow label="지역" value={application.store?.regionCode} />
            <SummaryRow label="주소" value={application.store?.address} />
            <SummaryRow label="연락처" value={application.store?.phone} />
            <SummaryRow label="이메일" value={application.store?.email} />
            <SummaryRow label="소개" value={application.store?.description} />
          </dl>
        </section>

        <section className="support-panel">
          <div className="support-panel__header">
            <span className="support-kicker">CONTENT</span>
            <h3>카테고리와 메뉴</h3>
          </div>
          <div className="business-chip-list">
            {(application.categories || []).map((category) => (
              <span key={category.categoryCode}>{category.categoryCode}</span>
            ))}
          </div>
          <div className="business-menu-list">
            {(application.menus || []).length === 0 ? (
              <p className="restaurant-field-hint">등록된 대표 메뉴가 없습니다.</p>
            ) : (
              application.menus.map((menu) => (
                <article key={menu.id || menu.name} className="restaurant-menu-item">
                  <strong>{menu.name}</strong>
                  <p>{formatPrice(menu.price)}</p>
                  {menu.description ? <p>{menu.description}</p> : null}
                </article>
              ))
            )}
          </div>
        </section>

        <section className="support-panel">
          <div className="support-panel__header">
            <span className="support-kicker">DOCUMENTS</span>
            <h3>제출 서류</h3>
          </div>
          <div className="business-document-list">
            {(application.documents || []).length === 0 ? (
              <p className="restaurant-field-hint">업로드된 서류가 없습니다.</p>
            ) : (
              application.documents.map((document) => (
                <div key={document.id} className="business-document-row">
                  <strong>{toDocumentTypeLabel(document.documentType)}</strong>
                  <span>{document.originalName}</span>
                  <span>{toVerificationStatusLabel(document.verificationStatus)}</span>
                </div>
              ))
            )}
          </div>

          {canSubmit ? (
            <form className="business-resubmit-form" onSubmit={handleSubmitReview}>
              <label className="business-document-upload">
                <span>사업자등록증 보완 업로드</span>
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  onChange={(event) => setDocumentFile(event.target.files?.[0] || null)}
                />
                <small>새 파일을 선택하면 기존 사업자등록증을 대체합니다.</small>
              </label>
              {documentFile ? <p className="business-document-file">{documentFile.name}</p> : null}
              <div className="admin-actions">
                <button className="button-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "제출 중" : application.approvalStatus === "on_hold" ? "보완 제출" : "검토 제출"}
                </button>
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </PageLayout>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value || "-"}</dd>
    </div>
  );
}

function toDocumentTypeLabel(type) {
  switch (type) {
    case "business_registration":
      return "사업자등록증";
    case "sales_permit":
      return "영업신고증";
    case "identity_verification":
      return "신원 확인";
    case "other":
      return "기타";
    default:
      return type || "-";
  }
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "가격 미입력";
  }

  const price = Number(value);
  return Number.isFinite(price) ? `${price.toLocaleString()}원` : String(value);
}

export default BusinessApplicationDetail;
