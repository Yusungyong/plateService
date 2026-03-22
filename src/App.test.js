import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders support center header and default navigation", () => {
  render(<App />);

  expect(screen.getByRole("heading", { name: "고객 지원 센터" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "자주 묻는 질문" })).toBeInTheDocument();
});
