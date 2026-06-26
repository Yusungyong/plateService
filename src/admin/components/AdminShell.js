import React, { useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { adminNavigationItems } from "../../config/routes";
import { getPrimaryAdminRole } from "../constants/adminPermissions";
import "../styles/admin.css";

const ROLE_LABELS = {
  SUPER_ADMIN: "최고 관리자",
  ADMIN: "관리자",
  OPERATOR: "운영자",
  CONTENT_MANAGER: "콘텐츠 매니저",
  VIEWER: "조회 전용",
};

function AdminShell({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { canAdmin, logout, user } = useAuth();
  const [globalKeyword, setGlobalKeyword] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const visibleNavigationItems = useMemo(
    () =>
      adminNavigationItems.filter(
        (item) => item.available !== false && canAdmin(item.permission)
      ),
    [canAdmin]
  );
  const navigationGroups = useMemo(
    () =>
      visibleNavigationItems.reduce((groups, item) => {
        const groupName = item.group || "메뉴";
        return {
          ...groups,
          [groupName]: [...(groups[groupName] || []), item],
        };
      }, {}),
    [visibleNavigationItems]
  );
  const activeItem = visibleNavigationItems.find(({ path }) =>
    location.pathname.startsWith(path)
  );
  const primaryRole = getPrimaryAdminRole(user);
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole || "운영자";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  function handleGlobalSearch(event) {
    event.preventDefault();
    const keyword = globalKeyword.trim();
    navigate(
      keyword
        ? `/admin/store-approvals?keyword=${encodeURIComponent(keyword)}`
        : "/admin/store-approvals"
    );
    setIsSidebarOpen(false);
  }

  return (
    <div className="admin-shell">
      <aside
        id="admin-sidebar"
        className={
          isSidebarOpen
            ? "admin-sidebar admin-sidebar--open"
            : "admin-sidebar"
        }
      >
        <Link className="admin-brand" to="/admin/dashboard">
          <span className="admin-brand__mark" aria-hidden="true">
            P
          </span>
          <span>
            <strong>접시</strong>
            <small>운영자 관리자</small>
          </span>
        </Link>

        <nav className="admin-navigation" aria-label="운영자 관리 메뉴">
          {Object.entries(navigationGroups).map(([groupName, items]) => (
            <div className="admin-navigation__group" key={groupName}>
              <span className="admin-navigation__label">{groupName}</span>
              {items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={({ isActive }) => {
                    const classes = ["admin-navigation__link"];
                    if (isActive) {
                      classes.push("admin-navigation__link--active");
                    }
                    if (item.featured) {
                      classes.push("admin-navigation__link--featured");
                    }
                    return classes.join(" ");
                  }}
                >
                  <AdminNavIcon name={item.icon} />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <Link to="/faq">고객지원 화면으로 이동</Link>
        </div>
      </aside>

      {isSidebarOpen ? (
        <button
          type="button"
          className="admin-sidebar-backdrop"
          aria-label="메뉴 닫기"
          onClick={() => setIsSidebarOpen(false)}
        />
      ) : null}

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar__leading">
            <button
              type="button"
              className="admin-mobile-menu"
              onClick={() => setIsSidebarOpen((current) => !current)}
              aria-expanded={isSidebarOpen}
              aria-controls="admin-sidebar"
            >
              메뉴
            </button>
            <div className="admin-topbar__context">
              <span>내부 운영</span>
              <strong>{activeItem?.label || "관리자"}</strong>
            </div>
          </div>

          <form className="admin-global-search" onSubmit={handleGlobalSearch}>
            <label htmlFor="admin-global-search">승인 검색</label>
            <input
              id="admin-global-search"
              type="search"
              value={globalKeyword}
              onChange={(event) => setGlobalKeyword(event.target.value)}
              placeholder="매장명, 대표자명, 지역 검색"
            />
            <button type="submit">검색</button>
          </form>

          <div className="admin-profile">
            <button
              type="button"
              className="admin-notification"
              aria-label="알림 준비 중"
              title="알림 기능을 준비하고 있습니다."
              disabled
            >
              <span aria-hidden="true">!</span>
            </button>
            <div className="admin-profile__identity">
              <strong>{user?.displayName || user?.username || "운영자"}</strong>
              <span>{roleLabel}</span>
            </div>
            <button type="button" className="admin-logout" onClick={handleLogout}>
              로그아웃
            </button>
          </div>
        </header>

        <main className="admin-main">{children}</main>
      </div>
    </div>
  );
}

function AdminNavIcon({ name }) {
  const paths = {
    dashboard: "M4 4h6v6H4V4Zm10 0h6v4h-6V4ZM4 14h6v6H4v-6Zm10-2h6v8h-6v-8Z",
    approval: "M5 3h14v18H5V3Zm3 5h8M8 12h5m-5 4h7",
    store: "M3 9h18l-2-5H5L3 9Zm2 0v11h14V9M9 20v-6h6v6",
    feed: "M4 4h16v16H4V4Zm3 3h10M7 11h10M7 15h6",
    seasonal: "M12 21c0-8 3-13 9-17-1 8-4 13-9 17Zm0 0C10 13 7 9 3 7c0 7 3 12 9 14Z",
    support: "M4 5h16v14H4V5Zm3 4h10M7 13h7",
    member: "M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8-1a3 3 0 1 0 0-6m-8 9c-4 0-6 2-6 6h12c0-4-2-6-6-6Zm8-1c4 0 6 2 6 6h-8",
  };

  return (
    <svg
      className="admin-navigation__icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={name === "dashboard" ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name] || paths.dashboard} />
    </svg>
  );
}

export default AdminShell;
