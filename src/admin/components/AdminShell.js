import { confirmFormLeave } from "../../components/formLeaveProtection";
import React, { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { adminNavigationItems } from "../../config/routes";
import { getPrimaryAdminRole, userCanViewApiRegistry } from "../constants/adminPermissions";
import "../styles/admin.css";
import "../styles/navigation.css";
import AdminMenuTools from "./AdminMenuTools";
import AdminMenuFinder from "./AdminMenuFinder";
import useDialogFocus from "./useDialogFocus";
import {NAV_GROUPS,navigationItem,activeNavigation,readPinnedMenus,writePinnedMenus} from "./adminNavigationModel";

const ROLE_LABELS = {SUPER_ADMIN:"최고 관리자",ADMIN:"관리자",OPERATOR:"운영자",CONTENT_MANAGER:"콘텐츠 매니저",VIEWER:"조회 전용"};

function AdminShell({ children }) {
  const location=useLocation(),navigate=useNavigate(),{canAdmin,logout,user}=useAuth();
  const [finderOpen,setFinderOpen]=useState(false),[isSidebarOpen,setIsSidebarOpen]=useState(false);
  const scope=user?.accountSubject||'';
  const [pinState,setPinState]=useState(()=>({scope,paths:readPinnedMenus(scope)}));
  const visibleNavigationItems=useMemo(()=>adminNavigationItems.filter(item=>item.available!==false&&canAdmin(item.permission)&&(!item.operatorOnly||userCanViewApiRegistry(user))).map(navigationItem),[canAdmin,user]);
  const pinned=(pinState.scope===scope?pinState.paths:readPinnedMenus(scope)).filter(p=>visibleNavigationItems.some(i=>i.path===p));
  const activeItem=activeNavigation(visibleNavigationItems,location.pathname);
  const home=visibleNavigationItems.find(i=>i.path==='/admin/operations')?.path||visibleNavigationItems[0]?.path||'/';
  const primaryRole=getPrimaryAdminRole(user),roleLabel=ROLE_LABELS[primaryRole]||primaryRole||'운영자';
  const sidebar=useDialogFocus(isSidebarOpen,()=>setIsSidebarOpen(false));
  useEffect(()=>{setFinderOpen(false);setIsSidebarOpen(false);},[scope,location.pathname]);
  useEffect(()=>{const key=e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'&&!document.querySelector('[role="dialog"][aria-modal="true"]')){e.preventDefault();setIsSidebarOpen(false);setFinderOpen(true);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  useEffect(()=>{const query=window.matchMedia?.('(min-width: 821px)');const close=e=>{if(e.matches)setIsSidebarOpen(false);};query?.addEventListener?.('change',close);return()=>query?.removeEventListener?.('change',close);},[]);
  function handleLogout(){if(!confirmFormLeave())return;logout();navigate('/login',{replace:true});}
  function togglePin(path){const paths=pinned.includes(path)?pinned.filter(p=>p!==path):[...pinned,path].slice(0,5);setPinState({scope,paths});writePinnedMenus(scope,paths);}
  function openFinder(){setIsSidebarOpen(false);setFinderOpen(true);}
  function menuLink(item){return <NavLink key={item.path} to={item.path} end={item.path==='/admin/operations'} onClick={()=>setIsSidebarOpen(false)} className={({isActive})=>'admin-navigation__link'+(isActive?' admin-navigation__link--active':'')}><AdminNavIcon name={item.icon}/><span>{item.label}</span></NavLink>;}
  return <div className={'admin-shell admin-shell--workspace'+(location.pathname.startsWith('/admin/operations')?' admin-shell--operations':'')}>
    <a className="plate-skip" href="#admin-main">본문 바로가기</a>
    <aside ref={sidebar} id="admin-sidebar" className={'admin-sidebar'+(isSidebarOpen?' admin-sidebar--open':'')} role={isSidebarOpen?'dialog':undefined} aria-modal={isSidebarOpen?true:undefined} aria-label={isSidebarOpen?'운영 메뉴':undefined}>
      <div className="admin-sidebar__brand"><Link to={home} aria-label="운영 시작 화면"><img src="/images/home/plate-mascot.png" width="44" height="44" alt=""/><span><strong>접시</strong><small>운영 공간</small></span></Link><button className="admin-sidebar__close" onClick={()=>setIsSidebarOpen(false)} aria-label="운영 메뉴 닫기">×</button></div>
      <button className="admin-sidebar__find" type="button" onClick={openFinder}><span>메뉴 찾기</span><kbd>⌘ / Ctrl K</kbd></button>
      <nav className="admin-navigation" aria-label="운영자 관리 메뉴">
        {pinned.length>0&&<div className="admin-navigation__group"><span className="admin-navigation__label">자주 쓰는 메뉴</span>{pinned.map(p=>menuLink(visibleNavigationItems.find(i=>i.path===p)))}</div>}
        {NAV_GROUPS.map(group=>{const items=visibleNavigationItems.filter(item=>item.group===group&&!pinned.includes(item.path));return items.length?<details className="admin-navigation__group" key={group} open><summary className="admin-navigation__label">{group}<span aria-hidden="true">⌄</span></summary>{items.map(menuLink)}</details>:null;})}
      </nav>
      <div className="admin-sidebar__footer"><Link to="/">접시 웹 보기 <span aria-hidden="true">↗</span></Link><small>작은 확인이 더 좋은 접시를 만들어요.</small></div>
    </aside>
    {isSidebarOpen&&<div className="admin-sidebar-backdrop" onClick={()=>setIsSidebarOpen(false)} aria-hidden="true"/>}
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div className="admin-topbar__leading"><button type="button" className="admin-mobile-menu" onClick={()=>setIsSidebarOpen(true)} aria-expanded={isSidebarOpen} aria-controls="admin-sidebar">메뉴</button><div className="admin-topbar__context"><span><Link to="/" aria-label="접시 홈으로 이동">접시</Link> / {activeItem?.group||'운영'}</span><strong>{activeItem?.label||'관리자'}</strong></div></div>
        <button type="button" className="admin-menu-search" onClick={openFinder} aria-label="메뉴 찾기"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10" cy="10" r="6"/><path d="m15 15 5 5"/></svg><span>어떤 일을 찾고 있나요?</span><kbd>⌘ / Ctrl K</kbd></button>
        <div className="admin-profile"><span className="admin-profile__avatar" aria-hidden="true">{(user?.displayName||user?.username||'운').slice(0,1)}</span><div className="admin-profile__identity"><strong>{user?.displayName||user?.username||'운영자'}</strong><span>{roleLabel}</span></div><button type="button" className="admin-logout" onClick={handleLogout}>로그아웃</button></div>
      </header>
      <main className="admin-main" id="admin-main">{children}<AdminMenuTools/></main>
    </div>
    {finderOpen&&<AdminMenuFinder key={scope} items={visibleNavigationItems} pinned={pinned} onPin={togglePin} onClose={()=>setFinderOpen(false)}/>}
  </div>;
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
