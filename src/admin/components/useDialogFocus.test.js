import { fireEvent, render, screen } from "@testing-library/react";
import useDialogFocus from "./useDialogFocus";

function Example({ onClose }) {
  const ref = useDialogFocus(true, onClose);
  return <section ref={ref} role="dialog" aria-modal="true" aria-label="상세">
    <button>닫기</button>
    <details><summary>추가 설정</summary><input aria-label="숨긴 입력" /></details>
    <button>마지막 작업</button>
  </section>;
}

test("closed settings are skipped during initial focus and keyboard wrapping", () => {
  render(<Example onClose={jest.fn()} />);
  expect(screen.getByRole("button", {name:"닫기"})).toHaveFocus();
  screen.getByRole("button", {name:"마지막 작업"}).focus();
  fireEvent.keyDown(window, {key:"Tab"});
  expect(screen.getByRole("button", {name:"닫기"})).toHaveFocus();
  fireEvent.keyDown(window, {key:"Tab", shiftKey:true});
  expect(screen.getByRole("button", {name:"마지막 작업"})).toHaveFocus();
});

test("escape in a native confirmation dialog does not close its parent drawer", () => {
  const close = jest.fn();
  render(<><Example onClose={close} /><dialog open aria-label="삭제 확인"><button>돌아가기</button></dialog></>);
  screen.getByRole("button", {name:"돌아가기"}).focus();
  fireEvent.keyDown(window, {key:"Escape"});
  expect(close).not.toHaveBeenCalled();
});
