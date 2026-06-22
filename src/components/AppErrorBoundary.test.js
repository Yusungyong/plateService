import React from "react";
import { render, screen } from "@testing-library/react";
import AppErrorBoundary from "./AppErrorBoundary";

function BrokenView() {
  throw new Error("render failed");
}

test("shows a recovery screen when a child view crashes", () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});

  render(
    <AppErrorBoundary>
      <BrokenView />
    </AppErrorBoundary>
  );

  expect(
    screen.getByRole("heading", { name: "화면을 표시하는 중 문제가 발생했습니다." })
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "새로고침" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "처음으로" })).toHaveAttribute("href", "/");

  consoleError.mockRestore();
});
