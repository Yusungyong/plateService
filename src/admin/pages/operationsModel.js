import { clientErrorState } from "./apiClientErrors";
export const CHECKS = {
  LOGIN: "로그인",
  FRIEND_REQUEST: "친구 요청",
  CHAT: "채팅 송수신",
  CONTENT_SHARE: "콘텐츠 공유",
  PUSH: "푸시 알림",
  STORE_PUBLISHED: "스토어 출시",
  DEVICE_CHECK: "실제 기기 점검",
};
export const RESULT_LABELS = {
  PASS: "통과",
  FAIL: "실패",
  PENDING: "확인 대기",
};
export const GITHUB_LABELS = {
  NOT_CONFIGURED: "연동 설정 필요",
  WAITING: "첫 수집 대기",
  CONNECTED: "연동됨",
  UNAVAILABLE: "수집 실패",
};
export const time = (value) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString("ko-KR", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "확인 불가";
export const routeKey = (row) =>
  `${row.method} ${row.path?.replace(/\{[^}]+\}/g, "{}")}`;
export function operationsModel(snapshot) {
  const errors = clientErrorState({
    clientErrors: snapshot?.api?.clientErrors,
  });
  const labels = new Map(
    (snapshot?.api?.menus || []).map((m) => [m.id, m.label])
  );
  const routes = new Map(
    (snapshot?.api?.routes || []).map((r) => [routeKey(r), r])
  );
  const rows = [...errors.rows.values()]
    .map((row) => ({
      ...row,
      menuLabels: (routes.get(routeKey(row))?.menuIds || []).map(
        (id) => labels.get(id) || id
      ),
    }))
    .sort(
      (a, b) =>
        b.http5xxCount +
          b.networkCount +
          b.timeoutCount -
          (a.http5xxCount + a.networkCount + a.timeoutCount) ||
        b.errorCount - a.errorCount
    );
  const metrics = (snapshot?.api?.runtimeMetrics || []).filter(
    (r) =>
      r.path?.startsWith("/api/") &&
      Number.isFinite(r.requestCount) &&
      r.requestCount >= 0 &&
      Number.isFinite(r.totalTimeMs) &&
      r.totalTimeMs >= 0
  );
  const requests = metrics.reduce((n, r) => n + r.requestCount, 0);
  const failed = metrics
    .filter((r) => Number(r.status) >= 400)
    .reduce((n, r) => n + r.requestCount, 0);
  const push = snapshot?.push;
  const pushAvailable =
    push?.available === true &&
    Array.isArray(push.counts) &&
    Array.isArray(push.attempts) &&
    Array.isArray(push.skips);
  const accepted = pushAvailable
    ? push.counts
        .filter((r) => r.status === "SUCCESS")
        .reduce((n, r) => n + r.count, 0)
    : null;
  const rejected = pushAvailable
    ? push.counts
        .filter((r) => r.status === "FAILED")
        .reduce((n, r) => n + r.count, 0)
    : null;
  return {
    errors,
    rows,
    requests,
    failed,
    serverFailureRate: requests ? failed / requests : null,
    pushAvailable,
    accepted,
    rejected,
    acceptanceRate:
      accepted + rejected > 0 ? accepted / (accepted + rejected) : null,
    attempts: pushAvailable ? push.attempts : [],
    skips: pushAvailable ? push.skips : [],
    releases:
      snapshot?.releases?.available === true
        ? snapshot.releases.items || []
        : [],
  };
}
export function pushStages(row) {
  if (!row) return [];
  return [
    { title: "전송 시도", state: "good", detail: time(row.attemptedAt) },
    {
      title: "FCM 접수",
      state:
        row.providerStatus === "SUCCESS"
          ? "good"
          : row.providerStatus === "FAILED"
          ? "bad"
          : "unknown",
      detail:
        row.providerStatus === "SUCCESS"
          ? "접수 성공"
          : row.providerStatus === "FAILED"
          ? row.errorCode
          : "확인 불가",
    },
    {
      title: "기기 수신",
      state: row.receivedAt || row.openedAt ? "good" : "unknown",
      detail: row.receivedAt
        ? time(row.receivedAt)
        : row.openedAt
        ? "열기 기록으로 확인"
        : "확인 불가",
    },
    {
      title: "알림 열기",
      state: row.openedAt ? "good" : "unknown",
      detail: row.openedAt ? time(row.openedAt) : "확인 불가",
    },
  ];
}
export function latestChecks(snapshot, id) {
  const result = {};
  for (const item of snapshot?.releases?.checks || [])
    if (item.releaseId === id && CHECKS[item.check] && !result[item.check])
      result[item.check] = item;
  return result;
}
export function releaseWorkflows(snapshot, release) {
  const repo = {
    ANDROID: "Yusungyong/plateApp2",
    IOS: "Yusungyong/plateApp2",
    SERVER: "Yusungyong/plateAppServer",
    WEB: "Yusungyong/plateService",
  }[release?.platform];
  return (snapshot?.releases?.workflows || []).filter(
    (r) => r.revision === release?.revision && r.repository === repo
  );
}
export function releaseStages(snapshot, release) {
  const runs = releaseWorkflows(snapshot, release);
  const latest = (path) => runs.find((r) => r.workflow.endsWith(path));
  const ci = latest(
    release?.platform === "ANDROID" || release?.platform === "IOS"
      ? "mobile-ci.yml"
      : "ci.yml"
  );
  const deploy = runs.find((r) =>
    [
      "deploy.yml",
      "deploy-from-source.yml",
      "mobile-beta.yml",
      "mobile-release.yml",
    ].some((path) => r.workflow.endsWith(path))
  );
  const outcome = (r) =>
    r?.status !== "completed"
      ? "unknown"
      : r.conclusion === "success"
      ? "good"
      : r.conclusion === "failure" || r.conclusion === "timed_out"
      ? "bad"
      : "unknown";
  const checks = latestChecks(snapshot, release?.releaseId);
  const manual = (check) =>
    checks[check]?.result === "PASS"
      ? "good"
      : checks[check]?.result === "FAIL"
      ? "bad"
      : "unknown";
  return [
    { title: "버전 등록", state: "good", detail: "배포 완료와 별개" },
    {
      title: "자동 검증",
      state: outcome(ci),
      detail: ci ? ci.conclusion || ci.status : "기록 없음",
    },
    {
      title: "배포 워크플로",
      state: outcome(deploy),
      detail: deploy ? deploy.conclusion || deploy.status : "기록 없음",
    },
    {
      title: "스토어 출시",
      state: manual("STORE_PUBLISHED"),
      detail: RESULT_LABELS[checks.STORE_PUBLISHED?.result] || "확인 대기",
    },
    {
      title: "기기 점검",
      state: manual("DEVICE_CHECK"),
      detail: RESULT_LABELS[checks.DEVICE_CHECK?.result] || "확인 대기",
    },
  ];
}
