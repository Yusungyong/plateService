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
  [VERIFICATION_STATUS.NOT_REQUESTED]: "심사 전",
  [VERIFICATION_STATUS.REVIEWING]: "입점 심사 중",
  [VERIFICATION_STATUS.VERIFIED]: "입점 심사 완료",
  [VERIFICATION_STATUS.REJECTED]: "입점 심사 반려",
};

export const STORE_REJECTION_REASON_OPTIONS = [
  { value: "MISSING_DOCUMENT", label: "필수 서류 누락" },
  { value: "INVALID_DOCUMENT", label: "유효하지 않은 서류" },
  { value: "BUSINESS_INFO_MISMATCH", label: "사업자 정보 불일치" },
  { value: "DUPLICATE_STORE", label: "중복 매장" },
  { value: "UNSUPPORTED_BUSINESS", label: "지원하지 않는 업종" },
  { value: "OTHER", label: "기타" },
];

export const STORE_REGION_OPTIONS = [
  { value: "SEOUL", label: "서울" },
  { value: "BUSAN", label: "부산" },
  { value: "DAEGU", label: "대구" },
  { value: "INCHEON", label: "인천" },
  { value: "GWANGJU", label: "광주" },
  { value: "DAEJEON", label: "대전" },
  { value: "ULSAN", label: "울산" },
  { value: "SEJONG", label: "세종" },
  { value: "GYEONGGI", label: "경기" },
  { value: "GANGWON", label: "강원" },
  { value: "CHUNGBUK", label: "충북" },
  { value: "CHUNGNAM", label: "충남" },
  { value: "JEONBUK", label: "전북" },
  { value: "JEONNAM", label: "전남" },
  { value: "GYEONGBUK", label: "경북" },
  { value: "GYEONGNAM", label: "경남" },
  { value: "JEJU", label: "제주" },
];

export const STORE_CATEGORY_OPTIONS = [
  { value: "KOREAN", label: "한식" },
  { value: "CHINESE", label: "중식" },
  { value: "JAPANESE", label: "일식" },
  { value: "WESTERN", label: "양식" },
  { value: "CAFE", label: "카페" },
  { value: "DESSERT", label: "디저트" },
];

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
