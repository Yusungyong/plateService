import React from "react";
import PageLayout from "../components/PageLayout";

function ContentVerification() {
  return (
    <PageLayout
      title="콘텐츠 검증 기능 준비 중"
      description="콘텐츠에 대한 의견이나 확인이 필요한 내용을 알려 주세요."
    >
      <section className="support-panel">
        <div className="support-panel__header">
          <span className="support-kicker">준비 중</span>
          <h3>콘텐츠 관련 문의</h3>
        </div>
        <p className="page-layout__description">
          확인이 필요한 콘텐츠의 링크와 내용을 공식 이메일 <a href="mailto:su12ng@gmail.com">su12ng@gmail.com</a>으로 보내 주세요.
        </p>
      </section>
    </PageLayout>
  );
}

export default ContentVerification;
