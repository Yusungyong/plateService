import React from "react";
import PageLayout from "../components/PageLayout";

const termsSections = [
  {
    title: "서비스 이용 범위",
    description: "회원 계정 사용, 콘텐츠 등록, 운영 정책 적용 범위를 정의하는 구간입니다.",
  },
  {
    title: "사용자 책임",
    description: "허위 정보 등록, 타인 권리 침해, 운영 방해 행위에 대한 기준을 정리하는 구간입니다.",
  },
  {
    title: "운영 제한 및 제재",
    description: "경고, 숨김 처리, 계정 제한 같은 운영 조치를 어떤 기준으로 적용할지 정리합니다.",
  },
  {
    title: "면책 및 고지",
    description: "외부 연동 서비스, 정보 정확성, 장애 상황에 대한 책임 범위를 정리합니다.",
  },
];

function TermsOfService() {
  return (
    <PageLayout
      title="이용약관"
      description="조항 중심 문서라는 성격이 드러나도록 챕터 카드형 레이아웃으로 정리했습니다."
    >
      <div className="terms-grid">
        {termsSections.map((section, index) => (
          <article key={section.title} className="terms-card">
            <span className="terms-card__index">0{index + 1}</span>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
          </article>
        ))}
      </div>
    </PageLayout>
  );
}

export default TermsOfService;
