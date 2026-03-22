import React from "react";
import { NavLink } from "react-router-dom";
import { navigationItems } from "../config/routes";

function AppShell({ children }) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__inner">
          <p className="app-header__eyebrow">Plate Service</p>
          <h1 className="app-header__title">고객 지원 센터</h1>
          <p className="app-header__description">
            안내 문서와 고객 지원 페이지를 한 곳에서 관리합니다.
          </p>

          <nav className="app-nav" aria-label="고객 지원 메뉴">
            {navigationItems.map(({ path, label }) => (
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
        </div>
      </header>

      <main className="app-main">{children}</main>
    </div>
  );
}

export default AppShell;
