import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_PERMISSIONS as P } from "../constants/adminPermissions";
import { formatLocalDate, getDefaultDashboardRange } from "../api/adminApiUtils";
import { getDashboardSummary } from "../api/adminDashboardApi";
import AdminPageHeader from "../components/AdminPageHeader";
import KpiCard from "../components/KpiCard";
import StatusBadge from "../components/StatusBadge";
import "../styles/content-workspace.css";
import { STORE_APPROVAL_STATUS_LABELS } from "../constants/adminStatuses";

function AdminDashboard() {
  const {canAdmin} = useAuth();
  const [range,setRange] = useState(getDefaultDashboardRange);
  const [applied,setApplied] = useState(getDefaultDashboardRange);
  const [activityPage,setActivityPage] = useState(0);
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
      if(id===sequence.current&&!nextController.signal.aborted)setDashboard(next);
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
    setRange(next); setApplied(next); setActivityPage(0);
  };
  const activeDays = applied.to === formatLocalDate(new Date()) ? Math.round((Date.parse(applied.to) - Date.parse(applied.from))/86400000) + 1 : null;
  return (
    <div className="admin-page dashboard-workspace">
      <AdminPageHeader
        eyebrow="PLATE OPERATIONS"
        title="대시보드"
        description="매장 승인, 콘텐츠 활동, 제철 메뉴 운영 현황을 한눈에 확인합니다."
        actions={
          <div className="admin-work-actions"><button className="admin-button admin-button--secondary" type="button" disabled={isLoading} onClick={loadDashboard}>새로고침</button>{canAdmin(P.STORE_READ)&&<Link className="admin-button admin-button--primary" to="/admin/store-approvals">승인 대기 확인</Link>}</div>
        }
      />

      <div className="dashboard-periods" aria-label="대시보드 조회 기간">
        {[[1,"오늘"],[7,"최근 7일"],[30,"최근 30일"]].map(([days,label]) => <button type="button" key={days} aria-pressed={activeDays === days} disabled={isLoading} onClick={() => chooseDays(days)}>{label}</button>)}
        <details className="dashboard-custom-range"><summary>기간 직접 선택</summary>
      <form className="admin-work-filter admin-date-range" onSubmit={e=>{e.preventDefault();const days=(Date.parse(range.to)-Date.parse(range.from))/86400000;if(!Number.isFinite(days)||days<0||days>=93){setErrorMessage("조회 기간은 시작일부터 최대 93일로 설정해 주세요.");return;}setActivityPage(0);setApplied({...range});}}>
        <label>시작일<input type="date" value={range.from} onChange={e=>setRange(r=>({...r,from:e.target.value}))} required/></label><label>종료일<input type="date" value={range.to} onChange={e=>setRange(r=>({...r,to:e.target.value}))} required/></label><button type="submit" disabled={isLoading}>기간 조회</button>
      </form>
        </details>
      </div>
      {errorMessage&&<p role="alert">{errorMessage} · 아래는 이전 조회 결과입니다.</p>}
      <p className="content-scope">{applied.from} ~ {applied.to} · 변경된 매장은 해당 기간에 갱신된 매장 수입니다.</p>
      <section className="admin-kpi-grid" aria-label="핵심 운영 지표">
        {dashboard.metrics.map(({ key, ...metric }) => (
          <KpiCard key={key} {...metric} />
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
              <div className="admin-trend-chart__column" key={item.date || item.label}>
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
              </div>
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
                  <strong>{item.region}</strong>
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
                  <td><strong>{activity.storeName}</strong></td>
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
              <strong>{activity.storeName}</strong>
              <p>{activity.action}</p>
              <small>담당자 {activity.operator}</small>
            </article>
          ))}
        </div>
      </section>
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
