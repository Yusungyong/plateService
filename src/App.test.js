import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the public support center for unauthenticated users", () => {
  window.history.replaceState({}, "", "/faq");
  render(<App />);

  expect(screen.getByRole("heading", { level: 1, name: "자주 묻는 질문" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "고객 지원 센터" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "공개 질문·답변" })).toHaveAttribute("href", "/qna");
  expect(screen.getByRole("link", { name: "식당 점주" })).toHaveAttribute(
    "href",
    "/business/signup"
  );
});
