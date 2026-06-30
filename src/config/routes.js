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
import BusinessApplicationDetail from "../pages/BusinessApplicationDetail";
import BusinessApplications from "../pages/BusinessApplications";
import BusinessSignup from "../pages/BusinessSignup";
import AdminDashboard from "../admin/pages/AdminDashboard";
import AdminPlaceholderPage from "../admin/pages/AdminPlaceholderPage";
import AdminStoreApprovals from "../admin/pages/AdminStoreApprovals";
import { ADMIN_PERMISSIONS } from "../admin/constants/adminPermissions";

export const publicNavigationItems = [
  { path: "/faq", label: "자주 묻는 질문" },
  { path: "/qna", label: "공개 Q&A" },
  { path: "/qna/private", label: "1:1 문의" },
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
    label: "승인 관리",
    icon: "approval",
    permission: ADMIN_PERMISSIONS.STORE_READ,
    group: "운영",
  },
  {
    path: "/admin/stores",
    label: "매장 관리",
    icon: "store",
    permission: ADMIN_PERMISSIONS.STORE_READ,
    group: "운영",
    available: false,
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
    path: "/admin/seasonal-curations",
    label: "시즌 큐레이션",
    icon: "seasonal",
    permission: ADMIN_PERMISSIONS.SEASONAL_READ,
    group: "운영",
    featured: true,
    available: false,
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
    permission: ADMIN_PERMISSIONS.SUPPORT_MANAGE,
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
  { path: "/business/signup", label: "입점 신청" },
  { path: "/business/applications", label: "신청 현황", requireAuth: true },
  { path: "/business/stores", label: "매장 관리", requireBusiness: true },
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
  { path: "/terms-of-service", component: TermsOfService },
  { path: "/privacy-policy", component: PrivacyPolicy },
];

export const businessPublicRoutes = [
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
    component: AdminPlaceholderPage,
    props: {
      title: "매장 관리",
      description: "승인된 매장의 운영 상태와 콘텐츠 현황을 관리하는 화면을 준비하고 있습니다.",
    },
    permission: ADMIN_PERMISSIONS.STORE_READ,
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
    path: "/admin/seasonal-curations",
    component: AdminPlaceholderPage,
    props: {
      title: "시즌 큐레이션",
      description: "시즌 식재료와 매장 메뉴를 연결하는 운영 화면을 준비하고 있습니다.",
      featured: true,
    },
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
    permission: ADMIN_PERMISSIONS.SUPPORT_MANAGE,
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
