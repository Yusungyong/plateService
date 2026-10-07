import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PageLayout from "../components/PageLayout";
export default function BusinessIntro() {
  const { isAuthenticated, isBusinessUser } = useAuth();
  return <PageLayout title="우리 식당을 접시에 소개하세요" description="로그인 후 입점을 신청하고, 승인된 매장을 관리할 수 있습니다.">
    <section className="support-panel"><h2>신청 전에 준비해 주세요</h2>
      <ul><li>담당자 이름과 연락처</li><li>사업자등록번호, 대표자명, 개업일</li><li>식당 주소, 카테고리와 메뉴 정보</li></ul>
      <p>신청서를 제출하면 검토가 진행됩니다. 신청만으로 식당이 바로 공개되지는 않습니다.</p>
      <ol><li>계정 로그인 후 신청서 작성</li><li>신청 현황에서 심사 결과 확인 및 요청 사항 보완</li><li>승인 후 매장 정보 관리</li></ol>
      <div className="admin-actions"><Link className="support-page-action support-page-action--primary" to="/business/signup">{isAuthenticated ? "입점 신청서 작성" : "로그인하고 입점 신청"}</Link>
      {isAuthenticated && <Link to={isBusinessUser ? "/business/dashboard" : "/business/applications"}>내 비즈니스 확인</Link>}
      <Link to="/qna/private">입점 관련 비공개 문의</Link></div>
    </section>
  </PageLayout>;
}
