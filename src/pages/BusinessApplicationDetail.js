import React, { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  fetchBusinessApplicationDetail,
  submitBusinessApplication,
} from "../api/businessApplicationApi";
import PageLayout from "../components/PageLayout";
import {
  formatDate,
  toApprovalStatusLabel,
  toVerificationStatusLabel,
} from "./BusinessApplications";

const editableStatuses = new Set(["draft", "on_hold"]);
const regionLabels = {
  SEOUL: "서울",
  GYEONGGI: "경기",
  INCHEON: "인천",
  BUSAN: "부산",
  DAEGU: "대구",
  ETC: "기타",
};
const categoryLabels = {
  KOREAN: "한식",
  CHINESE: "중식",
  JAPANESE: "일식",
  WESTERN: "양식",
  SNACK: "분식",
  CAFE: "카페",
  DESSERT: "디저트",
  PUB: "주점",
  ETC: "기타",
};

const REVIEW_REASON_LABELS = {
  MISSING_DOCUMENT: "필수 서류 누락",
  INVALID_DOCUMENT: "유효하지 않은 서류",
  BUSINESS_INFO_MISMATCH: "사업자 정보 불일치",
  DUPLICATE_STORE: "중복 매장",
  UNSUPPORTED_BUSINESS: "지원하지 않는 업종",
  OTHER: "기타",
};

