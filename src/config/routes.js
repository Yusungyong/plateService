import {lazy} from "react";
const ContentVerification = lazy(() => import("../pages/ContentVerification"));
const FAQ = lazy(() => import("../pages/FAQ"));
const Feedback = lazy(() => import("../pages/Feedback"));
const MemberMonitoring = lazy(() => import("../pages/MemberMonitoring"));
const PrivacyPolicy = lazy(() => import("../pages/PrivacyPolicy"));
const PrivateInquiry = lazy(() => import("../pages/PrivateInquiry"));
const QnA = lazy(() => import("../pages/QnA"));
const QnAWrite = lazy(() => import("../pages/QnA").then(module => ({default: module.QnAWrite})));
const RestaurantDetail = lazy(() => import("../pages/RestaurantDetail"));
const RestaurantManagement = lazy(() => import("../pages/RestaurantManagement"));
const TermsOfService = lazy(() => import("../pages/TermsOfService"));
const MyInquiries = lazy(() => import("../pages/MyInquiries"));
const Signup = lazy(() => import("../pages/Signup"));
const BusinessDashboard = lazy(() => import("../pages/BusinessDashboard"));
const BusinessApplicationDetail = lazy(() => import("../pages/BusinessApplicationDetail"));
const BusinessApplications = lazy(() => import("../pages/BusinessApplications"));
const BusinessSignup = lazy(() => import("../pages/BusinessSignup"));
const AdminDashboard = lazy(() => import("../admin/pages/AdminDashboard"));
const AdminPlaceholderPage = lazy(() => import("../admin/pages/AdminPlaceholderPage"));
const AdminStoreApprovals = lazy(() => import("../admin/pages/AdminStoreApprovals"));
const AdminSeasonalFoods = lazy(() => import("../admin/pages/AdminSeasonalFoods"));
import { userHasAdminPermission, ADMIN_PERMISSIONS } from "../admin/constants/adminPermissions";

export const publicNavigationItems = [
  { path: "/", label: "접시 홈" },
  { path: "/faq", label: "자주 묻는 질문" },
  { path: "/qna", label: "공개 질문·답변" },
  { path: "/qna/private", label: "비공개 1:1 문의" },
  { path: "/feedback", label: "서비스 의견", available: false },
  { path: "/content-verification", label: "콘텐츠 검증", available: false },
  { path: "/terms-of-service", label: "이용약관" },
  { path: "/privacy-policy", label: "개인정보 처리방침" },
  { path: "/account-deletion", label: "계정 삭제 요청" },
  { path: "/child-safety", label: "아동 안전 기준" },
];

export const adminNavigationItems = [
  {
    path: "/admin/dashboard",
    label: "대시보드",
    icon: "dashboard",
    permission: ADMIN_PERMISSIONS.DASHBOARD_READ,
    group: "운영",
  },
  {
    path: "/admin/store-approvals",
    label: "입점 신청 심사",
    icon: "approval",
    permission: ADMIN_PERMISSIONS.STORE_READ,
    group: "운영",
  },
  {
    path: "/admin/stores",
    label: "매장 관리",
    icon: "store",
    permission: ADMIN_PERMISSIONS.RESTAURANT_MANAGE,
    group: "운영",
  },
  {
    path: "/admin/feeds",
    label: "피드 관리",
    icon: "feed",
    permission: ADMIN_PERMISSIONS.FEED_READ,
    group: "운영",
    available: false,
  },
  {
    path: "/admin/seasonal-foods", label: "제철 음식 관리", icon: "seasonal",
    permission: ADMIN_PERMISSIONS.SEASONAL_READ, group: "운영",
  },
  {
    path: "/admin/faq",
    label: "FAQ 관리",
    icon: "support",
    permission: ADMIN_PERMISSIONS.FAQ_MANAGE,
    group: "고객 지원",
  },
  {
    path: "/admin/qna",
    label: "Q&A 관리",
    icon: "support",
    permission: ADMIN_PERMISSIONS.QNA_MANAGE,
    group: "고객 지원",
  },
  {
    path: "/admin/member-monitoring",
    label: "회원 모니터링",
    icon: "member",
    permission: ADMIN_PERMISSIONS.MEMBER_MONITORING_READ,
    group: "고객 지원",
  },
];

