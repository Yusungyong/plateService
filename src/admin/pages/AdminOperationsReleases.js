import React, { useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { ADMIN_PERMISSIONS } from "../constants/adminPermissions";
import {
  createOperationsRelease,
  recordReleaseCheck,
} from "../api/operationsApi";
import OperationsShared, { State } from "./OperationsShared";
import useOperationsSnapshot from "./useOperationsSnapshot";
import {
  CHECKS,
  RESULT_LABELS,
  GITHUB_LABELS,
  operationsModel,
  latestChecks,
  releaseWorkflows,
  releaseStages,
  time,
} from "./operationsModel";
import "./Operations.css";
import {useSearchParams} from "react-router-dom";
import {EvidenceFlow,focusEvidence} from "./OperationsDrilldown";
import "./OperationsDrilldown.css";
function eventId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
  return (
    hex.slice(0, 8) +
    "-" +
    hex.slice(8, 12) +
    "-" +
    hex.slice(12, 16) +
    "-" +
    hex.slice(16, 20) +
    "-" +
    hex.slice(20)
  );
}
export default function AdminOperationsReleases() {
  const data = useOperationsSnapshot(),
    s = data.snapshot,
    m = useMemo(() => operationsModel(s), [s]);
  const { canAdmin } = useAuth(),
    canWrite = canAdmin(ADMIN_PERMISSIONS.SETTING_MANAGE);
  const [params,setParams]=useSearchParams();
  const selected=params.get("release")||"",evidence=params.get("evidence")||"",checkFilter=params.get("check")||"";
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({
    platform: "ANDROID",
    version: "",
    build: "",
    revision: "",
  });
  const release =
      selected?m.releases.find((r) => String(r.releaseId) === selected):m.releases[0],
    checks = latestChecks(s, release?.releaseId),
    runs = releaseWorkflows(s, release);
  const checkHistory=(s?.releases?.checks||[]).filter(row=>row.releaseId===release?.releaseId&&(!checkFilter||row.check===checkFilter));
  const visibleRuns=runs.filter(run=>evidence==='ci'?run.workflow.endsWith(release?.platform==='ANDROID'||release?.platform==='IOS'?'mobile-ci.yml':'ci.yml'):evidence==='deploy'?['deploy.yml','deploy-from-source.yml','mobile-beta.yml','mobile-release.yml'].some(path=>run.workflow.endsWith(path)):true);
  function inspect(kind,check=''){setParams({release:String(release?.releaseId||selected),evidence:kind,...(check?{check}:{})});focusEvidence(kind==='history'?'ops-release-history':kind==='registered'?'ops-release-registered':'ops-release-runs');}
  const writable = canWrite && s?.releases?.available === true;
  async function create(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await createOperationsRelease(draft);
      setParams({release:String(result.releaseId)});
      setDraft({ platform: "ANDROID", version: "", build: "", revision: "" });
      setNotice(
        "버전을 등록했습니다. 배포 완료와 기기 점검은 별도 확인하세요."
      );
      await data.load();
    } catch (failure) {
      setError(failure.message || "버전 등록 실패");
    } finally {
      setBusy(false);
    }
  }
  async function record(check, result) {
    if (!release || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await recordReleaseCheck(release.releaseId, {
        eventId: eventId(),
        check,
        result,
      });
      setNotice(CHECKS[check] + " 결과를 기록했습니다.");
      await data.load();
    } catch (failure) {
      setError(failure.message || "점검 기록 실패");
    } finally {
      setBusy(false);
    }
  }
  return (
    <OperationsShared
      title="배포와 품질"
      description="자동 실행 결과와 스토어·실제 기기 확인을 구분합니다."
      data={data}
    >
      {error && (
        <p role="alert" className="ops-notice">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {s?.releases?.available !== true && (
        <p className="ops-notice">
          릴리스 기록을 조회할 수 없습니다. 운영 기록 저장소 상태를 확인하세요.
        </p>
      )}
      <div className="ops-row" style={{ margin: "22px 0" }}>
        <label>
          확인할 버전{" "}
          <select
            className="ops-select"
            value={release?.releaseId || ""}
            onChange={(e) => setParams({release:e.target.value})}
          >
            <option value="" disabled>
              등록 버전 없음
            </option>
            {m.releases.map((row) => (
              <option key={row.releaseId} value={row.releaseId}>
                {row.platform} · {row.version} ({row.build}) ·{" "}
                {row.revision.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="ops-link-button" onClick={()=>inspect('runs')}>GitHub · {GITHUB_LABELS[s?.github?.status] || "확인 불가"} · 근거 보기 →</button>
      </div>
      {release ? (
        <>
          <section className="ops-panel" id="ops-release-registered" tabIndex={-1}>
            <h2>
              {release.platform} {release.version} · 빌드 {release.build}
            </h2>
            <p className="ops-muted">
              등록 {time(release.createdAt)} · 소스{" "}
              {release.revision.slice(0, 12)}
            </p>
            <EvidenceFlow stages={releaseStages(s, release)} label="릴리스 근거 단계" onSelect={(_,index)=>inspect(['registered','ci','deploy','history','history'][index],index===3?'STORE_PUBLISHED':index===4?'DEVICE_CHECK':'')} />
            {evidence==='registered'&&<p className="ops-evidence-selection">등록 근거 · {release.platform} / {release.version} / 빌드 {release.build} / 소스 {release.revision}. 운영자가 등록한 기록이며 실제 출시 증명이 아닙니다.</p>}
            {evidence&&<button type="button" className="ops-link-button" onClick={()=>setParams({release:String(release.releaseId)})}>근거 조건 초기화</button>}
            <p className="ops-muted">
              워크플로 성공만으로 스토어 출시나 실제 기기 동작을 확정하지
              않습니다. 소스 리비전이 일치하는 기록만 연결합니다.
            </p>
          </section>
          <div className="ops-grid">
            <section className="ops-panel">
              <h2>핵심 기능 점검</h2>
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>기능</th>
                      <th>현재 결과</th>
                      <th>확인 기록</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(CHECKS).map(([check, label]) => (
                      <tr key={check}>
                        <td>
                          {label}
                          <small
                            className="ops-muted"
                            style={{ display: "block" }}
                          >
                            {checks[check]
                              ? time(checks[check].checkedAt)
                              : "미확인"}
                          </small>
                        </td>
                        <td>
                          <button type="button" className="ops-status-link" aria-label={label+' 점검 이력 보기'} onClick={()=>inspect('history',check)}><State
                            value={
                              checks[check]?.result === "PASS"
                                ? "good"
                                : checks[check]?.result === "FAIL"
                                ? "bad"
                                : "unknown"
                            }
                            label={
                              RESULT_LABELS[checks[check]?.result] ||
                              "확인 대기"
                            }
                          /> <span aria-hidden="true">↗</span></button>
                        </td>
                        <td>
                          {canWrite ? (
                            <div className="ops-check-actions">
                              {["PASS", "FAIL", "PENDING"].map((result) => (
                                <button
                                  className="ops-button"
                                  disabled={busy || !writable}
                                  key={result}
                                  aria-label={
                                    label +
                                    " " +
                                    RESULT_LABELS[result] +
                                    " 기록"
                                  }
                                  onClick={() => record(check, result)}
                                >
                                  {RESULT_LABELS[result]}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="ops-muted">조회 전용</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="ops-muted">
                실제 점검한 결과만 기록하세요. 기록 변경 이력을 보존합니다.
              </p>
            </section>
            <section className="ops-panel" id="ops-release-runs" tabIndex={-1}>
              <h2>연결된 자동 실행</h2>
              <p className="ops-muted">{evidence==='ci'?'자동 검증':evidence==='deploy'?'배포 워크플로':'전체 실행'} · 선택한 버전의 저장소와 소스 리비전이 일치하는 조회 기록 {visibleRuns.length}건. GitHub {GITHUB_LABELS[s?.github?.status]||'확인 불가'} · 마지막 확인 {time(s?.github?.checkedAt)}</p>
              {visibleRuns.length ? (
                <ul className="ops-list">
                  {visibleRuns.map((run) => (
                    <li key={run.repository + run.runId}>
                      <strong>{run.workflow.split("/").pop()}</strong>
                      <p><a className="ops-status-link" href={'https://github.com/'+run.repository+'/actions/runs/'+run.runId} target="_blank" rel="noreferrer" aria-label={(run.conclusion||run.status)+' 실행 로그 보기'}>
                        <State
                          value={
                            run.status === "completed" &&
                            run.conclusion === "success"
                              ? "good"
                              : run.conclusion === "failure"
                              ? "bad"
                              : "unknown"
                          }
                          label={run.conclusion || run.status}
                        /> ↗</a>
                      </p>
                      <p className="ops-muted">
                        시도 {run.attempt} · {time(run.updatedAt)}
                      </p>
                      <a
                        href={
                          "https://github.com/" +
                          run.repository +
                          "/actions/runs/" +
                          run.runId
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        GitHub 실행 보기 ↗
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="ops-empty">
                  해당 리비전과 일치하는 실행 기록이 없습니다.
                </p>
              )}
              <p className="ops-muted">
                이전 버전 대비 화면 속도·오류율은 버전별 수집이 연결된 뒤 제공할
                수 있습니다.
              </p>
            </section>
          </div>
          <section className="ops-panel" id="ops-release-history" tabIndex={-1} aria-label="점검 변경 이력">
            <h2>점검 변경 이력</h2>
            <div className="ops-filter-bar"><label>점검 항목 <select value={checkFilter} onChange={event=>inspect('history',event.target.value)}><option value="">전체 점검</option>{Object.entries(CHECKS).map(([key,title])=><option key={key} value={key}>{title}</option>)}</select></label><span>서버가 반환한 이력 중 선택 조건 {checkHistory.length}건 · 최대 20건 표시</span></div>
            <ul className="ops-list">
              {checkHistory
                .slice(0, 20)
                .map((row) => (
                  <li key={row.eventId}>
                    {time(row.checkedAt)} · {CHECKS[row.check]} ·{" "}
                    {RESULT_LABELS[row.result]} · 운영자 확인
                  </li>
                ))}
            </ul>
            {!checkHistory.length && <p className="ops-muted">점검 기록 없음</p>}
          </section>
        </>
      ) : (
        <p className="ops-empty">
          {selected?"선택한 버전이 조회 목록에 없습니다. 버전 선택에서 다시 골라 주세요.":"등록된 버전이 없습니다. 확인할 버전을 등록해 점검을 시작하세요."}
        </p>
      )}
      {canWrite && (
        <section className="ops-panel" style={{ marginTop: 20 }}>
          <h2>점검할 버전 등록</h2>
          <form className="ops-form" onSubmit={create}>
            <label>
              플랫폼
              <select
                className="ops-select"
                value={draft.platform}
                onChange={(e) =>
                  setDraft({ ...draft, platform: e.target.value })
                }
              >
                {["ANDROID", "IOS", "SERVER", "WEB"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              버전
              <input
                required
                maxLength={32}
                pattern="[0-9A-Za-z][0-9A-Za-z.+_\-]{0,31}"
                value={draft.version}
                onChange={(e) =>
                  setDraft({ ...draft, version: e.target.value })
                }
                placeholder="예: 2.0.13"
              />
            </label>
            <label>
              빌드
              <input
                required
                maxLength={32}
                value={draft.build}
                onChange={(e) => setDraft({ ...draft, build: e.target.value })}
                placeholder="예: 32"
              />
            </label>
            <label>
              소스 리비전
              <input
                required
                minLength={40}
                maxLength={40}
                pattern="[a-f0-9]{40}"
                value={draft.revision}
                onChange={(e) =>
                  setDraft({ ...draft, revision: e.target.value })
                }
                placeholder="40자리 커밋 SHA"
              />
            </label>
            <p className="ops-muted ops-wide">
              버전 등록은 배포를 실행하거나 출시 상태를 변경하지 않습니다.
            </p>
            <button
              className="ops-button ops-button--primary ops-wide"
              disabled={busy || !writable}
              type="submit"
            >
              {busy ? "기록 중…" : "버전 등록"}
            </button>
          </form>
        </section>
      )}
    </OperationsShared>
  );
}
