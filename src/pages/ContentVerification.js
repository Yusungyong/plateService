import React from "react";
import PageLayout from "../components/PageLayout";

const verificationQueue = [
  {
    title: "매장 소개 콘텐츠",
    state: "1차 검토",
    summary: "브랜드 가이드 일치 여부와 허위 정보 포함 여부를 확인 중입니다.",
  },
  {
    title: "사용자 신고 게시물",
    state: "우선 검토",
    summary: "신고 사유가 중복 접수되어 운영자 검토 우선순위를 올려둔 상태입니다.",
  },
  {
    title: "프로모션 문구",
    state: "수정 요청",
    summary: "필수 고지 문구가 누락되어 작성자에게 수정 요청을 보낼 수 있는 상태입니다.",
  },
];

function ContentVerification() {
  return (
    <PageLayout
      title="콘텐츠 검증"
      description="검수 대상과 처리 상태를 빠르게 비교할 수 있도록 운영 보드 형태의 카드 UI를 적용했습니다."
    >
      <div className="verification-board">
        {verificationQueue.map((item) => (
          <article key={item.title} className="verification-card">
            <span className="verification-card__state">{item.state}</span>
            <h3>{item.title}</h3>
            <p>{item.summary}</p>
            <div className="verification-card__footer">
              <span>담당자 배정 가능</span>
              <button type="button">상세 보기</button>
            </div>
          </article>
        ))}
      </div>
    </PageLayout>
  );
}

export default ContentVerification;
