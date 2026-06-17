import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders login screen for unauthenticated users", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: /맛있는 연결을 만드는 접시 운영 공간/ })
  ).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
  expect(screen.getByLabelText("아이디")).toBeInTheDocument();
  expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
  expect(screen.getByRole("link", { name: "식당 입점 신청" })).toHaveAttribute(
    "href",
    "/business/signup"
  );
  expect(screen.getByRole("link", { name: "문의하기" })).toHaveAttribute("href", "/qna");
});
