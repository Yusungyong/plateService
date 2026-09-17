import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";
import App from "../App";

test("the root route shows the app homepage and keeps support, admin and policy links", () => {
  window.history.replaceState({}, "", "/");
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: /오늘의 맛있는 발견/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /관리자 로그인/ })).toHaveAttribute("href", "/admin");
  expect(screen.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/privacy-policy");
  expect(screen.getAllByRole("link", { name: "고객지원" })[0]).toHaveAttribute("href", "/faq");
  expect(screen.queryByRole("heading", { name: "고객 지원 센터" })).not.toBeInTheDocument();
});

test.each(["App Store", "Google Play"])("unconfigured %s button provides working installation help", (store) => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  fireEvent.click(screen.getAllByRole("button", { name: `${store} 설치 안내` })[0]);
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  expect(within(screen.getByRole("dialog")).getByRole("link", { name: "su12ng@gmail.com" })).toHaveAttribute("href", expect.stringContaining("mailto:su12ng@gmail.com"));
  fireEvent.click(screen.getByRole("button", { name: "설치 안내 닫기" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("mobile menu exposes navigation and closes when selecting a section", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "메뉴 열기" }));
  expect(screen.getByRole("button", { name: "메뉴 닫기" })).toHaveAttribute("aria-expanded", "true");
  fireEvent.click(screen.getByRole("link", { name: "주요 기능" }));
  expect(screen.getByRole("button", { name: "메뉴 열기" })).toHaveAttribute("aria-expanded", "false");
});

test("home exposes existing service destinations and real section anchors", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  const shortcuts = within(screen.getByRole("navigation", { name: "서비스 바로가기" }));
  expect(shortcuts.getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/faq", "/qna", "/qna/private"]);
  expect(screen.getByRole("link", { name: "회원가입" })).toHaveAttribute("href", "/signup");
  expect(screen.getByRole("link", { name: "식당 비즈니스 시작하기" })).toHaveAttribute("href", "/business");
  for (const name of ["앱 소개", "주요 기능"]) {
    const target = screen.getByRole("link", { name }).getAttribute("href");
    expect(document.querySelector(target)).toHaveAttribute("tabindex", "-1");
  }
});
