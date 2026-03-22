import React from "react";
import ContentVerification from "../pages/ContentVerification";
import FAQ from "../pages/FAQ";
import Feedback from "../pages/Feedback";
import PrivacyPolicy from "../pages/PrivacyPolicy";
import QnA from "../pages/QnA";
import TermsOfService from "../pages/TermsOfService";

// Single source of truth for menu order and route registration.
// When a new support page is added, update this file first.
export const navigationItems = [
  { path: "/faq", label: "자주 묻는 질문" },
  { path: "/qna", label: "질문과 답변" },
  { path: "/feedback", label: "서비스 의견" },
  { path: "/content-verification", label: "콘텐츠 검증" },
  { path: "/terms-of-service", label: "이용약관" },
  { path: "/privacy-policy", label: "개인정보 처리방침" },
];

export const appRoutes = [
  { path: "/faq", element: <FAQ /> },
  { path: "/qna", element: <QnA /> },
  { path: "/feedback", element: <Feedback /> },
  { path: "/content-verification", element: <ContentVerification /> },
  { path: "/terms-of-service", element: <TermsOfService /> },
  { path: "/privacy-policy", element: <PrivacyPolicy /> },
];