export const businessNavigationItems = [
  { path: "/business/dashboard", label: "매장 운영 현황", requireBusiness: true },
  { path: "/business/signup", label: "식당 입점 신청" },
  { path: "/business/applications", label: "입점 신청 현황", requireAuth: true },
  { path: "/business/stores", label: "내 매장 관리", requireBusiness: true },
];

export const publicRoutes = [
  { path: "/faq", component: FAQ },
  { path: "/feedback", component: Feedback },
  { path: "/content-verification", component: ContentVerification },
];

export const accountPublicRoutes = [{ path: "/signup", component: Signup }];

export const openSupportRoutes = [
  { path: "/qna", component: QnA },
  { path: "/qna/new", component: QnAWrite },
  { path: "/qna/private", component: PrivateInquiry },
];

export const policyRoutes = [
  { path: "/child-safety/*", component: PrivacyPolicy },
  { path: "/account-deletion/*", component: PrivacyPolicy },
  { path: "/terms-of-service/*", component: TermsOfService },
  { path: "/privacy-policy/*", component: PrivacyPolicy },
  // Reserved; unpublished documents return a missing-document page, never a draft.
  { path: "/location-terms/*", component: TermsOfService },
];

export const businessSignupRoutes = [
  { path: "/business/applications/:applicationId/edit", component: BusinessSignup },
  {
    path: "/business/signup",
    component: BusinessSignup,
  },
];

export const businessApplicationRoutes = [
  {
    path: "/business/applications",
    component: BusinessApplications,
  },
  {
    path: "/business/applications/:applicationId",
    component: BusinessApplicationDetail,
  },
];

export const businessOwnerRoutes = [
  {
    path: "/business/dashboard",
    component: BusinessDashboard,
  },
  {
    path: "/business/stores",
    component: RestaurantManagement,
  },
  {
    path: "/business/stores/:restaurantId",
    component: RestaurantDetail,
  },
];

export const adminRoutes = [
  {
    path: "/admin/dashboard",
    component: AdminDashboard,
    permission: ADMIN_PERMISSIONS.DASHBOARD_READ,
  },
  {
    path: "/admin/store-approvals",
    component: AdminStoreApprovals,
    permission: ADMIN_PERMISSIONS.STORE_READ,
  },
  {
    path: "/admin/stores",
    component: RestaurantManagement,
    props: { adminMode: true },
    permission: ADMIN_PERMISSIONS.RESTAURANT_MANAGE,
  },
  {
    path: "/admin/stores/:restaurantId",
    component: RestaurantDetail,
    props: { adminMode: true },
    permission: ADMIN_PERMISSIONS.RESTAURANT_MANAGE,
  },
  {
    path: "/admin/feeds",
    component: AdminPlaceholderPage,
    props: {
      title: "피드 관리",
      description: "신고, 숨김, 추천 노출 흐름을 포함한 콘텐츠 검수 화면을 준비하고 있습니다.",
    },
    permission: ADMIN_PERMISSIONS.FEED_READ,
  },
  {
    path: "/admin/seasonal-foods", component: AdminSeasonalFoods,
    permission: ADMIN_PERMISSIONS.SEASONAL_READ,
  },
  {
    path: "/admin/faq",
    component: FAQ,
    props: {
      adminMode: true,
    },
    permission: ADMIN_PERMISSIONS.FAQ_MANAGE,
  },
  {
    path: "/admin/qna",
    component: QnA,
    props: {
      adminMode: true,
    },
    permission: ADMIN_PERMISSIONS.QNA_MANAGE,
  },
  {
    path: "/admin/member-monitoring",
    component: MemberMonitoring,
    permission: ADMIN_PERMISSIONS.MEMBER_MONITORING_READ,
  },
];

export const legacyBusinessRedirects = [
  {
    path: "/admin/restaurant-registration",
    to: "/business/signup",
  },
  {
    path: "/admin/restaurants",
    to: "/business/stores",
  },
  {
    path: "/admin/restaurants/:restaurantId",
    to: "/business/stores/:restaurantId",
  },
];

export function getAdminEntryPath(user) {
  return adminNavigationItems.find((item) =>
    item.available !== false && userHasAdminPermission(user, item.permission)
  )?.path || "/faq";
}

export const memberSupportRoutes = [{ path: "/qna/my", component: MyInquiries }];
