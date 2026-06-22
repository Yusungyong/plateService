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
  const headerTitle = isBusinessArea ? "식당 비즈니스 센터" : "고객 지원 센터";
  const headerDescription = isBusinessArea
    ? "입점 신청부터 승인된 매장 관리까지 식당 담당자의 작업 흐름을 제공합니다."
    : "이용 가이드와 정책 문서를 확인하고, 운영자는 관리자 화면에서 FAQ, Q&A, 회원 현황을 함께 관리할 수 있습니다.";

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

          <nav className="app-nav" aria-label="고객 지원 메뉴">
            {visiblePublicNavigationItems.map(({ path, label }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  isActive ? "app-nav__link app-nav__link--active" : "app-nav__link"
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {visibleBusinessNavigationItems.length > 0 ? (
            <div className="app-partner-navigation">
              <span className="app-partner-navigation__label">식당 파트너</span>
              <nav className="app-nav app-nav--admin" aria-label="식당 비즈니스 메뉴">
                {visibleBusinessNavigationItems.map(({ path, label }) => (
                  <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                      isActive
                        ? "app-nav__link app-nav__link--admin app-nav__link--active"
                        : "app-nav__link app-nav__link--admin"
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          ) : null}
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppShell;
