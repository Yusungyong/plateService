import { fireEvent, render, screen } from "@testing-library/react";
import ReasonDialog from "./ReasonDialog";

test("keeps the entered rejection reason and submits the server reason code", () => {
  const onConfirm = jest.fn();

  render(
    <ReasonDialog
      isOpen
      title="매장 신청 반려"
      description="반려 사유를 입력합니다."
      confirmLabel="반려하기"
      reasonCodeOptions={[
        { value: "MISSING_DOCUMENT", label: "필수 서류 누락" },
        { value: "OTHER", label: "기타" },
      ]}
      onCancel={jest.fn()}
      onConfirm={onConfirm}
    />
  );

  fireEvent.change(screen.getByLabelText("반려 사유 유형"), {
    target: { value: "OTHER" },
  });
  fireEvent.change(screen.getByLabelText("처리 사유"), {
    target: { value: "신청 정보 확인이 추가로 필요합니다." },
  });
  fireEvent.click(screen.getByRole("button", { name: "반려하기" }));

  expect(onConfirm).toHaveBeenCalledWith(
    "신청 정보 확인이 추가로 필요합니다.",
    "OTHER"
  );
});
