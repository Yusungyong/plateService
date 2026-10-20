import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import AdminPageHeader from "../components/AdminPageHeader";
import UnsavedChangesGuard from "../../components/UnsavedChangesGuard";
import DetailDrawer from "../components/DetailDrawer";
import ReasonDialog from "../components/ReasonDialog";
import "../styles/content-workspace.css";
import { ADMIN_PERMISSIONS as P } from "../constants/adminPermissions";
import {
  getAdminFeeds,
  getAdminFeed,
  getAdminFeedReports,
  moderateAdminFeed,
  feedPreviewImages,
} from "../api/feedModerationApi";
export default function AdminFeeds() {
  const { canAdmin } = useAuth();
  const [params,setParams] = useSearchParams();
  const query = new URLSearchParams([...params].filter(([key])=>["keyword","visibility","author","from","to","region","located","reported","recommended"].includes(key))).toString();
  const filters = useMemo(() => {
    const q=new URLSearchParams(query), result={keyword:q.get("keyword") || "", visibility:["visible","hidden"].includes(q.get("visibility")) ? q.get("visibility") : ""};
    for (const key of ["author","from","to","region"]) if(q.get(key))result[key]=q.get(key);
    for (const key of ["located","reported"]) if(["1","true"].includes(q.get(key)))result[key]=true;
    if (["true","false"].includes(q.get("recommended"))) result.recommended=q.get("recommended")==="true";
    return result;
  }, [query]);
  const page = /^\d{1,6}$/.test(params.get("page") || "") ? Number(params.get("page")) : 0;
  const selected = /^\d{1,10}$/.test(params.get("feed") || "") ? Number(params.get("feed")) : null;
  const visibility=filters.visibility, reportedOnly=!!filters.reported;
  const [keyword, setKeyword] = useState(filters.keyword);
  function changeQuery(changes, resetPage=true) {setParams(current => {const next=new URLSearchParams(current);if(resetPage)next.delete("page");Object.entries(changes).forEach(([key,value]) => {if(value===null||value===""||value===undefined)next.delete(key);else next.set(key,String(value));});return next;});}
  const setPage = value => changeQuery({page:typeof value === "function" ? value(page) : value},false);
  const setSelected = value => changeQuery({feed:value},false);
  const [list, setList] = useState(null),
    [detail, setDetail] = useState(null),
    [reports, setReports] = useState(null),
    [reportError, setReportError] = useState(""),
    [error, setError] = useState(""),
    [detailError, setDetailError] = useState(""),
    [message, setMessage] = useState(""),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [action, setAction] = useState(null),
    [reload, setReload] = useState(0),
    [detailReload, setDetailReload] = useState(0);
  const generation = useRef(0),
    mounted = useRef(true),
    writing = useRef(false);
  const selectedRef=useRef(selected);selectedRef.current=selected;
  useEffect(()=>{setAction(null);},[selected]);
  useEffect(() => {
    const counter = generation;
    mounted.current = true;
    return () => {
      mounted.current = false;
      counter.current++;
    };
  }, []);
  useEffect(() => {setKeyword(filters.keyword);}, [filters.keyword]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setList(null);
    getAdminFeeds({ ...filters, page }, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setList(result);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message || "피드 목록 조회 실패");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filters, page, reload]);
  useEffect(() => {
    if (selected === null) return;
    const controller = new AbortController(),
      id = ++generation.current;
    setDetail(null);
    setReports(null);
    setDetailError("");
    setReportError("");
    getAdminFeed(selected, { signal: controller.signal })
      .then((r) => {
        if (!controller.signal.aborted && id === generation.current) setDetail(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted && id === generation.current) setDetailError(e.message);
      });
    if (canAdmin(P.REPORT_READ))
      getAdminFeedReports(selected, { signal: controller.signal })
        .then((r) => {
          if (!controller.signal.aborted && id === generation.current) setReports(r);
        })
        .catch((e) => {
          if (!controller.signal.aborted && id === generation.current) setReportError(e.message);
        });
    const counter = generation;
    return () => {
      controller.abort();
      counter.current++;
    };
  }, [selected, canAdmin, detailReload]);
  function close() {
    if (writing.current) return;
    setSelected(null);
    setAction(null);
  }
  async function execute(reason) {
    if (writing.current || !detail || !action || selected === null || detail.feedId !== selected) return;
    writing.current = true;
    setSaving(true);
    setDetailError("");
    setMessage("");
    const id = selected,
      kind = action;
    try {
      const result = await moderateAdminFeed(id, kind, {
        reason,
        version: detail.version,
        ...(kind === "recommendation" ? { recommended: !detail.recommended } : {}),
      });
      if (mounted.current && selectedRef.current === id) {
        setDetail((previous) => ({ ...result, previewImages: previous?.previewImages || [] }));
        setAction(null);
        setMessage("피드 조치를 저장했습니다.");
        setReload((n) => n + 1);
      }
    } catch (e) {
      if (mounted.current && selectedRef.current === id) {
        setAction(null);
        setDetailError(e.message || "처리 결과를 확인하지 못했습니다. 다시 조회해 주세요.");
        if (e.status === 409) {
          try {
            const current = await getAdminFeed(id);
            if (mounted.current && id === selectedRef.current) setDetail(current);
          } catch {
            if (mounted.current && id === selectedRef.current) setDetail(null);
          }
        }
      }
    } finally {
      writing.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  const rows = list?.content || [];
  const visibleRows = rows;
  const applyVisibility = value => changeQuery({visibility:value});
  return (
    <div className="admin-page content-workspace">
      <UnsavedChangesGuard when={Boolean(action)} pending={saving} />
      <AdminPageHeader
        title="피드 관리"
        description="게시물을 찾아 선택하면 사진과 신고 내용을 확인하고 조치할 수 있어요."
      />
      <form
        className="admin-work-filter"
        onSubmit={(e) => {
          e.preventDefault();
          changeQuery({keyword:keyword.trim()});
        }}
      >
        <label>
          피드 검색
          <input
            type="search"
            value={keyword}
            maxLength={100}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="작성자 ID·내용·식당명"
          />
        </label>
        <button className="admin-button admin-button--primary" disabled={loading}>
          조회
        </button>
        <button type="button" disabled={loading} onClick={() => setReload((n) => n + 1)}>
          새로고침
        </button>
      </form>
      <div className="content-toolbar">
        <div className="content-status-tabs" role="group" aria-label="노출 상태">
          {[["", "전체"], ["visible", "노출 중"], ["hidden", "숨김"]].map(([value, label]) =>
            <button type="button" key={value} aria-pressed={visibility === value} onClick={() => applyVisibility(value)}>{label}</button>
          )}
        </div>
        <label className="content-report-filter"><input type="checkbox" checked={reportedOnly} onChange={event => changeQuery({reported:event.target.checked ? "1" : null})} />신고 있는 사진 전체</label>
      </div>
      <div className="content-toolbar"><label>추천 여부 <select aria-label="추천 여부" value={filters.recommended===undefined ? "" : String(filters.recommended)} onChange={event=>changeQuery({recommended:event.target.value})}><option value="">전체</option><option value="true">추천 중</option><option value="false">추천 아님</option></select></label></div>
      {Object.entries(filters).some(([,v])=>v!=="" && v!==undefined) && <div className="drilldown-filters" aria-label="적용한 피드 조건">{Object.entries(filters).filter(([,v])=>v!=="" && v!==undefined).map(([key,value])=><button type="button" key={key} onClick={()=>changeQuery({[key]:null})}>{({keyword:"검색",visibility:"노출",author:"작성자",from:"시작일",to:"종료일",region:"지역",located:"지역 정보",reported:"신고",recommended:"추천"})[key]}: {value===true ? "있음" : value===false ? "없음" : value} ×</button>)}<button type="button" onClick={()=>setParams({})}>조건 전체 초기화</button></div>}
      <p className="content-scope">사진 게시물만 관리합니다. 영상 게시물은 이 목록에 포함되지 않습니다. 기간은 한국 시간 등록일 기준이며 신고 필터는 처리 여부와 관계없이 신고 이력이 있는 사진입니다.</p>
      {error && <p role="alert">{error}</p>}
      {selected === null && message && <p role="status">{message}</p>}
      {loading && <p role="status">피드 조회 중…</p>}
      <section className="content-list" aria-label="사진 게시물 목록" aria-busy={loading}>
        {!loading && !error && list && <p className="content-results" role="status">{page + 1}페이지 · {visibleRows.length}개 표시{Number.isFinite(list.totalElements) ? ` / 조건에 맞는 전체 ${list.totalElements.toLocaleString()}개` : ""}</p>}
        {visibleRows.map(row => (
          <button type="button" className={`content-row${Number(row.reportCount) > 0 ? " content-row--reported" : ""}`} key={row.feedId} aria-label={`피드 #${row.feedId} 검토`} onClick={() => setSelected(row.feedId)}>
            <span className="content-row__mark" aria-hidden="true">{Number(row.reportCount) > 0 ? "!" : "#"}</span>
            <span className="content-row__body"><strong>{row.storeName || "식당 정보 없음"}</strong><span>{row.username} · 게시물 #{row.feedId}</span>{row.content && <span className="content-row__excerpt">{row.content}</span>}</span>
            <span className="content-row__state"><span>{row.visibilityStatus === "hidden" ? "숨김" : "노출 중"}{row.recommended ? " · 추천" : ""}</span><span className={Number(row.reportCount) > 0 ? "content-report-count" : ""}>{Number(row.reportCount) > 0 ? `신고 ${row.reportCount}건` : "신고 없음"}</span></span>
            <span className="content-row__arrow" aria-hidden="true">›</span>
          </button>
        ))}
        {!loading && !error && list && visibleRows.length === 0 && <div className="content-empty"><strong>조건에 맞는 사진이 없어요.</strong><p>적용한 조건을 해제하거나 다른 기간을 선택해 주세요.</p><button type="button" onClick={() => setParams({})}>필터 초기화</button></div>}
      </section>
      <div className="admin-work-actions">
        <button
          type="button"
          disabled={loading || page === 0}
          onClick={() => setPage((n) => n - 1)}
        >
          이전
        </button>
        <span>{page + 1}페이지</span>
        <button
          type="button"
          disabled={loading || !list?.hasNext}
          onClick={() => setPage((n) => n + 1)}
        >
          다음
        </button>
      </div>
      <DetailDrawer isOpen={selected !== null} title={`피드 #${selected}`} onClose={close}>
        {message && <p role="status">{message}</p>}
        {detailError && <p role="alert">{detailError}</p>}
        {!detail && !detailError && <p role="status">상세 조회 중…</p>}
        {detail && (
          <>
            <p>
              <strong>{detail.storeName || "식당 정보 없음"}</strong> · {detail.username}
            </p>
            {feedPreviewImages(detail.previewImages?.length ? detail.previewImages : detail.images).map((url) => (
              <FeedPreviewImage
                key={`${url}-${detailReload}`}
                className="admin-feed-preview"
                src={url}
                alt={`피드 #${detail.feedId} 사진`}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            ))}
            <p className="admin-feed-content">{detail.content || "본문 없음"}</p>
            <p>
              상태: {detail.visibilityStatus === "hidden" ? "숨김" : "노출"} · 추천:{" "}
              {detail.recommended ? "사용" : "미사용"}
            </p>
            <div className="admin-work-actions">
              {canAdmin(P.MEMBER_MONITORING_READ) && (
                <Link
                  to={`/admin/member-monitoring?username=${encodeURIComponent(detail.username)}`}
                >
                  작성자 확인 →
                </Link>
              )}
              {canAdmin(P.FEED_MODERATE) && (
                <button
                  type="button"
                  disabled={saving}
                  className="admin-button admin-button--danger"
                  onClick={() =>
                    setAction(detail.visibilityStatus === "hidden" ? "restore" : "hide")
                  }
                >
                  {detail.visibilityStatus === "hidden" ? "피드 복원" : "피드 숨김"}
                </button>
              )}
              {canAdmin(P.FEED_FEATURE) && (
                <button type="button" disabled={saving} onClick={() => setAction("recommendation")}>
                  {detail.recommended ? "추천 해제" : "추천 지정"}
                </button>
              )}
              <button type="button" disabled={saving} onClick={() => setDetailReload((n) => n + 1)}>
                상세 다시 조회
              </button>
            </div>
            <h3>최근 신고 20개</h3>
            {!canAdmin(P.REPORT_READ) ? (
              <p>신고 조회 권한이 필요합니다.</p>
            ) : reportError ? (
              <p role="alert">{reportError}</p>
            ) : reports ? (
              reports.content.length ? (
                <ul>
                  {reports.content.map((r) => (
                    <li key={r.id}>
                      {r.reason} · {r.status === "open" ? "활성 표시" : "해제 표시"}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>등록된 신고가 없습니다.</p>
              )
            ) : (
              <p>신고 조회 중…</p>
            )}
          </>
        )}
      </DetailDrawer>
      <ReasonDialog
        isOpen={!!action}
        title="피드 운영 조치"
        description={`피드 #${selected} · ${
          action === "hide"
            ? "사용자에게 보이지 않도록 숨깁니다."
            : action === "restore"
            ? "피드를 다시 노출합니다."
            : "추천 표시를 변경합니다."
        }`}
        confirmLabel="조치 저장"
        isSubmitting={saving}
        onCancel={() => {
          if (!saving) setAction(null);
        }}
        onConfirm={execute}
      />
    </div>
  );
}

function FeedPreviewImage(props) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p role="status">사진을 표시하지 못했습니다. 상세 새로고침으로 다시 확인해 주세요.</p>
  ) : <img {...props} alt={props.alt} onError={() => setFailed(true)} />;
}
