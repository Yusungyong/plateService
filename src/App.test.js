import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the public support center for unauthenticated users", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "고객 지원 센터" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "자주 묻는 질문" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "공개 Q&A" })).toHaveAttribute("href", "/qna");
  expect(screen.getByRole("link", { name: "식당 점주" })).toHaveAttribute(
    "href",
    "/business/signup"
  );
});
