import React, { useEffect, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import OperationsShared, { State } from "./OperationsShared";
import useOperationsSnapshot from "./useOperationsSnapshot";
import { operationsModel, GITHUB_LABELS, time } from "./operationsModel";
import "./Operations.css";
import {EvidenceFlow, EvidenceHeader, focusEvidence, RuntimeTable, runtimeEvidence} from "./OperationsDrilldown";
import "./OperationsDrilldown.css";
export default function AdminOperationsHome() {
  const data = useOperationsSnapshot(),
    s = data.snapshot,
    m = useMemo(() => operationsModel(s), [s]);
  const [params,setParams]=useSearchParams();
  const evidence=params.get('evidence')||'',api=params.get('api')||'',response=params.get('response')||'',failuresOnly=params.get('status')==='failed';
  const runtime=runtimeEvidence(s,{failuresOnly,api,response});
  const available=Boolean(s);
  useEffect(()=>{if(available&&evidence)focusEvidence("ops-home-evidence");},[available,evidence,api,response,failuresOnly]);
  function showEvidence(value,extra={}){setParams({evidence:value,...extra});focusEvidence('ops-home-evidence');}
  const slow = [...(s?.api?.runtimeMetrics || [])]
    .filter((r) => r.path?.startsWith("/api/") && r.requestCount > 0)
    .sort(
      (a, b) => b.totalTimeMs / b.requestCount - a.totalTimeMs / a.requestCount
    )
    .slice(0, 5);
  const max = Math.max(1, ...slow.map((r) => r.totalTimeMs / r.requestCount));
  return (
    <OperationsShared
      title="오늘의 운영"
      description="확인이 필요한 일을 먼저 살펴보세요."
      data={data}
    >
      {(m.rejected > 0 || m.skips.length > 0) && (
        <div className="ops-alert">
          <strong>푸시 전송 실패 또는 생략 기록이 있습니다.</strong>
          <Link to="/admin/operations/incidents?view=push">원인 확인 →</Link>
        </div>
      )}
      <dl className="ops-summary" aria-label="실제 운영 지표">
        <div><Link to="/admin/operations/incidents">
          <dt>앱에서 보고한 API 오류</dt>
          <dd>
            {m.errors.available ? m.errors.errorCount + "건" : "확인 불가"}
          </dd>
          <small className="ops-muted">24 UTC 시간 버킷</small>
</Link>        </div>
        <div><Link to="/admin/operations?evidence=server&status=failed">
          <dt>서버 응답 실패율</dt>
          <dd>
            {m.serverFailureRate === null
              ? "기록 없음"
              : (m.serverFailureRate * 100).toFixed(1) + "%"}
          </dd>
          <small className="ops-muted">현재 프로세스 · HTTP 4xx/5xx</small>
</Link>        </div>
        <div><Link to="/admin/operations/incidents?view=push&outcome=SUCCESS">
          <dt>FCM 접수 성공률</dt>
          <dd>
            {!m.pushAvailable
              ? "확인 불가"
              : m.acceptanceRate === null
              ? "전송 기록 없음"
              : (m.acceptanceRate * 100).toFixed(1) + "%"}
          </dd>
          <small className="ops-muted">기기 수신률과 별개</small>
</Link>        </div>
        <div><Link to="/admin/operations?evidence=reports">
          <dt>활성 신고 표시</dt>
          <dd>
            {s?.reports?.available ? s.reports.activeFlags + "건" : "확인 불가"}
          </dd>
          <small className="ops-muted">미처리 신고 수와 별개</small>
</Link>        </div>
      </dl>
      <div className="ops-grid">
        <section className="ops-panel">
          <h2>확인이 필요한 일</h2>
          <ul className="ops-list">
            <li className="ops-row">
              <div>
                <State
                  value={
                    !m.errors.available
                      ? "unknown"
                      : m.errors.errorCount
                      ? "bad"
                      : "good"
                  }
                  label={
                    !m.errors.available
                      ? "API 오류 조회 불가"
                      : m.errors.errorCount
                      ? "API 오류 " + m.errors.errorCount + "건"
                      : "보고된 API 오류 없음"
                  }
                />
                <p className="ops-muted">
                  오류가 발생한 메뉴와 API를 확인하세요.
                </p>
              </div>
              <Link to="/admin/operations/incidents">진단 보기 →</Link>
            </li>
            <li className="ops-row">
              <div>
                <State
                  value={
                    !m.pushAvailable
                      ? "unknown"
                      : m.rejected > 0 || m.skips.length
                      ? "bad"
                      : "good"
                  }
                  label={
                    !m.pushAvailable
                      ? "푸시 기록 조회 불가"
                      : "푸시 전송 실패 " + m.rejected + "건"
                  }
                />
                <p className="ops-muted">
                  전송 생략과 기기 확인 상태도 구분합니다.
                </p>
              </div>
              <Link to="/admin/operations/incidents?view=push">
                전달 기록 →
              </Link>
            </li>
            <li className="ops-row">
              <div>
                <strong>배포 후 기능 점검</strong>
                <p className="ops-muted">
                  {m.releases.length
                    ? m.releases.length + "개 등록 버전"
                    : "등록된 버전 없음"}{" "}
                  · 실제 기기 확인은 별도 기록
                </p>
              </div>
              <Link to="/admin/operations/releases">점검 보기 →</Link>
            </li>
          </ul>
        </section>
        <section className="ops-panel">
          <h2>서비스 흐름</h2>
          <EvidenceFlow
            onSelect={(_,index)=>{if(index===1)showEvidence("server");else if(index===0)showEvidence("app");else showEvidence("push");}}
            label="수집과 확인 범위"
            stages={[
              {
                title: "앱 오류 보고",
                state: m.errors.available ? "good" : "unknown",
                detail: m.errors.available
                  ? "기록 조회 가능"
                  : "기록 조회 불가",
              },
              {
                title: "서버 요청",
                state: m.requests ? "good" : "unknown",
                detail: m.requests ? m.requests + "건 관측" : "관측 기록 없음",
              },
              {
                title: "FCM 전송",
                state: !m.pushAvailable
                  ? "unknown"
                  : m.rejected > 0 || m.skips.length
                  ? "bad"
                  : m.accepted
                  ? "good"
                  : "unknown",
                detail: "기기 수신은 별도 확인",
              },
            ]}
          />
          <p className="ops-muted">
            관측 범위를 보여주는 그림입니다. 전체 요청의 실제 호출 순서를 추적한
            결과는 아닙니다.
          </p>
        </section>
      </div>
      <div className="ops-grid">
        <section className="ops-panel">
          <h2>느린 서버 응답</h2>
          <p className="ops-muted">
            현재 프로세스의 메서드·경로·응답 상태별 평균입니다. 화면 로딩
            시간이나 p95가 아닙니다.
          </p>
          {slow.length ? (
            <ul className="ops-list">
              {slow.map((r, i) => (
                <li key={i}><button type="button" className="ops-chart-link" aria-label={r.method+" "+r.path+" 응답 "+r.status+" 근거 보기"} onClick={()=>showEvidence("server",{api:r.method+" "+r.path,response:String(r.status)})}>
                  <div className="ops-row">
                    <code>
                      {r.method} {r.path} · {r.status}
                    </code>
                    <strong>
                      {(r.totalTimeMs / r.requestCount).toFixed(0)}ms
                    </strong>
                  </div>
                  <div className="ops-bar">
                    <span
                      style={{
                        width:
                          (r.totalTimeMs / r.requestCount / max) * 100 + "%",
                      }}
                    />
                  </div>
                </button></li>
              ))}
            </ul>
          ) : (
            <p className="ops-empty">서버 응답 관측 기록이 없습니다.</p>
          )}
        </section>
        <section className="ops-panel">
          <h2>수집 상태</h2>
          <ul className="ops-list">
            <li>
              GitHub 실행 기록{" "}
              <button className="ops-status-link" type="button" onClick={()=>showEvidence("github")}><strong>{GITHUB_LABELS[s?.github?.status] || "확인 불가"} · 근거 보기 ↗</strong></button>
              <p className="ops-muted">
                마지막 확인 {time(s?.github?.checkedAt)}
              </p>
            </li>
            <li>
              앱 화면 로딩 · 활성 사용자 <strong>미수집</strong>
            </li>
            <li>
              백업·복구 검증 <strong>연동되지 않음</strong>
            </li>
          </ul>
          <p className="ops-muted">
            수집하지 않은 지표를 0이나 정상으로 표시하지 않습니다.
          </p>
          <Link to="/admin/api-registry">기존 API 관계도 보기 →</Link>
        </section>
      </div>
      {evidence&&<section className="ops-panel ops-evidence-panel" id="ops-home-evidence" tabIndex={-1} aria-label="운영 지표 근거">
        <EvidenceHeader title={({server:'서버 응답 근거',reports:'활성 신고 표시 근거',github:'GitHub 수집 근거',app:'앱 오류 보고 근거',push:'푸시 수집 근거'})[evidence]||'관측 범위'} onReset={()=>setParams({})}>숫자를 만든 범위와 실제 조회 가능한 기록을 구분해요.</EvidenceHeader>
        {evidence==='server'?<><dl className="ops-evidence-facts"><div><dt>현재 프로세스 전체 요청</dt><dd>{m.requests.toLocaleString()}건</dd></div><div><dt>HTTP 4xx/5xx 요청</dt><dd>{m.failed.toLocaleString()}건</dd></div></dl><p className="ops-muted">실패율 = HTTP 4xx/5xx 요청 ÷ 전체 관측 요청. 아래는 {api?'선택한 API'+(response?' · 응답 '+response:''):failuresOnly?'실패 응답만':'전체 응답 상태'}의 원본 집계 행이에요. 앱에서 보고한 오류 건수와 별개입니다.</p><RuntimeTable rows={runtime}/></>:evidence==='reports'?<><p>{s?.reports?.available?'서버가 반환한 활성 신고 표시 '+s.reports.activeFlags+'건입니다.':'신고 표시 집계를 조회하지 못했습니다.'}</p><p className="ops-muted">미처리 신고 사건 수와 다른 집계이므로 특정 신고 목록의 건수와 동일하게 해석하지 않아요.</p><Link to="/admin/feeds?reported=1">사진 신고 검토 열기 →</Link></>:evidence==='github'?<><p>수집 상태: {GITHUB_LABELS[s?.github?.status]||'확인 불가'} · 마지막 확인 {time(s?.github?.checkedAt)}</p><p className="ops-muted">연동됨은 수집 상태입니다. 개별 빌드·배포 성공 여부는 리비전이 일치하는 실행 기록에서 확인하세요.</p><Link to="/admin/operations/releases">배포별 실행 근거 보기 →</Link></>:evidence==='app'?<><p>24 UTC 시간 버킷 동안 앱·웹이 보고한 최종 실패입니다. 전체 요청 대비 실패율은 계산하지 않아요.</p><Link to="/admin/operations/incidents">오류가 보고된 API 목록 →</Link></>:<><p>FCM 접수 집계와 최근 최대 30건의 전송 시도, 앱 콜백으로 확인한 기기 수신 기록을 구분해요.</p><Link to="/admin/operations/incidents?view=push">푸시 집계와 전송 표본 보기 →</Link></>}
      </section>}
    </OperationsShared>
  );
}
