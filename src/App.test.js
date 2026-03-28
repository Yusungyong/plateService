import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders login screen for unauthenticated users", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "고객 지원 센터" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "로그인" })).toBeInTheDocument();
  expect(screen.getByLabelText("아이디")).toBeInTheDocument();
  expect(screen.getByLabelText("비밀번호")).toBeInTheDocument();
});
