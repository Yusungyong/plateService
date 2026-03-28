import React, { useEffect, useMemo, useState } from "react";
import PageLayout from "../components/PageLayout";
import {
  fetchMemberMonitoringLoginRisks,
  fetchMemberMonitoringProfileChanges,
  fetchMemberMonitoringRiskUsers,
  fetchMemberMonitoringSummary,
} from "../api/memberMonitoringApi";

function unwrapPayload(response) {
  if (response && typeof response === "object" && "data" in response && response.data) {
    return response.data;
  }

  return response;
}

function normalizeItemsResponse(response) {
  const payload = unwrapPayload(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.items)) {
    return payload.items;
  }

  if (Array.isArray(payload?.content)) {
    return payload.content;
  }

  return [];
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? numeric.toLocaleString("ko-KR") : "-";
}

function formatPercent(value) {
  const numeric = Number(value || 0);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString("ko-KR")}%` : "-";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function buildKpiCards(summary) {
  return [
    {
      label: "전체 회원 수",
      value: formatNumber(summary.totalUsers),
      note: "회원 마스터 기준 누적 회원 수",
    },
    {
      label: "오늘 신규 가입",
      value: formatNumber(summary.newUsersToday),
      note: "당일 생성된 회원 계정 수",
    },
    {
      label: "7일 활성 회원",
      value: formatNumber(summary.activeUsers7d),
      note: "최근 7일 로그인 성공한 회원 수",
    },
    {
      label: "오늘 로그인 실패율",
      value: formatPercent(summary.loginFailureRateToday),
      note: "오늘 로그인 시도 대비 실패 비율",
    },
    {
      label: "권한 변경 대기",
      value: formatNumber(summary.pendingRoleChanges),
      note: "운영 확인이 필요한 변경 건수",
    },
    {
      label: "위험 회원",
      value: formatNumber(summary.riskUsers24h),
      note: "최근 24시간 이상 징후 계정 수",
    },
  ];
}

function MemberMonitoring() {
  const [summary, setSummary] = useState({});
  const [loginRisks, setLoginRisks] = useState([]);
  const [profileChanges, setProfileChanges] = useState([]);
  const [riskUsers, setRiskUsers] = useState([]);
  const [profileChangesPage, setProfileChangesPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const profileChangesPageSize = 5;

  useEffect(() => {
    let isMounted = true;

    async function loadMonitoring() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [summaryResponse, loginRisksResponse, profileChangesResponse, riskUsersResponse] =
          await Promise.all([
            fetchMemberMonitoringSummary(),
            fetchMemberMonitoringLoginRisks(),
            fetchMemberMonitoringProfileChanges(),
            fetchMemberMonitoringRiskUsers(),
          ]);

        if (!isMounted) {
          return;
        }

        setSummary(unwrapPayload(summaryResponse) || {});
        setLoginRisks(normalizeItemsResponse(loginRisksResponse));
        setProfileChanges(normalizeItemsResponse(profileChangesResponse));
        setRiskUsers(normalizeItemsResponse(riskUsersResponse));
        setProfileChangesPage(1);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setErrorMessage(error.message || "회원 모니터링 데이터를 불러오지 못했습니다.");
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadMonitoring();

    return () => {
      isMounted = false;
    };
  }, []);

  const kpiCards = useMemo(() => buildKpiCards(summary), [summary]);
  const totalProfileChangesPages = Math.max(
    1,
    Math.ceil(profileChanges.length / profileChangesPageSize)
  );
  const pagedProfileChanges = useMemo(() => {
    const startIndex = (profileChangesPage - 1) * profileChangesPageSize;
    return profileChanges.slice(startIndex, startIndex + profileChangesPageSize);
  }, [profileChanges, profileChangesPage]);

  return (
    <PageLayout
      title="회원 모니터링"
      description="가입, 로그인, 권한 변경, 신고·차단 위험 신호를 한 화면에서 확인하는 운영자용 대시보드입니다."
    >
      <div className="stack-layout">
        {errorMessage ? <div className="api-status api-status--error">{errorMessage}</div> : null}

        <section className="metric-grid" aria-label="회원 핵심 지표">
          {kpiCards.map((card) => (
            <article key={card.label} className="metric-card">
              <span className="metric-card__label">{card.label}</span>
              <strong className="metric-card__value">{isLoading ? "..." : card.value}</strong>
              <p className="metric-card__note">{card.note}</p>
            </article>
          ))}
        </section>

        <div className="monitoring-layout">
          <section className="support-panel">
            <div className="support-panel__header">
              <span className="support-kicker">로그인 이상 징후</span>
              <h3>즉시 확인이 필요한 계정</h3>
            </div>

            <div className="monitoring-table" role="table" aria-label="로그인 이상 징후 목록">
              <div className="monitoring-table__head" role="row">
                <span>계정</span>
                <span>이상 항목</span>
                <span>상세</span>
                <span>상태</span>
              </div>

              <div className="monitoring-table__body">
                {isLoading ? (
                  <div className="board-empty">회원 모니터링 데이터를 불러오는 중입니다.</div>
                ) : loginRisks.length === 0 ? (
                  <div className="board-empty">현재 확인된 로그인 이상 징후가 없습니다.</div>
                ) : (
                  loginRisks.map((item) => (
                    <div
                      key={`${item.username}-${item.riskType || item.riskLabel || item.lastOccurredAt || ""}`}
                      className="monitoring-table__row"
                      role="row"
                    >
                      <strong>{item.username || "-"}</strong>
                      <span>{item.riskLabel || item.issue || item.riskType || "-"}</span>
                      <span>
                        {item.detail ||
                          [item.ipAddress, item.deviceId].filter(Boolean).join(" / ") ||
                          "-"}
                      </span>
                      <span className="status-pill status-pill--review">
                        {item.state || item.score || "확인 필요"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <aside className="support-panel">
            <div className="support-panel__header">
              <span className="support-kicker">운영 체크포인트</span>
              <h3>우선 확인 순서</h3>
            </div>

            <ol className="monitoring-checklist">
              <li>로그인 실패 급증 계정과 동일 IP 다계정 로그인 여부를 먼저 확인합니다.</li>
              <li>권한 변경 이력은 실제 운영 요청과 일치하는지 actor 정보와 함께 대조합니다.</li>
              <li>신고와 차단이 동시에 증가한 계정은 콘텐츠 활동 내역까지 함께 검토합니다.</li>
            </ol>
          </aside>
        </div>

        <div className="monitoring-layout">
          <section className="support-panel">
            <div className="support-panel__header">
              <span className="support-kicker">최근 변경 이력</span>
              <h3>권한 및 회원 상태 변경</h3>
            </div>

            <div className="monitoring-list">
              {isLoading ? (
                <div className="board-empty">변경 이력을 불러오는 중입니다.</div>
              ) : profileChanges.length === 0 ? (
                <div className="board-empty">최근 변경 이력이 없습니다.</div>
              ) : (
                <>
                  {pagedProfileChanges.map((item) => (
                    <article
                      key={`${item.historyId || item.username}-${item.createdAt || item.at || ""}`}
                      className="monitoring-list__item"
                    >
                      <div>
                        <strong>{item.username || "-"}</strong>
                        <p>{item.changedField || item.changeType || item.change || "-"}</p>
                      </div>
                      <div className="monitoring-list__meta">
                        <span>{item.actor || item.actorUsername || item.actorName || "system"}</span>
                        <span>{formatDateTime(item.createdAt || item.at)}</span>
                      </div>
                    </article>
                  ))}

                  <div className="monitoring-pagination" aria-label="최근 변경 이력 페이지 이동">
                    <button
                      type="button"
                      onClick={() =>
                        setProfileChangesPage((current) => Math.max(1, current - 1))
                      }
                      disabled={profileChangesPage === 1}
                    >
                      이전
                    </button>
                    <span>
                      {profileChangesPage} / {totalProfileChangesPages}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setProfileChangesPage((current) =>
                          Math.min(totalProfileChangesPages, current + 1)
                        )
                      }
                      disabled={profileChangesPage === totalProfileChangesPages}
                    >
                      다음
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="support-panel">
            <div className="support-panel__header">
              <span className="support-kicker">위험 계정</span>
              <h3>신고·차단 집중 사용자</h3>
            </div>

            <div className="monitoring-list">
              {isLoading ? (
                <div className="board-empty">위험 계정 목록을 불러오는 중입니다.</div>
              ) : riskUsers.length === 0 ? (
                <div className="board-empty">현재 표시할 위험 계정이 없습니다.</div>
              ) : (
                riskUsers.map((item) => (
                  <article key={item.username} className="monitoring-list__item">
                    <div>
                      <strong>{item.username || "-"}</strong>
                      <p>
                        신고 {formatNumber(item.reportCount)}건 / 차단 {formatNumber(item.blockedCount)}
                        건
                        {item.recentActivityLabel ? ` / ${item.recentActivityLabel}` : ""}
                      </p>
                    </div>
                    <div className="monitoring-list__meta monitoring-list__meta--action">
                      <span>{item.recommendedAction || "운영 검토 필요"}</span>
                      <span>{item.score ? `점수 ${item.score}` : ""}</span>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}

export default MemberMonitoring;
