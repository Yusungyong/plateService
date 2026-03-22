import React from "react";
import PageLayout from "../components/PageLayout";

const feedbackStats = [
  { label: "이번 주 접수", value: "18", note: "신규 의견 기준" },
  { label: "처리 완료", value: "12", note: "운영 답변 반영" },
  { label: "개선 후보", value: "4", note: "다음 스프린트 검토" },
];

const feedbackTopics = [
  "검색 결과 정렬 옵션이 더 많았으면 좋겠어요.",
  "정책 문서를 모바일에서 읽기 쉽게 접을 수 있으면 좋겠습니다.",
  "문의 접수 후 상태를 타임라인으로 보고 싶어요.",
];

function Feedback() {
  return (
    <PageLayout
      title="서비스 의견"
      description="피드백 수집과 처리 현황을 한 화면에서 읽을 수 있도록 대시보드형 UI로 구성했습니다."
    >
      <div className="stack-layout">
        <section className="metric-grid">
          {feedbackStats.map((stat) => (
            <article key={stat.label} className="metric-card">
              <span className="metric-card__label">{stat.label}</span>
              <strong className="metric-card__value">{stat.value}</strong>
              <p className="metric-card__note">{stat.note}</p>
            </article>
          ))}
        </section>

        <section className="support-panel support-panel--split">
          <div>
            <div className="support-panel__header">
              <span className="support-kicker">최근 의견</span>
              <h3>자주 반복되는 요청</h3>
            </div>
            <ul className="bullet-list">
              {feedbackTopics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </div>

          <div className="mock-form">
            <div className="mock-form__row">
              <span>의견 유형</span>
              <strong>UI / UX</strong>
            </div>
            <div className="mock-form__field">개선 요청 내용을 입력하는 영역</div>
            <div className="mock-form__actions">
              <button type="button">임시 저장</button>
              <button type="button" className="button-primary">
                제출 예정
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageLayout>
  );
}

export default Feedback;
