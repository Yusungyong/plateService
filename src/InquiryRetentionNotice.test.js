import React from "react";
import { render, screen } from "@testing-library/react";
import InquiryRetentionNotice from "./components/InquiryRetentionNotice";

test("shows the actual deadline and full raw record scope", () => {
  render(<InquiryRetentionNotice entry={{retentionState: "SCHEDULED", privacyPurgeAt: "2026-12-24T03:00:00Z"}} />);
  expect(screen.getByText(/2026.*12.*24.*연락처·질문·답변·계정 연결/)).toBeInTheDocument();
  expect(screen.getByText(/단순 답변 수정·비공개 전환은 삭제일을 연장하지 않습니다/)).toBeInTheDocument();
});
test.each([undefined, {retentionState: "SCHEDULED", privacyPurgeAt: "bad-date"}])("does not invent a date with an old server or invalid deadline", entry => {
  render(<InquiryRetentionNotice entry={entry} />);
  expect(screen.getByText(/삭제 예정일을 확인할 수 없습니다/)).toBeInTheDocument();
  expect(screen.queryByText(/Invalid Date/)).not.toBeInTheDocument();
});
test("requires explicit legacy completion confirmation", () => {
  render(<InquiryRetentionNotice entry={{retentionState: "COMPLETION_UNCONFIRMED"}} />);
  expect(screen.getByText(/처리 완료가 맞는지 확인하고/)).toBeInTheDocument();
});
test("does not promise automated deletion for unclassified inquiries", () => {
  render(<InquiryRetentionNotice entry={{retentionState: "REVIEW_REQUIRED"}} />);
  expect(screen.getByText(/90일 자동 삭제는 적용되지 않으며/)).toBeInTheDocument();
});
