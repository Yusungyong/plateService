import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
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
      ? "/business/stores"
      : "/business/applications"
    : "/business/signup";
  const primaryNavigationItems = isBusinessArea
    ? visibleBusinessNavigationItems
    : visiblePublicNavigationItems;
  const primaryNavigationLabel = isBusinessArea ? "식당 비즈니스 메뉴" : "고객 지원 메뉴";
  const headerTitle = isBusinessArea ? "식당 비즈니스 센터" : "고객 지원 센터";
  const headerDescription = isBusinessArea
    ? "입점 신청부터 승인된 매장 관리까지 식당 담당자의 작업 흐름을 제공합니다."
    : "궁금한 내용을 먼저 찾아보고, 공개 Q&A와 1:1 문의로 운영팀 답변을 받을 수 있습니다.";

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
      <header className="app-header">
        <div className="app-header__inner">
          <p className="app-header__eyebrow">{isBusinessArea ? "PLATE BUSINESS" : "PLATE SERVICE"}</p>
          <div className="app-header__topline">
            <div>
              <h1 className="app-header__title">{headerTitle}</h1>
              <p className="app-header__description">{headerDescription}</p>
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
                  <button type="button" onClick={() => navigate("/login")}>
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

      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppShell;
