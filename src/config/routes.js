import ContentVerification from "../pages/ContentVerification";
import FAQ from "../pages/FAQ";
import Feedback from "../pages/Feedback";
import MemberMonitoring from "../pages/MemberMonitoring";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import QnA from "../pages/QnA";
import TermsOfService from "../pages/TermsOfService";

export const publicNavigationItems = [
  { path: "/faq", label: "자주 묻는 질문" },
  { path: "/qna", label: "질문과 답변" },
  { path: "/feedback", label: "서비스 의견" },
  { path: "/content-verification", label: "콘텐츠 검수" },
  { path: "/terms-of-service", label: "이용약관" },
  { path: "/privacy-policy", label: "개인정보 처리방침" },
];

export const adminNavigationItems = [
  { path: "/admin/faq", label: "FAQ 관리" },
  { path: "/admin/qna", label: "Q&A 관리" },
  { path: "/admin/member-monitoring", label: "회원 모니터링" },
];

export const publicRoutes = [
  { path: "/faq", component: FAQ },
  { path: "/feedback", component: Feedback },
  { path: "/content-verification", component: ContentVerification },
];

export const openSupportRoutes = [{ path: "/qna", component: QnA }];

export const policyRoutes = [
  { path: "/terms-of-service", component: TermsOfService },
  { path: "/privacy-policy", component: PrivacyPolicy },
];

export const adminRoutes = [
  {
    path: "/admin/faq",
    component: FAQ,
    props: {
      adminMode: true,
    },
  },
  {
    path: "/admin/qna",
    component: QnA,
    props: {
      adminMode: true,
    },
  },
  {
    path: "/admin/member-monitoring",
    component: MemberMonitoring,
  },
];
