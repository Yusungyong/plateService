import React from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";

function Feedback() {
  return (
    <PageLayout
      title="서비스 의견 기능 준비 중"
      description="실제 의견 접수와 처리 상태를 안전하게 저장할 서버 기능을 준비하고 있습니다."
    >
      <section className="support-panel">
        <div className="support-panel__header">
          <span className="support-kicker">준비 중</span>
          <h3>가짜 통계나 동작하지 않는 제출 버튼은 노출하지 않습니다.</h3>
        </div>
        <p className="page-layout__description">
          서버 연동이 완료되기 전까지 서비스 관련 문의는 Q&amp;A에서 접수해 주세요.
        </p>
        <div className="admin-actions">
          <Link className="button-primary" to="/qna">
            Q&amp;A로 이동
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}

export default Feedback;
