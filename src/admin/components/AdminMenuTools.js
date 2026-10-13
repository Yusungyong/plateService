import UnsavedChangesGuard from "../../components/UnsavedChangesGuard";
import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_PERMISSIONS as P, userCanViewApiRegistry } from "../constants/adminPermissions";
import { getOperationsReviews, saveOperationsReview } from "../api/operationsReviewApi";
import "../styles/menu-tools.css";

export const MENU_SCOPES = {
  "/admin/operations": "OPERATIONS",
  "/admin/operations/incidents": "INCIDENTS",
  "/admin/operations/releases": "RELEASES",
  "/admin/dashboard": "DASHBOARD",
  "/admin/api-registry": "API_REGISTRY",
  "/admin/store-approvals": "APPROVALS",
  "/admin/stores": "STORES",
  "/admin/feeds": "FEEDS",
  "/admin/seasonal-foods": "SEASONAL",
  "/admin/faq": "FAQ",
  "/admin/qna": "QNA",
  "/admin/member-monitoring": "MEMBERS",
};
const SHORTCUTS = [
  ["입점 신청 처리", "/admin/store-approvals", P.STORE_READ],
  ["회원 확인", "/admin/member-monitoring", P.MEMBER_MONITORING_READ],
  ["피드 숨김·복원", "/admin/feeds", P.FEED_READ],
  ["문의 답변", "/admin/qna", P.QNA_MANAGE],
  ["제철 음식 편집", "/admin/seasonal-foods", P.SEASONAL_READ],
];
export default function AdminMenuTools() {
  const { pathname, search } = useLocation(),
    { user, canAdmin } = useAuth();
  const base = Object.keys(MENU_SCOPES)
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname === p || pathname.startsWith(p + "/"));
  if (!base || !userCanViewApiRegistry(user)) return null;
  const query = new URLSearchParams(search),
    candidate = query.get("username") || query.get("api") || "menu";
  const initialTarget = candidate.length <= 100 ? candidate : "menu";
  return (
    <MenuTools
      key={pathname + search}
      initialTarget={initialTarget}
      scope={MENU_SCOPES[base]}
      canWrite={canAdmin(P.SETTING_MANAGE)}
      shortcuts={SHORTCUTS.filter(([, path, permission]) => path !== base && canAdmin(permission))}
    />
  );
}
function MenuTools({ scope, canWrite, shortcuts, initialTarget }) {
  const [open, setOpen] = useState(false),
    [target, setTarget] = useState(initialTarget),
    [queried, setQueried] = useState(initialTarget),
    [reason, setReason] = useState(""),
    [status, setStatus] = useState("FOLLOW_UP"),
    [items, setItems] = useState([]),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const sequence = useRef(0),
    mounted = useRef(true),
    writing = useRef(false),
    controller = useRef(null);
  useEffect(() => {
    const counter = sequence;
    mounted.current = true;
    return () => {
      mounted.current = false;
      counter.current++;
      controller.current?.abort();
    };
  }, []);
  async function load(next = queried) {
    controller.current?.abort();
    controller.current = new AbortController();
    const signal = controller.current.signal,
      id = ++sequence.current;
    setBusy(true);
    setError("");
    setItems([]);
    setQueried(next);
    try {
      const result = await getOperationsReviews(scope, next, { signal });
      if (mounted.current && id === sequence.current) setItems(result);
    } catch (e) {
      if (mounted.current && !signal.aborted && id === sequence.current)
        setError(e.message || "점검 기록을 조회하지 못했습니다.");
    } finally {
      if (mounted.current && id === sequence.current) setBusy(false);
    }
  }
  async function submit(e) {
    e.preventDefault();
    if (writing.current) return;
    const selected = target.trim();
    if (!selected || selected.length > 100 || reason.trim().length < 10) {
      setError("대상과 10자 이상의 점검 내용을 입력해 주세요.");
      return;
    }
    writing.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await saveOperationsReview({ scope, target: selected, status, reason: reason.trim() });
      if (mounted.current) {
        setReason("");
        setMessage("운영 점검 기록을 저장했습니다.");
        await load(selected);
      }
    } catch (failure) {
      if (mounted.current)
        setError(failure.message || "저장 결과를 확인하지 못했습니다. 기록을 다시 조회해 주세요.");
    } finally {
      writing.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section className="admin-menu-tools" aria-label="메뉴 운영 조치">
      <UnsavedChangesGuard when={!!reason.trim()} pending={writing.current} />
      <div className="admin-menu-tools__bar">
        <span>운영 도구</span>
        <button
          type="button"
          className="admin-button admin-button--secondary"
          aria-expanded={open}
          disabled={busy}
          onClick={() => {
            if (!open) load(target.trim() || "menu");
            setOpen(!open);
          }}
        >
          운영 점검 기록
        </button>
        {shortcuts.map(([label, path]) => (
          <Link key={path} to={path}>
            {label} →
          </Link>
        ))}
      </div>
      {open && (
        <div className="admin-menu-tools__body">
          <p>
            확인 내용과 후속 조치를 남깁니다. 기록을 저장해도 오류 건수·회원 상태·콘텐츠 노출 상태는
            바뀌지 않습니다.
          </p>
          <form className="admin-menu-tools__form" onSubmit={submit}>
            <label>
              점검 대상
              <input
                value={target}
                maxLength={100}
                disabled={busy}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="menu 또는 회원 ID·게시물 번호"
                required
              />
            </label>
            <button
              type="button"
              disabled={busy || !target.trim()}
              onClick={() => load(target.trim())}
            >
              대상 기록 조회
            </button>
            {canWrite && (
              <>
                <label>
                  점검 결과
                  <select
                    value={status}
                    disabled={busy}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="FOLLOW_UP">추가 확인 필요</option>
                    <option value="VERIFIED">운영자 확인 완료</option>
                  </select>
                </label>
                <label className="admin-menu-tools__wide">
                  점검 내용
                  <textarea
                    rows={3}
                    value={reason}
                    disabled={busy}
                    onChange={(e) => setReason(e.target.value)}
                    minLength={10}
                    maxLength={1000}
                    placeholder="확인한 사실과 후속 조치 · 연락처나 토큰은 입력하지 마세요."
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="admin-button admin-button--primary"
                  disabled={busy}
                >
                  {busy ? "처리 중…" : "점검 기록 저장"}
                </button>
              </>
            )}
          </form>
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <h3>{queried} · 최근 점검 20개</h3>
          {busy ? (
            <p role="status">기록 확인 중…</p>
          ) : error ? null : items.length ? (
            <ul>
              {items.map((item) => (
                <li key={item.id}>
                  <strong>{item.status === "VERIFIED" ? "확인 완료" : "추가 확인"}</strong> ·{" "}
                  {new Date(item.at).toLocaleString("ko-KR")} · 담당자 #{item.actorUserId}
                  <p>{item.reason}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>저장된 점검 기록이 없습니다.</p>
          )}
        </div>
      )}
    </section>
  );
}
