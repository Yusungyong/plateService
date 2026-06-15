import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../api/adminDashboardApi";
import AdminPageHeader from "../components/AdminPageHeader";
import KpiCard from "../components/KpiCard";
import StatusBadge from "../components/StatusBadge";
import { STORE_APPROVAL_STATUS_LABELS } from "../constants/adminStatuses";

function AdminDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      setDashboard(await getDashboardSummary());
    } catch (error) {
      setErrorMessage(error.message || "대시보드 데이터를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const maximumTrendValue = useMemo(() => {
    if (!dashboard?.activityTrends?.length) {
      return 1;
    }

    return Math.max(
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

  if (isLoading) {
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

  if (errorMessage) {
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

  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow="PLATE OPERATIONS"
        title="대시보드"
        description="매장 승인, 콘텐츠 활동, 제철 메뉴 운영 현황을 한눈에 확인합니다."
        actions={
          <Link className="admin-button admin-button--primary" to="/admin/store-approvals">
            승인 대기 확인
          </Link>
        }
      />

      <section className="admin-kpi-grid" aria-label="핵심 운영 지표">
        {dashboard.metrics.map(({ key, ...metric }) => (
          <KpiCard key={key} {...metric} />
        ))}
      </section>

      <div className="admin-dashboard-grid">
        <section className="admin-panel admin-panel--wide">
          <div className="admin-panel__header">
            <div>
              <span>최근 7일</span>
              <h2>주간 활성 추이</h2>
            </div>
            <div className="admin-chart-legend" aria-label="차트 범례">
              <span className="admin-chart-legend__stores">활성 매장</span>
              <span className="admin-chart-legend__posts">게시물</span>
              <span className="admin-chart-legend__reactions">사용자 반응</span>
            </div>
          </div>
          <div className="admin-trend-chart">
            {dashboard.activityTrends.map((item) => (
              <div className="admin-trend-chart__column" key={item.label}>
                <div className="admin-trend-chart__bars">
                  <span
                    className="admin-trend-chart__bar admin-trend-chart__bar--stores"
                    style={{ height: `${(item.stores / maximumTrendValue) * 100}%` }}
                    title={`활성 매장 ${item.stores}`}
                  />
                  <span
                    className="admin-trend-chart__bar admin-trend-chart__bar--posts"
                    style={{ height: `${(item.posts / maximumTrendValue) * 100}%` }}
                    title={`게시물 ${item.posts}`}
                  />
                  <span
                    className="admin-trend-chart__bar admin-trend-chart__bar--reactions"
                    style={{ height: `${(item.reactions / maximumTrendValue) * 100}%` }}
                    title={`사용자 반응 ${item.reactions}`}
                  />
                </div>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel__header">
            <div>
              <span>이번 주</span>
              <h2>지역별 게시물</h2>
            </div>
          </div>
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
          <button type="button" className="admin-button admin-button--secondary">
            전체 활동 보기
          </button>
        </div>
        <div className="admin-table-scroll admin-recent-activity-table">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>매장명</th>
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
