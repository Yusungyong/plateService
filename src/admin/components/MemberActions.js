import React, { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import {
  getMonitoredMember,
  revokeMemberSessions,
  searchMonitoredMembers,
} from "../../api/memberMonitoringApi";
import DetailDrawer from "./DetailDrawer";
import ReasonDialog from "./ReasonDialog";
import { ADMIN_PERMISSIONS as P } from "../constants/adminPermissions";
export default function MemberActions() {
  const [params] = useSearchParams(),
    requested = params.get("username") || "";
  const { user, canAdmin } = useAuth();
  const [keyword, setKeyword] = useState(requested),
    [members, setMembers] = useState([]),
    [detail, setDetail] = useState(null),
    [selected, setSelected] = useState(""),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const request = useRef(null),
    version = useRef(0),
    mounted = useRef(true),
    writing = useRef(false);
  useEffect(() => {
    const counter = version;
    mounted.current = true;
    return () => {
      mounted.current = false;
      counter.current++;
      request.current?.abort();
    };
  }, []);
  async function query(value, isDetail = false) {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const id = ++version.current;
    setError("");
    setBusy(true);
    if (isDetail) {
      setSelected(value);
      setDetail(null);
    } else setMembers([]);
    try {
      const result = await (isDetail
        ? getMonitoredMember(value, { signal: controller.signal })
        : searchMonitoredMembers(value, { signal: controller.signal }));
      if (mounted.current && id === version.current) {
        if (isDetail) setDetail(result);
        else setMembers(result);
      }
    } catch (e) {
      if (!controller.signal.aborted && mounted.current && id === version.current)
        setError(e.message || "회원 정보를 조회하지 못했습니다.");
    } finally {
      if (mounted.current && id === version.current) setBusy(false);
    }
  }
  useEffect(() => {
    setKeyword(requested);
    if (requested) query(requested, true);
    else query("");
  }, [requested]); // eslint-disable-line react-hooks/exhaustive-deps
  function close() {
    if (writing.current) return;
    version.current++;
    request.current?.abort();
    setSelected("");
    setDetail(null);
    setConfirm(false);
    setBusy(false);
  }
  async function revoke(reason) {
    if (writing.current || !detail) return;
    writing.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await revokeMemberSessions(selected, {
        reason,
        expectedTokenVersion: detail.member.tokenVersion,
      });
      if (mounted.current) {
        setConfirm(false);
        setMessage(
          `세션 ${result.endedSessions}개를 종료했습니다. 다시 로그인하면 사용할 수 있습니다.`
        );
        await query(selected, true);
      }
    } catch (e) {
      if (mounted.current) {
        setConfirm(false);
        setError(e.message || "처리 결과를 확인하지 못했습니다. 회원을 다시 조회해 주세요.");
      }
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const member = detail?.member;
  return (
    <section className="support-panel admin-member-search" aria-label="회원 검색 및 조치">
      <h2>회원 검색·조치</h2>
      <p>계정 ID 또는 닉네임으로 검색하고, 활동을 확인한 뒤 필요한 조치를 선택하세요.</p>
      <form
        className="admin-work-filter"
        onSubmit={(e) => {
          e.preventDefault();
          setMessage("");
          query(keyword.trim());
        }}
      >
        <label>
          회원 검색
          <input
            type="search"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={100}
            placeholder="계정 ID 또는 닉네임"
          />
        </label>
        <button disabled={busy} className="admin-button admin-button--primary">
          검색
        </button>
      </form>
      {!selected && error && <p role="alert">{error}</p>}
      {!selected && busy && <p role="status">조회 중…</p>}
      <ul className="admin-member-results">
        {members.map((row) => (
          <li key={row.username}>
            <div>
              <strong>{row.nickname || row.username}</strong>
              <small>
                @{row.username} · 유효 세션 {row.activeSessions}개
              </small>
            </div>
            <button
              type="button"
              className="admin-button admin-button--secondary"
              disabled={busy}
              onClick={() => query(row.username, true)}
            >
              회원 {row.username} 확인
            </button>
          </li>
        ))}
      </ul>
      {!busy && !error && !members.length && !selected && <p>검색된 회원이 없습니다.</p>}
      <DetailDrawer isOpen={!!selected} title={`회원 ${selected}`} onClose={close}>
        <div className="admin-member-details">
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          {busy && <p role="status">처리 중…</p>}
          {member && (
            <>
              <dl>
                <dt>계정</dt>
                <dd>{member.username}</dd>
                <dt>닉네임</dt>
                <dd>{member.nickname || "미설정"}</dd>
                <dt>가입일</dt>
                <dd>{member.createdAt || "미확인"}</dd>
                <dt>권한 구분</dt>
                <dd>{member.role}</dd>
                <dt>유효 세션</dt>
                <dd>{member.activeSessions}개</dd>
                <dt>최근 30일</dt>
                <dd>
                  신고 {detail.reports30d} · 사진 {detail.imagePosts30d} · 영상{" "}
                  {detail.videoPosts30d}
                </dd>
              </dl>
              <div className="admin-work-actions">
                {canAdmin(P.FEED_READ) && (
                  <Link to={`/admin/feeds?keyword=${encodeURIComponent(member.username)}`}>
                    작성 피드 확인 →
                  </Link>
                )}
                <button type="button" disabled={busy} onClick={() => query(selected, true)}>
                  회원 다시 조회
                </button>
                {canAdmin(P.ADMIN_ACCOUNT_MANAGE) &&
                  member.canRevokeSessions &&
                  member.username !== user?.accountSubject && (
                    <button
                      type="button"
                      className="admin-button admin-button--danger"
                      disabled={busy}
                      onClick={() => setConfirm(true)}
                    >
                      전체 세션 종료
                    </button>
                  )}
              </div>
              <p>
                세션 종료는 기존 로그인과 기기 푸시 등록을 해제합니다. 계정이나 콘텐츠를 삭제하지
                않으며, 회원은 다시 로그인할 수 있습니다.
              </p>
              <h3>최근 변경 10건</h3>
              {detail.recentChanges.length ? (
                <ul>
                  {detail.recentChanges.map((row) => (
                    <li key={row.historyId}>
                      {row.changeType || "회원 정보 변경"} ·{" "}
                      {row.at ? new Date(row.at).toLocaleString("ko-KR") : "시각 미확인"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>변경 기록이 없습니다.</p>
              )}
            </>
          )}
        </div>
      </DetailDrawer>
      <ReasonDialog
        isOpen={confirm}
        title="회원 전체 세션 종료"
        description={`${selected} 계정의 모든 기존 로그인을 종료합니다. 보안상 필요성과 처리 사유를 확인해 주세요.`}
        confirmLabel="세션 종료하기"
        isSubmitting={busy}
        onCancel={() => {
          if (!busy) setConfirm(false);
        }}
        onConfirm={revoke}
      />
    </section>
  );
}
