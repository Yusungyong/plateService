import React from "react";
import PageLayout from "../components/PageLayout";

function ContentVerification() {
  return (
    <PageLayout
      title="콘텐츠 검증 기능 준비 중"
      description="검수 대상 조회, 담당자 배정, 승인 이력을 처리할 관리자 서버 기능을 준비하고 있습니다."
    >
      <section className="support-panel">
        <div className="support-panel__header">
          <span className="support-kicker">준비 중</span>
          <h3>실제 검수 데이터가 연결된 뒤 관리자에게 공개됩니다.</h3>
        </div>
        <p className="page-layout__description">
          현재 표시할 수 있는 검수 목록이 없으며, 예시 데이터와 동작하지 않는 버튼은 제거했습니다.
        </p>
      </section>
    </PageLayout>
  );
}

export default ContentVerification;
