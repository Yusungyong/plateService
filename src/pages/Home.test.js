import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "./Home";
import App from "../App";

test("failed optimized screenshots fall back to the latest original without srcset retries", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  const image = screen.getByAltText("접시 앱의 음식 사진과 영상 콘텐츠 홈 화면");
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", "/images/home/KakaoTalk_20260915_211008421_02.png");
  expect(image).not.toHaveAttribute("srcset");
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", "/images/home/KakaoTalk_20260915_211008421_02.png");
});

test("the root route shows the app homepage and keeps support, admin and policy links", () => {
  window.history.replaceState({}, "", "/");
  render(<App />);
  expect(screen.getByRole("heading", { level: 1, name: /맛있는 순간을,.*우리의 이야기로/ })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /관리자 로그인/ })).toHaveAttribute("href", "/admin");
  expect(screen.getByRole("link", { name: "개인정보 처리방침" })).toHaveAttribute("href", "/privacy-policy");
  expect(screen.getAllByRole("link", { name: "고객지원" })[0]).toHaveAttribute("href", "/faq");
  expect(screen.queryByRole("heading", { name: "고객 지원 센터" })).not.toBeInTheDocument();
});

test.each([
  ["App Store", "https://apps.apple.com/kr/app/id6759185760"],
  ["Google Play", "https://play.google.com/store/apps/details?id=com.plateappnew"],
])("%s links open the production listing from both download sections", (store, url) => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  const links = screen.getAllByRole("link", { name: `${store}에서 접시 다운로드 (새 창)` });
  expect(links).toHaveLength(2);
  links.forEach(link => {
    expect(link).toHaveAttribute("href", url);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });
  expect(screen.queryByText(/준비 중/)).not.toBeInTheDocument();
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
    expect(screen.getAllByRole("region").find(region => `#${region.id}` === target)).toHaveAttribute("tabindex", "-1");
  }
});


test("feature previews support roving keyboard focus and load only the selected screen", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  const tabs = screen.getAllByRole("tab");
  expect(tabs.map(tab => tab.textContent)).toEqual(expect.arrayContaining([
    expect.stringContaining("맛집 발견"),
    expect.stringContaining("내 주변 지도"),
    expect.stringContaining("나만의 기록"),
  ]));
  const expectSelected = index => {
    tabs.forEach((tab, item) => {
      expect(tab).toHaveAttribute("aria-selected", String(item === index));
      expect(tab).toHaveAttribute("tabindex", item === index ? "0" : "-1");
    });
    const panel = screen.getByRole("tabpanel");
    expect(panel).toHaveAttribute("id", tabs[index].getAttribute("aria-controls"));
    expect(panel).toHaveAttribute("aria-labelledby", tabs[index].id);
    expect(within(panel).getAllByRole("img")).toHaveLength(1);
    const allPanels = screen.getAllByRole("tabpanel", { hidden: true });
    allPanels.filter(item => item !== panel).forEach(item => expect(within(item).queryByRole("img", {hidden: true})).not.toBeInTheDocument());
  };
  expectSelected(0);
  tabs[0].focus();
  fireEvent.keyDown(tabs[0], { key: "ArrowDown" });
  expectSelected(1);
  expect(tabs[1]).toHaveFocus();
  fireEvent.keyDown(tabs[1], { key: "End" });
  expectSelected(2);
  expect(tabs[2]).toHaveFocus();
  fireEvent.keyDown(tabs[2], { key: "ArrowRight" });
  expectSelected(0);
  fireEvent.keyDown(tabs[0], { key: "ArrowUp" });
  expectSelected(2);
  fireEvent.keyDown(tabs[2], { key: "Home" });
  expectSelected(0);
  expect(tabs[0]).toHaveFocus();
});

test("Escape restores menu focus and clicking outside dismisses the menu", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  const toggle = screen.getByRole("button", {name: "메뉴 열기"});
  fireEvent.click(toggle);
  screen.getByRole("link", {name: "앱 소개"}).focus();
  fireEvent.keyDown(document, {key: "Escape"});
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(toggle).toHaveFocus();
  fireEvent.click(toggle);
  fireEvent.pointerDown(screen.getByRole("heading", {level: 1}));
  expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("feature screenshot failures use their original image without repeated responsive retries", () => {
  render(<MemoryRouter><Home /></MemoryRouter>);
  fireEvent.click(screen.getByRole("tab", {name: "내 주변 지도"}));
  const image = within(screen.getByRole("tabpanel")).getByRole("img");
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", "/images/home/KakaoTalk_20260915_211008421_01.png");
  expect(image).not.toHaveAttribute("srcset");
  fireEvent.error(image);
  expect(image).toHaveAttribute("src", "/images/home/KakaoTalk_20260915_211008421_01.png");
});
