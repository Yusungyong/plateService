import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DetailDrawer from "./DetailDrawer";
import ReasonDialog from "./ReasonDialog";
test("escape closes only the topmost reason dialog and keeps the detail open", () => {
  const closeDetail = jest.fn(),
    closeReason = jest.fn();
  render(
    <>
      <DetailDrawer isOpen title="회원 상세" onClose={closeDetail}>
        <button>상세 조치</button>
      </DetailDrawer>
      <ReasonDialog
        isOpen
        title="세션 종료 확인"
        onCancel={closeReason}
        onConfirm={jest.fn()}
        confirmLabel="종료"
      />
    </>
  );
  fireEvent.keyDown(window, { key: "Escape" });
  expect(closeReason).toHaveBeenCalledTimes(1);
  expect(closeDetail).not.toHaveBeenCalled();
});
test("pending reason action cannot be dismissed with escape", () => {
  const close = jest.fn();
  render(
    <ReasonDialog
      isOpen
      isSubmitting
      title="처리 확인"
      onCancel={close}
      onConfirm={jest.fn()}
      confirmLabel="저장"
    />
  );
  fireEvent.keyDown(window, { key: "Escape" });
  expect(close).not.toHaveBeenCalled();
});
test("tab wraps within confirmation and scroll state is restored after unmount", () => {
  document.body.style.overflow = "auto";
  const { unmount } = render(
    <ReasonDialog
      isOpen
      title="처리 확인"
      onCancel={jest.fn()}
      onConfirm={jest.fn()}
      confirmLabel="저장"
    />
  );
  const save = screen.getByRole("button", { name: "저장" });
  save.focus();
  fireEvent.keyDown(window, { key: "Tab" });
  expect(screen.getByLabelText("처리 사유")).toHaveFocus();
  expect(document.body.style.overflow).toBe("hidden");
  unmount();
  expect(document.body.style.overflow).toBe("auto");
});
