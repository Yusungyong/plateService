export const STORE_APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  ON_HOLD: "on_hold",
};

export const STORE_APPROVAL_STATUS_LABELS = {
  [STORE_APPROVAL_STATUS.PENDING]: "대기",
  [STORE_APPROVAL_STATUS.APPROVED]: "승인",
  [STORE_APPROVAL_STATUS.REJECTED]: "반려",
  [STORE_APPROVAL_STATUS.ON_HOLD]: "보류",
};

export const VERIFICATION_STATUS = {
  NOT_REQUESTED: "not_requested",
  REVIEWING: "reviewing",
  VERIFIED: "verified",
  REJECTED: "rejected",
};

export const VERIFICATION_STATUS_LABELS = {
  [VERIFICATION_STATUS.NOT_REQUESTED]: "미신청",
  [VERIFICATION_STATUS.REVIEWING]: "심사 중",
  [VERIFICATION_STATUS.VERIFIED]: "인증 완료",
  [VERIFICATION_STATUS.REJECTED]: "인증 반려",
};

export function getStatusTone(status) {
  switch (status) {
    case STORE_APPROVAL_STATUS.APPROVED:
    case VERIFICATION_STATUS.VERIFIED:
      return "success";
    case STORE_APPROVAL_STATUS.PENDING:
    case STORE_APPROVAL_STATUS.ON_HOLD:
    case VERIFICATION_STATUS.REVIEWING:
      return "warning";
    case STORE_APPROVAL_STATUS.REJECTED:
    case VERIFICATION_STATUS.REJECTED:
      return "danger";
    default:
      return "neutral";
  }
}
