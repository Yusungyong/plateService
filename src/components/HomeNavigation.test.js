import { render, screen, cleanup, within } from "@testing-library/react";
import App from "../App";

afterEach(() => { cleanup(); localStorage.clear(); });

test.each([["/signup", "회원가입"], ["/qna", "공개 질문·답변"], ["/qna/private", "비공개 1:1 문의"], ["/login", "로그인"], ["/admin/dashboard", "운영자 로그인"], ["/business/applications", "비즈니스 로그인"]])("%s has one clear primary page heading", (path, title) => {
  window.history.replaceState({}, "", path);
  render(<App />);
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByRole("heading", {level: 1, name: title})).toBeInTheDocument();
  expect(screen.queryByText("접시 운영 공간")).not.toBeInTheDocument();
});

test.each(["/faq", "/qna", "/qna/private", "/signup", "/login", "/business/signup", "/terms-of-service", "/privacy-policy", "/terms-of-service/versions", "/terms-of-service/versions/legacy-629dc8a", "/location-terms", "/missing-page"])("%s provides an explicit homepage link", (path) => {
  window.history.replaceState({}, "", path);
  render(<App />);
  expect(screen.getAllByRole("link", { name: "접시 홈으로 이동" })[0]).toHaveAttribute("href", "/");
});

test("admin topbar provides a home link independently of the mobile sidebar", () => {
  const token = `${btoa('{}')}.${btoa(JSON.stringify({sub:"test",roles:["ADMIN"],permissions:["ADMIN_ACCESS","DASHBOARD_READ"]}))}.test`;
  localStorage.setItem("plate-service.auth", JSON.stringify({accessToken:token}));
  window.history.replaceState({}, "", "/admin/dashboard");
  const { container } = render(<App />);
  expect(within(container.querySelector(".admin-topbar")).getByRole("link", {name:"접시 홈으로 이동"})).toHaveAttribute("href", "/");
});
