import React from "react";
import PageLayout from "../components/PageLayout";

const sections = [
  {
    title: "수집 항목",
    items: [
      "필수 항목: 이름, 이메일, 로그인 ID",
      "선택 항목: 프로필 사진, 휴대전화 번호, 위치 정보",
      "자동 수집 항목: IP 주소, 브라우저 정보, 서비스 이용 기록, 쿠키",
    ],
  },
  {
    title: "이용 목적",
    items: [
      "회원 식별 및 로그인 관리",
      "서비스 제공과 품질 개선",
      "고객 문의 응대 및 공지 전달",
      "이벤트 및 마케팅 안내",
    ],
  },
  {
    title: "보관 및 파기",
    body: "수집 목적 달성 후에는 지체 없이 파기하며, 관련 법령이 요구하는 경우에만 별도 보관합니다.",
  },
  {
    title: "이용자 권리",
    body: "이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다.",
  },
  {
    title: "문의처",
    body: "dishapp.help@gmail.com",
  },
];

function PrivacyPolicy() {
  return (
    <PageLayout
      title="개인정보 처리방침"
      description="정책 문서를 길게 늘어놓기보다, 핵심 항목을 빠르게 스캔할 수 있는 정보 블록으로 배치했습니다."
    >
      <div className="policy-hero">
        <div>
          <span className="support-kicker">Policy Snapshot</span>
          <h3>핵심 원칙</h3>
        </div>
        <ul className="policy-hero__list">
          <li>최소 수집</li>
          <li>목적 외 사용 금지</li>
          <li>요청 시 열람 및 정정 지원</li>
        </ul>
      </div>

      <div className="policy-grid">
        {sections.map(({ title, body, items }) => (
          <section key={title} className="policy-card">
            <h3>{title}</h3>
            {body ? <p>{body}</p> : null}
            {items ? (
              <ul className="bullet-list">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ))}
      </div>
    </PageLayout>
  );
}

export default PrivacyPolicy;
