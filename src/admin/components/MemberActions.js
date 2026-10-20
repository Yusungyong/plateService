import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { getMonitoredMember, revokeMemberSessions, searchMonitoredMembers } from "../../api/memberMonitoringApi";
import ReasonDialog from "./ReasonDialog";
import UnsavedChangesGuard from "../../components/UnsavedChangesGuard";
import { ADMIN_PERMISSIONS as P } from "../constants/adminPermissions";
import "../styles/member-workspace.css";

export default function MemberActions() {
  const { user, canAdmin } = useAuth();
  const scope = JSON.stringify([user?.accountSubject, user?.roles, user?.permissions]);
  if (!canAdmin(P.MEMBER_MONITORING_READ)) return null;
  return <MemberWorkspace key={scope} user={user} canAdmin={canAdmin} />;
}

function MemberWorkspace({ user, canAdmin }) {
  const [params] = useSearchParams(), requested = params.get("username") || "";
  const [keyword, setKeyword] = useState(requested);
  const [members, setMembers] = useState([]), [detail, setDetail] = useState(null);
  const [selected, setSelected] = useState(""), [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false), [revoking, setRevoking] = useState(false);
  const [error, setError] = useState(""), [message, setMessage] = useState("");
  const request = useRef(null), mutation = useRef(null), version = useRef(0);
  const mounted = useRef(true), writing = useRef(false), heading = useRef(null);
  useEffect(() => {
    const counter = version;
    mounted.current = true;
    return () => { mounted.current = false; counter.current++; request.current?.abort(); mutation.current?.abort(); };
  }, []);
  async function query(value, isDetail = false, afterWrite = false) {
    if (writing.current && !afterWrite) return;
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    const id = ++version.current;
    setError(""); setBusy(true);
    if (isDetail) { setSelected(value); setDetail(null); }
    else { setMembers([]); setSelected(""); setDetail(null); setConfirm(false); }
    try {
      const result = await (isDetail ? getMonitoredMember(value, { signal: controller.signal }) : searchMonitoredMembers(value, { signal: controller.signal }));
      if (mounted.current && id === version.current) {
        if (isDetail) setDetail(result); else setMembers(result);
      }
    } catch (failure) {
      if (!controller.signal.aborted && mounted.current && id === version.current) setError(failure.message || "회원 정보를 조회하지 못했습니다.");
    } finally { if (mounted.current && id === version.current) setBusy(false); }
  }
  useEffect(() => {
    setKeyword(requested); setMessage("");
    if (requested) query(requested, true); else query("");
  }, [requested]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!selected) return;
    heading.current?.focus({ preventScroll: true });
    if (window.matchMedia?.("(max-width: 760px)").matches) heading.current?.scrollIntoView?.({ block: "start" });
  }, [selected]);
  function closeSelection() {
    if (writing.current) return;
    version.current++; request.current?.abort();
    setSelected(""); setDetail(null); setConfirm(false); setBusy(false); setError(""); setMessage("");
  }
  async function revoke(reason) {
    if (writing.current || !detail || !canAdmin(P.ADMIN_ACCOUNT_MANAGE) || !detail.member.canRevokeSessions || detail.member.username === user?.accountSubject) return;
    writing.current = true; setRevoking(true); setBusy(true); setError(""); setMessage("");
    const controller = new AbortController(); mutation.current = controller;
    try {
      const result = await revokeMemberSessions(selected, { reason, expectedTokenVersion: detail.member.tokenVersion }, { signal: controller.signal });
      if (mounted.current) {
        setConfirm(false);
        setMessage(`세션 ${result.endedSessions}개를 종료했습니다. 다시 로그인하면 사용할 수 있습니다.`);
        await query(selected, true, true);
      }
    } catch (failure) {
      if (mounted.current) { setConfirm(false); setError(failure.message || "처리 결과를 확인하지 못했습니다. 회원을 다시 조회해 주세요."); }
    } finally {
      writing.current = false;
      if (mounted.current) { setBusy(false); setRevoking(false); }
      if (mutation.current === controller) mutation.current = null;
    }
  }
  const member = detail?.member;
  const mayRevoke = member && canAdmin(P.ADMIN_ACCOUNT_MANAGE) && member.canRevokeSessions && member.username !== user?.accountSubject;
  return <section className="member-search-workspace" aria-label="회원 검색 및 조치">
    <UnsavedChangesGuard when={confirm} pending={revoking} />
    <div className="member-search-column">
      <div className="member-section-heading"><span className="member-eyebrow">01 · 회원 찾기</span><h2>누구를 확인할까요?</h2><p>계정 ID나 닉네임으로 찾고, 검색 결과에서 회원을 선택하세요.</p></div>
      <form className="member-search-form" onSubmit={event => { event.preventDefault(); setMessage(""); query(keyword.trim()); }}>
        <label><span>회원 검색</span><input type="search" value={keyword} disabled={revoking || confirm} onChange={event => setKeyword(event.target.value)} maxLength={100} placeholder="계정 ID 또는 닉네임" /></label>
        <button type="submit" disabled={busy || confirm} className="admin-button admin-button--primary">검색</button>
      </form>
      <p className="member-search-help">검색 결과는 최대 20명까지 표시해요. 찾는 회원이 없으면 검색어를 구체적으로 입력해 주세요.</p>
      {!selected && error && <p role="alert" className="member-feedback member-feedback--error">{error}</p>}
      {!selected && busy && <p role="status">회원 정보를 확인하고 있어요…</p>}
      <ul className="member-result-list" aria-label="회원 검색 결과">
        {members.map(row => <li key={row.username}><button type="button" className="member-result" aria-label={`회원 ${row.username} 확인`} aria-current={selected === row.username ? "true" : undefined} disabled={busy || confirm} onClick={() => { setMessage(""); query(row.username, true); }}>
          <span className="member-result-avatar" aria-hidden="true">{(row.nickname || row.username).slice(0, 1)}</span><span className="member-result-copy"><strong>{row.nickname || row.username}</strong><span>@{row.username}</span><small>유효 세션 {row.activeSessions}개</small></span><span className="member-result-arrow" aria-hidden="true">→</span>
        </button></li>)}
      </ul>
      {!busy && !error && !members.length && !selected && <div className="member-empty"><strong>검색된 회원이 없어요.</strong><p>계정 ID 또는 닉네임을 다시 확인해 주세요.</p></div>}
      {requested && !members.length && <p className="member-search-help">모니터링에서 선택한 회원을 보고 있어요. 다른 회원은 위에서 검색할 수 있어요.</p>}
    </div>
    <section className="member-detail-column" aria-label={selected ? `회원 ${selected}` : "회원 상세"} aria-busy={selected ? busy : false}>
      {!selected ? <div className="member-empty member-empty--detail"><span className="member-empty-mark" aria-hidden="true">◎</span><h2>회원의 활동을 한곳에서</h2><p>왼쪽 검색 결과에서 회원을 선택하면 가입 정보와 최근 활동, 가능한 조치가 여기에 표시돼요.</p></div> : <>
        <header className="member-detail-heading"><div><span className="member-eyebrow">02 · 회원 확인</span><h2 ref={heading} tabIndex={-1}>{member?.nickname || selected}</h2><p>@{selected}</p></div><button type="button" className="member-quiet-button" disabled={revoking || confirm} onClick={closeSelection}>선택 해제</button></header>
        {error && <p role="alert" className="member-feedback member-feedback--error">{error}</p>}
        {message && <p role="status" className="member-feedback">{message}</p>}
        {busy && <p role="status">{revoking ? "세션 종료 결과를 확인하고 있어요…" : "회원 정보를 불러오고 있어요…"}</p>}
        {member && <>
          <dl className="member-detail-facts"><div><dt>가입일</dt><dd>{member.createdAt ? formatDate(member.createdAt) : "미확인"}</dd></div><div><dt>권한 구분</dt><dd>{roleName(member.role)}</dd></div><div><dt>유효 세션</dt><dd>{member.activeSessions}개</dd></div></dl>
          <section className="member-activity"><h3>최근 30일 활동</h3><dl><div><dt>사진</dt><dd>{detail.imagePosts30d}</dd></div><div><dt>영상</dt><dd>{detail.videoPosts30d}</dd></div><div><dt>신고</dt><dd>{detail.reports30d}</dd></div></dl></section>
          <div className="member-primary-actions">{canAdmin(P.FEED_READ) && <Link to={`/admin/feeds?keyword=${encodeURIComponent(member.username)}`}>작성 피드 확인 <span aria-hidden="true">↗</span></Link>}<button type="button" className="member-quiet-button" disabled={busy || confirm} onClick={() => query(selected, true)}>회원 다시 조회</button></div>
          <details className="member-disclosure"><summary>최근 변경 10건 <span aria-hidden="true">+</span></summary>{detail.recentChanges.length ? <ul className="member-change-list">{detail.recentChanges.map(row => <li key={row.historyId}><strong>{row.changeType || "회원 정보 변경"}</strong><span>{row.at ? formatDate(row.at, true) : "시각 미확인"}</span></li>)}</ul> : <p>변경 기록이 없습니다.</p>}</details>
          <details className="member-disclosure member-security"><summary>보안 조치 <span aria-hidden="true">+</span></summary><p>세션을 종료하면 기존 로그인과 기기 푸시 등록이 해제돼요. 회원은 다시 로그인할 수 있어요.</p>{mayRevoke ? <button type="button" className="admin-button admin-button--danger" disabled={busy || confirm} onClick={() => setConfirm(true)}>전체 세션 종료</button> : <p className="member-search-help">{canAdmin(P.ADMIN_ACCOUNT_MANAGE) ? "보호 대상 계정은 이 화면에서 세션을 종료할 수 없어요." : "현재 권한으로 회원 정보를 조회할 수 있어요. 세션 종료 권한은 없어요."}</p>}</details>
        </>}
        {!member && !busy && error && <button type="button" className="member-quiet-button" onClick={() => query(selected, true)}>회원 다시 조회</button>}
      </>}
    </section>
    <ReasonDialog isOpen={confirm} title="회원 전체 세션 종료" description={`${selected} 계정의 모든 기존 로그인을 종료합니다. 보안상 필요성과 처리 사유를 확인해 주세요.`} confirmLabel="세션 종료하기" isSubmitting={revoking} onCancel={() => { if (!revoking) setConfirm(false); }} onConfirm={revoke} />
  </section>;
}
function formatDate(value, includeTime = false) { const date = new Date(value); return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "medium", ...(includeTime ? {timeStyle: "short"} : {}) }).format(date) : "시각 미확인"; }
function roleName(value) { return { USER: "일반 회원", ADMIN: "관리자", SUPER_ADMIN: "최고 관리자", OPERATOR: "운영자", VIEWER: "조회 전용", CONTENT_MANAGER: "콘텐츠 관리자" }[value] || value || "미확인"; }