function BusinessApplicationDetail() {
  const { applicationId } = useParams();
  const location = useLocation();
  const [application, setApplication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(location.state?.notice || "");
  const [messageType, setMessageType] = useState(location.state?.notice ? "success" : "error");

  const canSubmit = editableStatuses.has(application?.approvalStatus);
  const shouldShowReviewReason =
    application?.approvalStatus === "rejected" ||
    application?.approvalStatus === "on_hold";

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

    setIsSubmitting(true);
    setMessage("");

    try {
      await submitBusinessApplication(application.applicationId, {
        version: application.version,
      });

      setMessageType("success");
      setMessage("입점 신청이 제출되었습니다.");
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

        <ApplicationNextStep application={application} />
        <ApplicationStatusTimeline application={application} />

        {shouldShowReviewReason ? (
          <section
            className={`support-panel business-review-result business-review-result--${application.approvalStatus}`}
            aria-labelledby="business-review-result-title"
          >
            <div className="business-review-result__icon" aria-hidden="true">!</div>
            <div>
              <span className="support-kicker">REVIEW RESULT</span>
              <h3 id="business-review-result-title">
                {application.approvalStatus === "rejected"
                  ? "입점 신청이 반려되었습니다."
                  : "입점 신청에 보완이 필요합니다."}
              </h3>
              {application.reviewReasonCode ? (
                <strong className="business-review-result__reason-type">
                  {toReviewReasonLabel(application.reviewReasonCode)}
                </strong>
              ) : null}
              <p className="business-review-result__reason">
                {application.reviewReason ||
                  "등록된 상세 사유가 없습니다. 자세한 내용은 운영팀에 문의해 주세요."}
              </p>
              {application.approvalStatus === "rejected" ? (
                <Link className="restaurant-text-link" to="/qna">
                  운영팀에 문의하기
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

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
            <SummaryRow label="지역" value={toRegionLabel(application.store)} />
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
            {(application.categories || []).map((category, index) => (
              <span key={getCategoryKey(category, index)}>
                {toCategoryLabel(category)}
              </span>
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

        {canSubmit ? (
          <section className="support-panel">
            <div className="support-panel__header">
              <span className="support-kicker">SUBMIT</span>
              <h3>{application.approvalStatus === "on_hold" ? "보완 제출" : "검토 제출"}</h3>
            </div>
            <form className="business-resubmit-form" onSubmit={handleSubmitReview}>
              <p className="restaurant-field-hint">
                사업자 정보 검증이 완료된 신청은 첨부파일 없이 제출할 수 있습니다.
              </p>
              <div className="admin-actions">
                <button className="button-primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "제출 중" : application.approvalStatus === "on_hold" ? "보완 제출" : "검토 제출"}
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </PageLayout>
  );
}

function ApplicationNextStep({ application }) {
  const guidance = getApplicationGuidance(application);

  return (
    <section className="support-panel business-next-step">
      <div className="support-panel__header">
        <span className="support-kicker">NEXT STEP</span>
        <h3>{guidance.title}</h3>
      </div>
      <p className="page-layout__description">{guidance.description}</p>
      <ul className="bullet-list">
        {guidance.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {application.reviewReason ? (
        <div className="api-status api-status--error" role="note">
          최근 처리 사유: {application.reviewReason}
        </div>
      ) : null}
    </section>
  );
}

function ApplicationStatusTimeline({ application }) {
  const timeline = getApplicationTimeline(application);

  return (
    <section className="support-panel business-status-timeline">
      <div className="support-panel__header">
        <span className="support-kicker">TIMELINE</span>
        <h3>신청 진행 흐름</h3>
      </div>
      <ol className="business-status-timeline__list">
        {timeline.map((step) => (
          <li
            key={step.label}
            className={`business-status-timeline__item business-status-timeline__item--${step.state}`}
          >
            <div>
              <strong>{step.label}</strong>
              <p>{step.description}</p>
            </div>
            {step.date ? <time>{step.date}</time> : null}
          </li>
        ))}
      </ol>
    </section>
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

function getApplicationTimeline(application) {
  const status = application.approvalStatus || "draft";
  const savedDate = formatTimelineDate(application.createdAt || application.appliedAt || application.updatedAt);
  const reviewedDate = formatTimelineDate(application.reviewedAt || application.updatedAt);
  const submittedDate = formatTimelineDate(application.appliedAt || application.updatedAt);
  const timeline = [
    {
      label: "신청 정보 저장",
      description: "사업자와 매장 정보가 신청서에 저장되었습니다.",
      date: savedDate,
      state: "completed",
    },
  ];

  if (status === "draft") {
    timeline.push({
      label: "검토 제출 대기",
      description: "정보를 확인한 뒤 검토 제출을 진행하면 운영팀 검토가 시작됩니다.",
      date: formatTimelineDate(application.updatedAt),
      state: "current",
    });
    return timeline;
  }

  timeline.push({
    label: "검토 접수",
    description: "운영팀이 확인할 수 있도록 신청이 제출되었습니다.",
    date: submittedDate,
    state: ["pending", "reviewing"].includes(status) ? "current" : "completed",
  });

  if (status === "pending" || status === "reviewing") {
    timeline.push({
      label: "결과 안내 예정",
      description: "승인, 보완 요청, 반려 중 하나로 상태가 변경되면 이 화면에 표시됩니다.",
      date: "",
      state: "upcoming",
    });
    return timeline;
  }

  if (status === "on_hold") {
    timeline.push({
      label: "보완 요청",
      description: "운영팀이 추가 확인이 필요한 항목을 안내했습니다.",
      date: reviewedDate,
      state: "current",
    });
    return timeline;
  }

  if (status === "approved") {
    timeline.push({
      label: "승인 완료",
      description: "입점이 승인되어 매장 관리 화면에서 고객 노출 정보를 관리할 수 있습니다.",
      date: reviewedDate,
      state: "completed",
    });
    return timeline;
  }

  if (status === "rejected") {
    timeline.push({
      label: "반려 완료",
      description: "반려 사유를 확인한 뒤 필요한 경우 새 신청을 진행할 수 있습니다.",
      date: reviewedDate,
      state: "completed",
    });
    return timeline;
  }

  timeline.push({
    label: toApprovalStatusLabel(status),
    description: "현재 신청 상태를 확인해 주세요.",
    date: reviewedDate,
    state: "current",
  });
  return timeline;
}

function formatTimelineDate(value) {
  const formattedDate = formatDate(value);
  return formattedDate === "-" ? "" : formattedDate;
}

function getApplicationGuidance(application) {
  switch (application.approvalStatus) {
    case "draft":
      return {
        title: "아직 검토 제출 전입니다.",
        description: "입력한 신청 정보를 확인한 뒤 검토 제출을 진행해 주세요.",
        items: [
          "사업자 정보 검증 상태가 완료인지 확인해 주세요.",
          "매장 정보와 대표 메뉴가 실제 노출해도 되는 내용인지 확인해 주세요.",
          "제출 후 운영팀 검토가 시작됩니다.",
        ],
      };
    case "pending":
    case "reviewing":
      return {
        title: "운영팀이 신청 정보를 검토 중입니다.",
        description: "사업자 정보와 매장 정보를 확인하고 있습니다. 보통 1-3영업일 안에 상태가 변경됩니다.",
        items: [
          "추가 확인이 필요하면 보완 요청 상태로 변경됩니다.",
          "승인되면 매장 관리 화면에서 기본 정보와 메뉴를 관리할 수 있습니다.",
          "검토 중에는 같은 신청을 반복 제출하지 않아도 됩니다.",
        ],
      };
    case "on_hold":
      return {
        title: "보완이 필요한 신청입니다.",
        description: "운영팀 안내를 확인하고 필요한 정보를 보완한 뒤 다시 제출해 주세요.",
        items: [
          "최근 처리 사유가 표시되어 있다면 해당 항목을 먼저 확인해 주세요.",
          "보완 제출 후 운영팀이 같은 신청을 다시 검토합니다.",
          "보완할 내용이 명확하지 않으면 Q&A로 문의해 주세요.",
        ],
      };
    case "approved":
      return {
        title: "입점 신청이 승인되었습니다.",
        description: "승인된 매장은 매장 관리 화면에서 고객에게 보일 정보를 관리할 수 있습니다.",
        items: [
          "대표 이미지, 영업시간, 메뉴 정보를 최신 상태로 유지해 주세요.",
          "노출 상태를 변경하기 전 고객에게 보일 내용을 다시 확인해 주세요.",
        ],
      };
    case "rejected":
      return {
        title: "반려 후 확인할 사항입니다.",
        description: "반려 사유를 확인한 뒤 필요한 경우 새 입점 신청을 진행해 주세요.",
        items: [
          "사업자 정보, 매장 주소, 운영 기준에 맞지 않는 항목이 있는지 확인해 주세요.",
          "사유가 명확하지 않으면 Q&A를 통해 운영팀에 문의할 수 있습니다.",
        ],
      };
    default:
      return {
        title: "신청 상태를 확인해 주세요.",
        description: "상태가 변경되면 이 화면에서 다음 작업을 안내합니다.",
        items: ["신청 정보가 최신인지 확인해 주세요."],
      };
  }
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") {
    return "가격 미입력";
  }

  const price = Number(value);
  return Number.isFinite(price) ? `${price.toLocaleString()}원` : String(value);
}

function toRegionLabel(store = {}) {
  const code = store.regionCode || store.region?.code || store.region;
  const label = store.regionName || store.region?.name;
  return label || regionLabels[code] || code || "-";
}

function toCategoryLabel(category = {}) {
  if (typeof category === "string") {
    return categoryLabels[category] || category;
  }

  const code = category.categoryCode || category.code || category.category;
  const label = category.categoryName || category.name || category.label;
  return label || categoryLabels[code] || code || "-";
}

function getCategoryKey(category, index) {
  if (typeof category === "string") {
    return category || index;
  }

  return category.categoryCode || category.code || category.name || index;
}

function toReviewReasonLabel(reasonCode) {
  return REVIEW_REASON_LABELS[reasonCode] || reasonCode;
}

export default BusinessApplicationDetail;
