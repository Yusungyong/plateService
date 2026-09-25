import ContentVerification from "../pages/ContentVerification";
import FAQ from "../pages/FAQ";
import Feedback from "../pages/Feedback";
import MemberMonitoring from "../pages/MemberMonitoring";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import PrivateInquiry from "../pages/PrivateInquiry";
import QnA, { QnAWrite } from "../pages/QnA";
import RestaurantDetail from "../pages/RestaurantDetail";
import RestaurantManagement from "../pages/RestaurantManagement";
import TermsOfService from "../pages/TermsOfService";
import Signup from "../pages/Signup";
import BusinessDashboard from "../pages/BusinessDashboard";
import BusinessApplicationDetail from "../pages/BusinessApplicationDetail";
import BusinessApplications from "../pages/BusinessApplications";
import BusinessSignup from "../pages/BusinessSignup";
import AdminDashboard from "../admin/pages/AdminDashboard";
import AdminPlaceholderPage from "../admin/pages/AdminPlaceholderPage";
import AdminStoreApprovals from "../admin/pages/AdminStoreApprovals";
import AdminSeasonalFoods from "../admin/pages/AdminSeasonalFoods";
import AdminSeasonalCurations from "../admin/pages/AdminSeasonalCurations";
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
    path: "/admin/seasonal-foods", label: "제철 식재료 관리", icon: "seasonal",
    permission: ADMIN_PERMISSIONS.SEASONAL_READ, group: "운영",
  },
  {
    path: "/admin/seasonal-curations",
    label: "제철 큐레이션",
    icon: "seasonal",
    permission: ADMIN_PERMISSIONS.SEASONAL_READ,
    group: "운영",
    featured: true,
  },
  {
    path: "/admin/faq",
    label: "FAQ 관리",
    icon: "support",
    permission: ADMIN_PERMISSIONS.SUPPORT_MANAGE,
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
    permission: ADMIN_PERMISSIONS.SUPPORT_MANAGE,
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
  { path: "/terms-of-service/*", component: TermsOfService },
  { path: "/privacy-policy/*", component: PrivacyPolicy },
  // Reserved; unpublished documents return a missing-document page, never a draft.
  { path: "/location-terms/*", component: TermsOfService },
];

export const businessSignupRoutes = [
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
    path: "/admin/seasonal-curations",
    component: AdminSeasonalCurations,
    permission: ADMIN_PERMISSIONS.SEASONAL_READ,
  },
  {
    path: "/admin/faq",
    component: FAQ,
    props: {
      adminMode: true,
    },
    permission: ADMIN_PERMISSIONS.SUPPORT_MANAGE,
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
    permission: ADMIN_PERMISSIONS.SUPPORT_MANAGE,
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
