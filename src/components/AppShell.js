import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { adminNavigationItems, publicNavigationItems } from "../config/routes";

function AppShell({ children }) {
  const navigate = useNavigate();
  const { isAdmin, isAuthenticated, logout, user } = useAuth();

  function handleLogout() {
    logout();
    navigate("/faq", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <p className="app-header__eyebrow">PLATE SERVICE</p>
          <div className="app-header__topline">
            <div>
              <h1 className="app-header__title">고객 지원 센터</h1>
              <p className="app-header__description">
                이용 가이드와 정책 문서를 확인하고, 운영자는 관리자 화면에서 FAQ, Q&amp;A,
                회원 현황을 함께 관리할 수 있습니다.
              </p>
            </div>

            <div className="app-header__auth">
              {isAuthenticated ? (
                <>
                  <span>
                    {user?.displayName || user?.username || "사용자"}
                    {user?.role ? ` (${user.role})` : ""}
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
            {publicNavigationItems.map(({ path, label }) => (
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

          {isAdmin ? (
            <nav className="app-nav app-nav--admin" aria-label="관리자 메뉴">
              {adminNavigationItems.map(({ path, label }) => (
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
          ) : null}
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppShell;
