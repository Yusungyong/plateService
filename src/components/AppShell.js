import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import PlateBrand, { PlateFooter } from "./PlateBrand";
import {
  businessNavigationItems,
  publicNavigationItems,
} from "../config/routes";

function AppShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isBusinessUser, logout, user } = useAuth();
  const roleLabel = user?.roles?.length ? user.roles.join(", ") : user?.role;
  const isBusinessArea = location.pathname.startsWith("/business");
  const visiblePublicNavigationItems = publicNavigationItems.filter(
    (item) => item.available !== false
  );
  const visibleBusinessNavigationItems = businessNavigationItems.filter((item) => {
    if (item.requireBusiness) {
      return isBusinessUser;
    }

    if (item.requireAuth) {
      return isAuthenticated;
    }

    return true;
  });
  const businessHomePath = isAuthenticated
    ? isBusinessUser
      ? "/business/dashboard"
      : "/business/applications"
    : "/business/signup";
  const primaryNavigationItems = isBusinessArea
    ? visibleBusinessNavigationItems
    : visiblePublicNavigationItems;
  const primaryNavigationLabel = isBusinessArea ? "식당 비즈니스 메뉴" : "고객 지원 메뉴";
  const isAccountPage = location.pathname === "/signup";
  const headerTitle = isAccountPage ? "접시 계정" : isBusinessArea ? "식당 비즈니스" : "고객지원";
  const headerDescription = isBusinessArea
    ? "입점 신청부터 승인된 매장 관리까지 식당 담당자의 작업 흐름을 제공합니다."
    : "궁금한 내용을 먼저 찾아보고, 공개 질문·답변와 비공개 1:1 문의로 운영팀 답변을 받을 수 있습니다.";

  function isPublicNavigationActive(path) {
    if (path === "/qna") {
      return location.pathname === "/qna" || location.pathname === "/qna/new";
    }

    return location.pathname === path;
  }

  function handleLogout() {
    logout();
    navigate("/faq", { replace: true });
  }

  return (
    <div className="app-shell">
      <a className="plate-skip" href="#app-main">본문 바로가기</a>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="plate-section-bar"><PlateBrand /><span>{isAccountPage ? "계정 만들기" : isBusinessArea ? "접시 비즈니스" : "무엇을 도와드릴까요?"}</span></div>
          <p className="app-header__eyebrow">{isBusinessArea ? "PLATE BUSINESS" : "PLATE SERVICE"}</p>
          <div className="app-header__topline">
            <div>
              <p className="app-header__area">{headerTitle}</p>
              {!isAccountPage && <p className="app-header__description">{headerDescription}</p>}
            </div>

            <div className="app-header__actions">
              <div className="app-mode-switch" role="group" aria-label="사용자 모드 전환">
                <NavLink
                  to="/faq"
                  className={
                    isBusinessArea
                      ? "app-mode-switch__item"
                      : "app-mode-switch__item app-mode-switch__item--active"
                  }
                  aria-current={isBusinessArea ? undefined : "page"}
                >
                  일반 사용자
                </NavLink>
                <NavLink
                  to={businessHomePath}
                  className={
                    isBusinessArea
                      ? "app-mode-switch__item app-mode-switch__item--active"
                      : "app-mode-switch__item"
                  }
                  aria-current={isBusinessArea ? "page" : undefined}
                >
                  식당 점주
                </NavLink>
              </div>

              <div className="app-header__auth">
                {isAuthenticated ? (
                  <>
                    <span>
                      {user?.displayName || user?.username || "사용자"}
                      {roleLabel ? ` (${roleLabel})` : ""}
                    </span>
                    <button type="button" onClick={handleLogout}>
                      로그아웃
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => navigate("/login", { state: { from: isBusinessArea ? businessHomePath : location.pathname === "/signup" ? location.state?.from || "/faq" : location.pathname } })}>
                    로그인
                  </button>
                )}
              </div>
            </div>
          </div>

          <nav
            className={isBusinessArea ? "app-nav app-nav--admin" : "app-nav"}
            aria-label={primaryNavigationLabel}
          >
            {primaryNavigationItems.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  isBusinessArea
                    ? isActive
                      ? "app-nav__link app-nav__link--admin app-nav__link--active"
                      : "app-nav__link app-nav__link--admin"
                    : isPublicNavigationActive(path)
                      ? "app-nav__link app-nav__link--active"
                      : "app-nav__link"
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="app-main" id="app-main">
        <nav className="page-breadcrumb" aria-label="현재 위치"><NavLink to="/">접시 홈</NavLink><span aria-hidden="true">/</span><span>{headerTitle}</span>{location.pathname.startsWith("/business/applications/") && <><span aria-hidden="true">/</span><NavLink to="/business/applications">입점 신청 현황</NavLink><span aria-hidden="true">/</span><span aria-current="page">신청 상세</span></>}</nav>
        {children}
      </main>
      <PlateFooter />
    </div>
  );
}

export default AppShell;
