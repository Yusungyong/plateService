import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_PERMISSIONS as P } from "../constants/adminPermissions";
import { formatLocalDate, getDefaultDashboardRange } from "../api/adminApiUtils";
import { getDashboardSummary } from "../api/adminDashboardApi";
import AdminPageHeader from "../components/AdminPageHeader";
import DetailDrawer from "../components/DetailDrawer";
import KpiCard from "../components/KpiCard";
import StatusBadge from "../components/StatusBadge";
import "../styles/content-workspace.css";
import { STORE_APPROVAL_STATUS_LABELS } from "../constants/adminStatuses";

function AdminDashboard() {
  const {canAdmin} = useAuth();
  const [params, setParams] = useSearchParams();
  const query = new URLSearchParams([...params].filter(([key])=>["from","to"].includes(key))).toString();
  const applied = useMemo(() => {
    const q = new URLSearchParams(query), from=q.get("from"), to=q.get("to");
    const days=(Date.parse(to)-Date.parse(from))/86400000;
    return /^\d{4}-\d{2}-\d{2}$/.test(from || "") && /^\d{4}-\d{2}-\d{2}$/.test(to || "") && days>=0 && days<93 ? {from,to} : getDefaultDashboardRange();
  }, [query]);
  const [range,setRange] = useState(applied);
  useEffect(() => setRange(applied), [applied]);
  const activityPage = Math.max(0, Number(params.get("page")) || 0);
  const setActivityPage = value => setParams(current => {const next=new URLSearchParams(current); next.set("page", typeof value === "function" ? value(activityPage) : value); return next;});
  const setApplied = next => setParams({from:next.from,to:next.to});
  const selectedMetric=params.get("metric"), selectedDay=params.get("day");
  const openEvidence = (key, value) => setParams(current => {const next=new URLSearchParams(current);next.delete("metric");next.delete("day");if(key)next.set(key,value);return next;});
  const sequence=useRef(0), controller=useRef(null);
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    controller.current?.abort();
    const nextController=new AbortController();controller.current=nextController;
    const id=++sequence.current;
    setIsLoading(true);
    setErrorMessage("");

    try {
      const next=await getDashboardSummary({...applied,activityPage},{signal:nextController.signal});
      if(id===sequence.current&&!nextController.signal.aborted)setDashboard({...next,loadedRange:applied});
    } catch (error) {
      if(id===sequence.current&&!nextController.signal.aborted)setErrorMessage(error.message || "대시보드 데이터를 불러오지 못했습니다.");
    } finally {
      if(id===sequence.current&&!nextController.signal.aborted)setIsLoading(false);
    }
  }, [applied,activityPage]);

  useEffect(() => {
    loadDashboard();
    const counter=sequence,request=controller;
    return()=>{counter.current++;request.current?.abort();};
  }, [loadDashboard]);

  const maximumTrendValue = useMemo(() => {
    if (!dashboard?.activityTrends?.length) {
      return 1;
    }

    return Math.max(1,
      ...dashboard.activityTrends.flatMap((item) => [
        item.stores,
        item.posts,
        item.reactions,
      ])
    );
  }, [dashboard]);

  const maximumRegionCount = useMemo(
    () => Math.max(...(dashboard?.regionDistribution || []).map((item) => item.count), 1),
    [dashboard]
  );

  if (isLoading && !dashboard) {
    return (
      <div className="admin-page">
        <AdminPageHeader
          eyebrow="PLATE OPERATIONS"
          title="대시보드"
          description="서비스 운영 현황을 불러오고 있습니다."
        />
        <div className="admin-skeleton-grid" aria-label="대시보드 로딩 중">
          {Array.from({ length: 6 }).map((_, index) => (
            <span key={index} className="admin-skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  if (errorMessage && !dashboard) {
    return (
      <div className="admin-page">
        <AdminPageHeader title="대시보드" />
        <section className="admin-error-panel" role="alert">
          <strong>대시보드를 표시할 수 없습니다.</strong>
          <p>{errorMessage}</p>
          <button type="button" className="admin-button admin-button--primary" onClick={loadDashboard}>
            다시 시도
          </button>
        </section>
      </div>
    );
  }

  const chooseDays = (days) => {
    const to = new Date(), from = new Date(to);
    from.setDate(to.getDate() - days + 1);
    const next = {from: formatLocalDate(from), to: formatLocalDate(to)};
    setRange(next); setApplied(next);
  };
  const shownRange=dashboard.loadedRange || applied;
  const period = new URLSearchParams(shownRange).toString();
  const metricLink = key => ({
    newStoreApplications: canAdmin(P.STORE_READ) ? `/admin/store-approvals?${new URLSearchParams({appliedFrom:shownRange.from,appliedTo:shownRange.to})}` : null,
    pendingApprovals: canAdmin(P.STORE_READ) ? "/admin/store-approvals?status=pending" : null,
    regionalPosts: canAdmin(P.FEED_READ) ? `/admin/feeds?${period}&located=1` : null,
    seasonalMenus: canAdmin(P.SEASONAL_READ) ? "/admin/seasonal-foods" : null,
  })[key];
  const evidence = dashboard.metrics.find(item => item.key === selectedMetric);
  const day = dashboard.activityTrends.find(item => item.date === selectedDay);
  const activityLink = activity => {
    if (activity.resourceType === "FEED" && activity.resourceId && canAdmin(P.FEED_READ)) return `/admin/feeds?feed=${encodeURIComponent(activity.resourceId)}`;
    return null;
  };
  const activeDays = applied.to === formatLocalDate(new Date()) ? Math.round((Date.parse(applied.to) - Date.parse(applied.from))/86400000) + 1 : null;
  return (
    <div className="admin-page dashboard-workspace">
      <AdminPageHeader
        eyebrow="PLATE OPERATIONS"
        title="대시보드"
        description="매장 승인, 콘텐츠 활동, 제철 메뉴 운영 현황을 한눈에 확인합니다."
        actions={
          <div className="admin-work-actions"><button className="admin-button admin-button--secondary" type="button" disabled={isLoading} onClick={loadDashboard}>새로고침</button>{canAdmin(P.STORE_READ)&&<Link className="admin-button admin-button--primary" to="/admin/store-approvals?status=pending">승인 대기 확인</Link>}</div>
        }
      />

      <div className="dashboard-periods" aria-label="대시보드 조회 기간">
        {[[1,"오늘"],[7,"최근 7일"],[30,"최근 30일"]].map(([days,label]) => <button type="button" key={days} aria-pressed={activeDays === days} disabled={isLoading} onClick={() => chooseDays(days)}>{label}</button>)}
        <details className="dashboard-custom-range"><summary>기간 직접 선택</summary>
      <form className="admin-work-filter admin-date-range" onSubmit={e=>{e.preventDefault();const days=(Date.parse(range.to)-Date.parse(range.from))/86400000;if(!Number.isFinite(days)||days<0||days>=93){setErrorMessage("조회 기간은 시작일부터 최대 93일로 설정해 주세요.");return;}setApplied({...range});}}>
        <label>시작일<input type="date" value={range.from} onChange={e=>setRange(r=>({...r,from:e.target.value}))} required/></label><label>종료일<input type="date" value={range.to} onChange={e=>setRange(r=>({...r,to:e.target.value}))} required/></label><button type="submit" disabled={isLoading}>기간 조회</button>
      </form>
        </details>
      </div>
      {errorMessage&&<p role="alert">{errorMessage} · 아래는 이전 조회 결과입니다.</p>}
      <p className="content-scope">{shownRange.from} ~ {shownRange.to} · 변경된 매장은 해당 기간에 갱신된 매장 수입니다.</p>
      <section className="admin-kpi-grid" aria-label="핵심 운영 지표">
        {dashboard.metrics.map(({ key, ...metric }) => (
          <KpiCard key={key} {...metric} to={metricLink(key)} onClick={metricLink(key) ? undefined : () => openEvidence("metric", key)} actionLabel={metricLink(key) ? key === "seasonalMenus" ? "음식 목록 확인" : "해당 목록 보기" : "집계 근거 보기"} />
        ))}
      </section>

      <nav className="dashboard-shortcuts" aria-label="관련 업무 바로가기">
        {canAdmin(P.MEMBER_MONITORING_READ) && <Link to="/admin/member-monitoring">회원 확인</Link>}
        {canAdmin(P.FEED_READ) && <Link to="/admin/feeds">게시물 검토</Link>}
        {canAdmin(P.QNA_MANAGE) && <Link to="/admin/qna">문의 답변</Link>}
        {canAdmin(P.SEASONAL_READ) && <Link to="/admin/seasonal-foods">제철 음식 관리</Link>}
      </nav>
      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <span>조회 기간</span>
              <h2>기간별 활동 추이</h2>
            </div>
            <div className="admin-chart-legend" aria-label="차트 범례">
              <span className="admin-chart-legend__stores">변경된 매장</span>
              <span className="admin-chart-legend__posts">게시물</span>
              <span className="admin-chart-legend__reactions">사용자 반응</span>
            </div>
          </div>
          {!dashboard.activityTrends.length && <p className="dashboard-empty">선택한 기간의 활동 기록이 없습니다.</p>}
          <div className="admin-trend-chart" role="region" aria-label="날짜별 활동 그래프 · 좌우로 이동" tabIndex={0}>
            {dashboard.activityTrends.map((item) => (
              <button type="button" className="admin-trend-chart__column" key={item.date || item.label} aria-label={`${item.date || item.label} 변경된 매장 ${item.stores}건, 게시물 ${item.posts}건, 사용자 반응 ${item.reactions}건 상세`} onClick={() => openEvidence("day", item.date || item.label)}>
                <div className="admin-trend-chart__bars">
                  <span
                    className="admin-trend-chart__bar admin-trend-chart__bar--stores"
                    style={{ height: `${(item.stores / maximumTrendValue) * 100}%`, minHeight: item.stores > 0 ? 4 : 0 }}
                    title={`변경된 매장 ${item.stores}`}
                  />
                  <span
                    className="admin-trend-chart__bar admin-trend-chart__bar--posts"
                    style={{ height: `${(item.posts / maximumTrendValue) * 100}%`, minHeight: item.posts > 0 ? 4 : 0 }}
                    title={`게시물 ${item.posts}`}
                  />
                  <span
                    className="admin-trend-chart__bar admin-trend-chart__bar--reactions"
                    style={{ height: `${(item.reactions / maximumTrendValue) * 100}%`, minHeight: item.reactions > 0 ? 4 : 0 }}
                    title={`사용자 반응 ${item.reactions}`}
                  />
                </div>
                <span>{item.date ? item.date.slice(5).replace("-", "/") : item.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <span>조회 기간</span>
              <h2>지역별 게시물</h2>
            </div>
          </div>
          {!dashboard.regionDistribution.length && <p className="dashboard-empty">선택한 기간의 지역별 게시물이 없습니다.</p>}
          <div className="admin-region-bars">
            {dashboard.regionDistribution.map((item) => (
              <div className="admin-region-bars__item" key={item.region}>
                <div>
                  <strong>{canAdmin(P.FEED_READ) ? <Link to={`/admin/feeds?${period}&region=${encodeURIComponent(item.region)}`}>{item.region} · 목록 보기 →</Link> : item.region}</strong>
                  <span>{item.count.toLocaleString()}건</span>
                </div>
                <span className="admin-region-bars__track">
                  <span
                    style={{ width: `${(item.count / maximumRegionCount) * 100}%` }}
                  />
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="admin-panel">
        <div className="admin-panel__header">
          <div>
            <span>실시간 운영 기록</span>
            <h2>최근 활동</h2>
          </div>
          <div className="admin-work-actions"><button type="button" disabled={isLoading||activityPage===0} onClick={()=>setActivityPage(n=>n-1)}>이전 활동</button><span>{activityPage+1}페이지</span><button type="button" disabled={isLoading||!dashboard.activitiesHasNext} onClick={()=>setActivityPage(n=>n+1)}>다음 활동</button></div>
        </div>
        {!dashboard.recentActivities.length && <p className="dashboard-empty">표시할 최근 활동이 없습니다.</p>}
        <div className="admin-table-scroll admin-recent-activity-table">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>대상</th>
                <th>활동 내용</th>
                <th>담당자</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.recentActivities.map((activity) => (
                <tr key={activity.id}>
                  <td>{formatTime(activity.occurredAt)}</td>
                  <td><strong>{activityLink(activity) ? <Link to={activityLink(activity)}>{activity.storeName} →</Link> : activity.storeName}</strong></td>
                  <td>{activity.action}</td>
                  <td>{activity.operator}</td>
                  <td>
                    <StatusBadge
                      status={activity.status}
                      label={
                        STORE_APPROVAL_STATUS_LABELS[activity.status] ||
                        toActivityStatusLabel(activity.status)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div
          className="admin-mobile-card-list admin-mobile-activity-list"
          aria-label="모바일 최근 활동 목록"
        >
          {dashboard.recentActivities.map((activity) => (
            <article className="admin-mobile-activity-card" key={activity.id}>
              <div>
                <span>{formatTime(activity.occurredAt)}</span>
                <StatusBadge
                  status={activity.status}
                  label={
                    STORE_APPROVAL_STATUS_LABELS[activity.status] ||
                    toActivityStatusLabel(activity.status)
                  }
                />
              </div>
              <strong>{activityLink(activity) ? <Link to={activityLink(activity)}>{activity.storeName} →</Link> : activity.storeName}</strong>
              <p>{activity.action}</p>
              <small>담당자 {activity.operator}</small>
            </article>
          ))}
        </div>
      </section>
      <DetailDrawer isOpen={Boolean(evidence || day)} title={day ? `${selectedDay} 활동` : evidence?.label || "집계 근거"} onClose={() => openEvidence(null)}>
        {day ? <><p>{selectedDay} · 한국 시간 기준</p><dl className="metric-evidence"><dt>변경된 매장</dt><dd>{day.stores.toLocaleString()}건</dd><dt>사진 게시물</dt><dd>{day.posts.toLocaleString()}건</dd><dt>사용자 반응</dt><dd>{day.reactions.toLocaleString()}건</dd></dl>
          {canAdmin(P.FEED_READ) && <Link className="admin-button" to={`/admin/feeds?from=${selectedDay}&to=${selectedDay}`}>이 날짜 사진 게시물 보기 →</Link>}
          <p className="content-scope">매장은 현재 수정일, 사진은 등록일 기준입니다. 사용자 반응은 사진·영상의 좋아요와 댓글 기록을 합산합니다. 반응별 원본 목록은 제공되지 않습니다.</p>
          {canAdmin(P.STORE_READ) && <Link to="/admin/stores">매장 관리 열기 · 전체 기간 →</Link>}
        </> : evidence && <><p>{shownRange.from} ~ {shownRange.to}</p><p className="metric-evidence-value">{evidence.value === null ? "확인 불가" : typeof evidence.value === "number" ? evidence.value.toLocaleString() : evidence.value}</p>
          {selectedMetric === "activeStores" ? <><p>현재 수정일이 조회 기간에 포함된 매장 수입니다. 일자별 막대를 선택하면 같은 기준의 날짜별 수를 확인할 수 있어요.</p><div className="metric-day-list">{dashboard.activityTrends.map(row => <button type="button" key={row.date} onClick={() => openEvidence("day", row.date)}>{row.date}<strong>{row.stores}건 →</strong></button>)}</div>{canAdmin(P.STORE_READ) && <Link to="/admin/stores">매장 관리 열기 · 전체 기간 →</Link>}</> : selectedMetric === "userReports" ? <><p>조회 기간에 접수된 모든 대상의 신고 기록 수입니다. 같은 대상에 여러 번 접수된 신고도 각각 포함합니다.</p><p>아래 사진 신고 목록은 전체 기간의 사진만 조회하므로 이 합계와 범위가 다릅니다.</p>{canAdmin(P.FEED_READ) && <Link to="/admin/feeds?reported=1">사진 신고 검토 · 전체 기간 →</Link>}</> : <p>이 지표의 원본 목록을 확인할 메뉴 권한이 필요합니다.</p>}
        </>}
      </DetailDrawer>
    </div>
  );
}

function formatTime(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function toActivityStatusLabel(status) {
  switch (status) {
    case "reported":
      return "신고 접수";
    case "active":
      return "활성";
    case "recorded":
      return "기록";
    default:
      return status;
  }
}

export default AdminDashboard;
