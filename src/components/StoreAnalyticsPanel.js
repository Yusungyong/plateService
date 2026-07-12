import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchStoreAnalyticsContents,
  fetchStoreAnalyticsSummary,
  fetchStoreAnalyticsTrends,
} from "../api/storeAnalyticsApi";

const quickRanges = [
  { label: "7일", value: 7 },
  { label: "30일", value: 30 },
  { label: "90일", value: 90 },
];

const metricLabels = {
  homeImpressions: "홈 노출",
  videoViews: "영상 조회",
  uniqueViewers: "순 시청자",
  activeSaves: "저장 중",
  newSaves: "신규 저장",
  comments: "댓글",
};

const metricOrder = [
  "homeImpressions",
  "videoViews",
  "uniqueViewers",
  "activeSaves",
  "newSaves",
  "comments",
];

const initialContentsPage = {
  content: [],
  page: 0,
  size: 20,
  totalElements: 0,
  totalPages: 0,
  hasNext: false,
  source: null,
};

function StoreAnalyticsPanel({ storeId, storeName }) {
  const [selectedRange, setSelectedRange] = useState("7");
  const [draftRange, setDraftRange] = useState(() => getDateRange(7));
  const [appliedRange, setAppliedRange] = useState(() => getDateRange(7));
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [contentsPage, setContentsPage] = useState(initialContentsPage);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [rangeError, setRangeError] = useState("");

  const source = summary?.source || trends?.source || contentsPage.source || {};
  const hasLinkedVideoContent = source.hasLinkedVideoContent !== false;
  const metrics = useMemo(() => normalizeMetrics(summary?.metrics || []), [summary]);
  const trendPoints = Array.isArray(trends?.points) ? trends.points : [];
  const maxTrendValue = Math.max(
    1,
    ...trendPoints.flatMap((point) => [
      Number(point.impressions || 0),
      Number(point.views || 0),
      Number(point.completedViews || 0),
    ])
  );

  const loadAnalytics = useCallback(async () => {
    if (!storeId) {
      return;
    }

    setIsLoading(true);
    setLoadError("");
    setSummary(null);
    setTrends(null);
    setContentsPage(initialContentsPage);

    try {
      const [nextSummary, nextTrends, nextContents] = await Promise.all([
        fetchStoreAnalyticsSummary(storeId, appliedRange),
        fetchStoreAnalyticsTrends(storeId, appliedRange),
        fetchStoreAnalyticsContents(storeId, {
          ...appliedRange,
          page: 0,
          size: initialContentsPage.size,
        }),
      ]);

      setSummary(nextSummary || null);
      setTrends(nextTrends || null);
      setContentsPage(normalizeContentsPage(nextContents));
    } catch (error) {
      setLoadError(error.message || "매장 성과를 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [appliedRange, storeId]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  function handleQuickRange(days) {
    const nextRange = getDateRange(days);
    setSelectedRange(String(days));
    setDraftRange(nextRange);
    setAppliedRange(nextRange);
    setRangeError("");
  }

  function updateDraftRange(field, value) {
    setDraftRange((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applyCustomRange(event) {
    event.preventDefault();

    if (!isDateString(draftRange.from) || !isDateString(draftRange.to)) {
      setRangeError("조회 시작일과 종료일을 모두 선택해 주세요.");
      return;
    }

    if (draftRange.from > draftRange.to) {
      setRangeError("조회 시작일은 종료일보다 늦을 수 없습니다.");
      return;
    }

    if (getInclusiveDayCount(draftRange.from, draftRange.to) > 93) {
      setRangeError("성과 조회 기간은 최대 93일까지 선택할 수 있습니다.");
      return;
    }

    setSelectedRange("custom");
    setAppliedRange(draftRange);
    setRangeError("");
  }

  async function loadMoreContents() {
    setIsLoadingMore(true);
    setLoadError("");

    try {
      const nextPage = await fetchStoreAnalyticsContents(storeId, {
        ...appliedRange,
        page: contentsPage.page + 1,
        size: contentsPage.size,
      });
      const normalizedNextPage = normalizeContentsPage(nextPage);

      setContentsPage((current) => ({
        ...normalizedNextPage,
        content: mergeContents(current.content, normalizedNextPage.content),
      }));
    } catch (error) {
      setLoadError(error.message || "콘텐츠 성과를 더 불러오지 못했습니다.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <div className="stack-layout store-analytics">
      <section className="support-panel store-analytics-toolbar">
        <div className="support-panel__header restaurant-menu-header">
          <div>
            <span className="support-kicker">성과</span>
            <h3>{storeName ? `${storeName} 성과` : "내 매장 성과"}</h3>
          </div>
          <span className="store-analytics-toolbar__range">
            {formatDateLabel(appliedRange.from)} - {formatDateLabel(appliedRange.to)}
          </span>
        </div>

        <div className="store-analytics-controls">
          <div className="store-analytics-periods" role="group" aria-label="성과 조회 기간">
            {quickRanges.map((range) => (
              <button
                key={range.value}
                type="button"
                className={selectedRange === String(range.value) ? "is-active" : ""}
                onClick={() => handleQuickRange(range.value)}
              >
                {range.label}
              </button>
            ))}
          </div>

          <form className="store-analytics-date-form" onSubmit={applyCustomRange}>
            <label>
              <span>시작일</span>
              <input
                type="date"
                value={draftRange.from}
                onChange={(event) => updateDraftRange("from", event.target.value)}
              />
            </label>
            <label>
              <span>종료일</span>
              <input
                type="date"
                value={draftRange.to}
                onChange={(event) => updateDraftRange("to", event.target.value)}
              />
            </label>
            <button type="submit">기간 적용</button>
          </form>
        </div>

        {rangeError ? (
          <div className="api-status api-status--error" role="alert">
            {rangeError}
          </div>
        ) : null}
      </section>

      {loadError ? (
        <div className="api-status api-status--error" role="alert">
          <span>{loadError}</span>
          <button type="button" onClick={loadAnalytics} disabled={isLoading}>
            다시 시도
          </button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="board-empty">매장 성과를 불러오는 중입니다.</div>
      ) : !hasLinkedVideoContent ? (
        <section className="support-panel store-analytics-empty">
          <span className="support-kicker">집계 대기</span>
          <h3>아직 집계할 콘텐츠가 없습니다.</h3>
          <p>매장 소개 영상이나 피드를 등록하면 노출, 시청, 저장 데이터를 확인할 수 있습니다.</p>
        </section>
      ) : (
        <>
          <section className="store-analytics-metric-grid" aria-label="매장 핵심 성과">
            {metrics.map((metric) => (
              <MetricCard key={metric.key} metric={metric} />
            ))}
          </section>

          <div className="store-analytics-split">
            <WatchQualityCard watch={summary?.watch} />
            <FunnelCard funnel={summary?.funnel} />
          </div>

          <section className="support-panel store-analytics-panel">
            <div className="support-panel__header">
              <span className="support-kicker">추이</span>
              <h3>일자별 노출과 조회</h3>
            </div>
            {trendPoints.length === 0 ? (
              <div className="board-empty">조회 기간에 표시할 추이 데이터가 없습니다.</div>
            ) : (
              <div className="store-analytics-trends" aria-label="일자별 성과 추이">
                {trendPoints.map((point) => (
                  <TrendPoint key={point.date} point={point} maxValue={maxTrendValue} />
                ))}
              </div>
            )}
          </section>

          <section className="support-panel store-analytics-panel">
            <div className="support-panel__header restaurant-menu-header">
              <div>
                <span className="support-kicker">콘텐츠</span>
                <h3>콘텐츠별 성과</h3>
              </div>
              <span className="store-analytics-toolbar__range">
                총 {Number(contentsPage.totalElements || 0).toLocaleString()}개
              </span>
            </div>
            <AnalyticsContentsTable contents={contentsPage.content} />
            {contentsPage.hasNext ? (
              <div className="list-more-actions">
                <button type="button" onClick={loadMoreContents} disabled={isLoadingMore}>
                  {isLoadingMore ? "불러오는 중..." : "콘텐츠 더 보기"}
                </button>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ metric }) {
  return (
    <article className="metric-card store-analytics-metric-card">
      <span className="metric-card__label">{metric.label}</span>
      <strong className="metric-card__value">{formatMetricValue(metric.value, metric.unit)}</strong>
      <p className={getChangeClassName(metric.changeRate)}>
        {formatChangeRate(metric.changeRate)}
      </p>
    </article>
  );
}

function WatchQualityCard({ watch = {} }) {
  const items = [
    { label: "총 조회", value: formatNumber(watch.totalViews) },
    { label: "순 시청자", value: formatNumber(watch.uniqueViewers) },
    { label: "완주 조회", value: formatNumber(watch.completedViews) },
    { label: "평균 시청", value: formatSeconds(watch.averageWatchSeconds) },
    { label: "완주율", value: formatPercent(watch.completionRate) },
  ];

  return (
    <section className="support-panel store-analytics-panel">
      <div className="support-panel__header">
        <span className="support-kicker">시청 품질</span>
        <h3>조회 이후 반응</h3>
      </div>
      <dl className="store-analytics-definition-grid">
        {items.map((item) => (
          <div key={item.label}>
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function FunnelCard({ funnel = {} }) {
  const maxValue = Math.max(
    1,
    Number(funnel.impressions || 0),
    Number(funnel.clicks || 0),
    Number(funnel.plays || 0),
    Number(funnel.completes || 0)
  );
  const steps = [
    { label: "노출", value: funnel.impressions },
    { label: "클릭", value: funnel.clicks, rate: funnel.clickThroughRate },
    { label: "재생", value: funnel.plays, rate: funnel.playRate },
    { label: "완주", value: funnel.completes, rate: funnel.completeRate },
  ];

  return (
    <section className="support-panel store-analytics-panel">
      <div className="support-panel__header">
        <span className="support-kicker">추천 퍼널</span>
        <h3>노출에서 완주까지</h3>
      </div>
      <div className="store-analytics-funnel">
        {steps.map((step) => (
          <div key={step.label} className="store-analytics-funnel__row">
            <div>
              <strong>{step.label}</strong>
              <span>{formatNumber(step.value)}</span>
            </div>
            <div className="store-analytics-funnel__track">
              <span style={{ width: `${getBarWidth(step.value, maxValue)}%` }} />
            </div>
            <small>{step.rate == null ? "-" : formatPercent(step.rate)}</small>
          </div>
        ))}
      </div>
      <dl className="store-analytics-mini-stats">
        <div>
          <dt>숨김</dt>
          <dd>{formatNumber(funnel.hides)}</dd>
        </div>
        <div>
          <dt>신고</dt>
          <dd>{formatNumber(funnel.reports)}</dd>
        </div>
      </dl>
    </section>
  );
}

function TrendPoint({ point, maxValue }) {
  return (
    <div className="store-analytics-trend-point">
      <span className="store-analytics-trend-point__date">{formatTrendDate(point.date)}</span>
      <div className="store-analytics-trend-point__bars">
        <span
          className="store-analytics-trend-point__bar store-analytics-trend-point__bar--impressions"
          style={{ width: `${getBarWidth(point.impressions, maxValue)}%` }}
          title={`노출 ${formatNumber(point.impressions)}`}
        />
        <span
          className="store-analytics-trend-point__bar store-analytics-trend-point__bar--views"
          style={{ width: `${getBarWidth(point.views, maxValue)}%` }}
          title={`조회 ${formatNumber(point.views)}`}
        />
        <span
          className="store-analytics-trend-point__bar store-analytics-trend-point__bar--completed"
          style={{ width: `${getBarWidth(point.completedViews, maxValue)}%` }}
          title={`완주 ${formatNumber(point.completedViews)}`}
        />
      </div>
      <div className="store-analytics-trend-point__values">
        <span>노출 {formatNumber(point.impressions)}</span>
        <span>조회 {formatNumber(point.views)}</span>
      </div>
    </div>
  );
}

function AnalyticsContentsTable({ contents }) {
  if (!contents.length) {
    return <div className="board-empty">조회 기간에 표시할 콘텐츠 성과가 없습니다.</div>;
  }

  return (
    <div className="store-analytics-content-table" role="table" aria-label="콘텐츠별 성과">
      <div className="store-analytics-content-table__head" role="row">
        <span role="columnheader">콘텐츠</span>
        <span role="columnheader">노출</span>
        <span role="columnheader">조회</span>
        <span role="columnheader">완주율</span>
        <span role="columnheader">평균 시청</span>
        <span role="columnheader">저장</span>
        <span role="columnheader">댓글</span>
      </div>
      <div className="store-analytics-content-table__body">
        {contents.map((content) => (
          <article
            key={content.videoStoreId || `${content.title}-${content.createdAt}`}
            className="store-analytics-content-row"
            role="row"
          >
            <div className="store-analytics-content-row__title" role="cell" data-label="콘텐츠">
              {content.thumbnailUrl ? (
                <img src={content.thumbnailUrl} alt="" loading="lazy" />
              ) : (
                <span className="store-analytics-content-row__thumbnail" aria-label="썸네일 없음" />
              )}
              <div>
                <strong>{content.title || "제목 없는 콘텐츠"}</strong>
                <p>{formatDateLabel(content.createdAt)}</p>
              </div>
            </div>
            <span role="cell" data-label="노출">{formatNumber(content.impressions)}</span>
            <span role="cell" data-label="조회">{formatNumber(content.views)}</span>
            <span role="cell" data-label="완주율">{formatPercent(content.completionRate)}</span>
            <span role="cell" data-label="평균 시청">{formatSeconds(content.averageWatchSeconds)}</span>
            <span role="cell" data-label="저장">{formatNumber(content.activeSaveCount)}</span>
            <span role="cell" data-label="댓글">{formatNumber(content.commentCount)}</span>
          </article>
        ))}
      </div>
    </div>
  );
}

function normalizeMetrics(metrics) {
  const byKey = new Map(metrics.map((metric) => [metric.key, metric]));

  return metricOrder
    .map((key) => byKey.get(key))
    .filter(Boolean)
    .map((metric) => ({
      ...metric,
      label: metricLabels[metric.key] || metric.label || metric.key,
    }));
}

function normalizeContentsPage(response = {}) {
  const content = Array.isArray(response.content) ? response.content : [];

  return {
    content,
    page: Number(response.page || 0),
    size: Number(response.size || initialContentsPage.size),
    totalElements: Number(response.totalElements ?? content.length),
    totalPages: Number(response.totalPages || (content.length > 0 ? 1 : 0)),
    hasNext: Boolean(response.hasNext),
    source: response.source || null,
  };
}

function mergeContents(currentContents, nextContents) {
  const seen = new Set();

  return [...currentContents, ...nextContents].filter((item) => {
    const key = item.videoStoreId || `${item.title}-${item.createdAt}`;

    if (!key) {
      return true;
    }

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getDateRange(days) {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));

  return {
    from: formatDateInput(from),
    to: formatDateInput(to),
  };
}

function formatDateInput(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isDateString(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getInclusiveDayCount(from, to) {
  const fromDate = new Date(`${from}T00:00:00`);
  const toDate = new Date(`${to}T00:00:00`);
  const diff = toDate.getTime() - fromDate.getTime();

  return Math.floor(diff / 86400000) + 1;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function formatMetricValue(value, unit) {
  if (unit === "percent") {
    return formatPercent(value);
  }

  if (unit === "seconds") {
    return formatSeconds(value);
  }

  return formatNumber(value);
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "-";
  }

  return `${(Number(value) * 100).toFixed(1)}%`;
}

function formatChangeRate(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "비교 기준 없음";
  }

  const normalizedValue = Number(value);
  const sign = normalizedValue > 0 ? "+" : "";

  return `직전 기간 대비 ${sign}${normalizedValue.toFixed(1)}%`;
}

function getChangeClassName(value) {
  if (value == null || Number.isNaN(Number(value))) {
    return "metric-card__note";
  }

  if (Number(value) > 0) {
    return "metric-card__note store-analytics-change store-analytics-change--up";
  }

  if (Number(value) < 0) {
    return "metric-card__note store-analytics-change store-analytics-change--down";
  }

  return "metric-card__note";
}

function formatSeconds(value) {
  const seconds = Number(value || 0);

  if (seconds < 60) {
    return `${seconds.toFixed(1)}초`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  return `${minutes}분 ${remainingSeconds}초`;
}

function formatDateLabel(value) {
  if (!value) {
    return "-";
  }

  const [year, month, day] = String(value).slice(0, 10).split("-");

  if (!year || !month || !day) {
    return String(value);
  }

  return `${year}.${month}.${day}`;
}

function formatTrendDate(value) {
  if (!value) {
    return "-";
  }

  const [, month, day] = String(value).slice(0, 10).split("-");

  if (!month || !day) {
    return String(value);
  }

  return `${Number(month)}.${Number(day)}`;
}

function getBarWidth(value, maxValue) {
  return Math.max(4, Math.min(100, (Number(value || 0) / maxValue) * 100));
}

export default StoreAnalyticsPanel;
