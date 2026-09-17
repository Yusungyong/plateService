import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LegalPage from "./LegalPage";

test("SPA navigation shows the same public correction and version link", () => {
  render(<MemoryRouter initialEntries={["/privacy-policy"]}><LegalPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { level: 1, name: "개인정보 처리방침" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "이전 버전 열람" })).toHaveAttribute("href", "/privacy-policy/versions");
  expect(screen.queryByText(/30일/)).not.toBeInTheDocument();
});

test.each(["/location-terms", "/privacy-policy/versions/draft-2026-09-14"])("%s does not expose a draft", (url) => {
  render(<MemoryRouter initialEntries={[url]}><LegalPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "문서를 찾을 수 없습니다" })).toBeInTheDocument();
});
