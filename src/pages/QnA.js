import React from "react";
import PageLayout from "../components/PageLayout";

const qnaEntries = [
  {
    status: "답변 완료",
    question: "콘텐츠 검수 결과는 어디서 확인하나요?",
    answer:
      "검수 결과는 추후 콘텐츠 검증 페이지와 연동해 상태값으로 보여주는 것이 좋습니다. 현재 시안에서는 고객지원 메뉴 안에서 검수 흐름을 확인할 수 있습니다.",
    meta: "운영팀 · 오늘 업데이트",
  },
  {
    status: "검토 중",
    question: "신고된 피드백을 관리자만 볼 수 있게 할 수 있나요?",
    answer:
      "가능합니다. 이후 작업에서 관리자 권한 분기와 내부 메모 필드를 추가하면 운영 화면으로 확장하기 쉽습니다.",
    meta: "서비스 정책팀 · 검토 대기",
  },
  {
    status: "접수",
    question: "문의 유형별로 담당자를 나눌 수 있나요?",
    answer:
      "현재 구조에서는 문의 카드에 담당 팀 정보를 붙이기 쉬운 상태입니다. 이후 목록 데이터를 API로 바꾸면 자동 분류도 붙일 수 있습니다.",
    meta: "지원 센터 · 분류 예정",
  },
];

function QnA() {
  return (
    <PageLayout
      title="질문과 답변"
      description="운영자가 직접 답변하는 흐름을 가정한 Q&A 보드 형태로 구성했습니다."
    >
      <div className="stack-layout">
        {qnaEntries.map((entry) => (
          <article key={entry.question} className="timeline-card">
            <div className="timeline-card__badge">{entry.status}</div>
            <h3>{entry.question}</h3>
            <p>{entry.answer}</p>
            <span className="timeline-card__meta">{entry.meta}</span>
          </article>
        ))}
      </div>
    </PageLayout>
  );
}

export default QnA;
