import React from "react";

export default function InquiryRetentionNotice({ entry }) {
  const state = entry?.retentionState;
  const deadline = entry?.privacyPurgeAt ? new Date(entry.privacyPurgeAt) : null;
  let message;
  if (state === "SCHEDULED" && deadline && Number.isFinite(deadline.getTime())) {
    const date = deadline.toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    message = `삭제 기준 시각: ${date} (한국 시간). 이 시각 이후 정기 작업에서 연락처·질문·답변·계정 연결을 포함한 문의 원문이 삭제됩니다.`;
  } else if (state === "COMPLETION_UNCONFIRMED") {
    message = "과거 처리 완료일이 확인되지 않은 문의입니다. 처리 완료가 맞는지 확인하고 ‘답변 완료’로 저장하면 저장 시각부터 90일을 계산합니다.";
  } else if (state === "REVIEW_REQUIRED") {
    message = "별도 보관 검토가 필요한 문의 유형입니다. 일반 문의의 90일 자동 삭제는 적용되지 않으며 운영자가 처리 기준을 확인해야 합니다.";
  } else if (state === "IN_PROGRESS") {
    message = "‘답변 완료’로 저장하면 처리 완료 시각부터 90일 후 문의 원문이 삭제 대상이 됩니다.";
  } else {
    message = "이 문의의 삭제 예정일을 확인할 수 없습니다. 보관 상태를 다시 확인해 주세요.";
  }
  return (
    <div className="faq-editor-caption" role="note" aria-label="문의 개인정보 보관 안내">
      <p>{message}</p>
      {state && state !== "REVIEW_REQUIRED" ? (
        <p>단순 답변 수정·비공개 전환은 삭제일을 연장하지 않습니다. 접수·검토 중으로 바꾸면 재개되며, 다시 답변 완료로 저장할 때 새로 계산합니다.</p>
      ) : null}
    </div>
  );
}
