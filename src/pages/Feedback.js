import React from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";

function Feedback() {
  return (
    <PageLayout
      title="서비스 의견 기능 준비 중"
      description="접시를 사용하며 느낀 점이나 개선 아이디어를 알려 주세요."
    >
      <section className="support-panel">
        <div className="support-panel__header">
          <span className="support-kicker">준비 중</span>
          <h2>여러분의 의견을 기다립니다</h2>
        </div>
        <p className="page-layout__description">
          의견과 문의는 비공개 1:1 문의로 보내 주세요. 작성한 내용은 본인과 담당자만 확인할 수 있습니다.
        </p>
        <div className="admin-actions">
          <Link className="button-primary" to="/qna/private">
            비공개 1:1 문의
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}

export default Feedback;
