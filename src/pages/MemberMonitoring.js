import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import MemberActions from "../admin/components/MemberActions";
import { useAuth } from "../auth/AuthContext";
import { ADMIN_PERMISSIONS as P } from "../admin/constants/adminPermissions";
import "../admin/styles/member-workspace.css";
import PageLayout from "../components/PageLayout";
import {
  fetchMemberMonitoringLoginRisks,
  fetchMemberMonitoringProfileChanges,
  fetchMemberMonitoringRiskUsers,
  fetchMemberMonitoringSummary,
  fetchMemberMetricDetails,
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
  if (value === undefined || value === null) return "확인 불가";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric.toLocaleString("ko-KR") : "-";
}

function formatPercent(value) {
  if (value === undefined || value === null) return "확인 불가";
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${numeric.toLocaleString("ko-KR")}%` : "-";
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?$/.test(value) ? value + "+09:00" : value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
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
      key: "totalUsers",
      label: "전체 회원 수",
      value: formatNumber(summary.totalUsers),
      note: "회원 마스터 기준 누적 회원 수",
    },
    {
      key: "newUsersToday",
      label: "오늘 신규 가입",
      value: formatNumber(summary.newUsersToday),
      note: "당일 생성된 회원 계정 수",
    },
    {
      key: "activeUsers7d",
      label: "7일 활성 회원",
      value: formatNumber(summary.activeUsers7d),
      note: "최근 7일 로그인 성공한 회원 수",
    },
    {
      key: "loginFailureRateToday",
      label: "오늘 로그인 실패율",
      value: formatPercent(summary.loginFailureRateToday),
      note: "오늘 로그인 시도 대비 실패 비율",
    },
    {
      key: "pendingRoleChanges",
      label: "최근 24시간 권한 변경",
      value: formatNumber(summary.pendingRoleChanges),
      note: "변경 이력 수 · 승인 대기 건수가 아닙니다.",
    },
    {
      key: "riskUsers24h",
      label: "위험 회원",
      value: formatNumber(summary.riskUsers24h),
      note: "최근 24시간 이상 징후 계정 수",
    },
  ];
}

function MemberMonitoring() {
  const {user,canAdmin}=useAuth();
  const scope=JSON.stringify([user?.accountSubject,user?.roles,user?.permissions]);
  const allowed=canAdmin(P.MEMBER_MONITORING_READ);
  return <MemberMonitoringWorkspace key={scope} allowed={allowed}/>;
}

function MemberMonitoringWorkspace({allowed}) {
  const [summary,setSummary]=useState({}), [loginRisks,setLoginRisks]=useState([]);
  const [profileChanges,setProfileChanges]=useState([]), [riskUsers,setRiskUsers]=useState([]);
  const [profileChangesPage,setProfileChangesPage]=useState(1), [isLoading,setIsLoading]=useState(true);
  const [refresh,setRefresh]=useState(0), [failures,setFailures]=useState([]);
  const [params,setParams]=useSearchParams();
  const tab=params.get('tab')==='signals'?'signals':'search';
  const signalTab=['login','changes','risk'].includes(params.get('signal'))?params.get('signal'):'login';
  const metric=['totalUsers','newUsersToday','activeUsers7d','loginFailureRateToday','pendingRoleChanges','riskUsers24h'].includes(params.get('metric'))?params.get('metric'):'';
  const metricPage=Math.max(0,Math.min(100000,Math.trunc(Number(params.get('metricPage')))||0));
  const evidenceHeading=useRef(null);
  function updateLocation(values) {const next=new URLSearchParams(params);Object.entries(values).forEach(([key,value])=>value?next.set(key,value):next.delete(key));setParams(next);}
  function setTab(value){updateLocation({tab:value==='search'?'':value,metric:'',metricPage:''});}
  function setSignalTab(value){updateLocation({signal:value,metric:'',metricPage:''});}
  function openMetric(key){updateLocation({metric:key,metricPage:'',username:'',fromMetric:'',fromSignal:''});}
  useEffect(()=>{if(metric){evidenceHeading.current?.focus({preventScroll:true});evidenceHeading.current?.scrollIntoView?.({block:'start',behavior:'smooth'});}},[metric,metricPage]);
  const pageSize=5;
  useEffect(()=>{
    if(!allowed)return undefined;
    let current=true;
    setIsLoading(true);
    Promise.allSettled([fetchMemberMonitoringSummary(),fetchMemberMonitoringLoginRisks(),fetchMemberMonitoringProfileChanges(),fetchMemberMonitoringRiskUsers()]).then(results=>{
      if(!current)return;
      const names=['회원 지표','로그인 이상 징후','변경 이력','위험 계정'];
      setFailures(results.flatMap((result,index)=>result.status==='rejected'?[names[index]]:[]));
      setSummary(results[0].status==='fulfilled'?(unwrapPayload(results[0].value)||{}):{});
      [setLoginRisks,setProfileChanges,setRiskUsers].forEach((setter,index)=>setter(results[index+1].status==='fulfilled'?normalizeItemsResponse(results[index+1].value):[]));
      setProfileChangesPage(1);setIsLoading(false);
    });
    return()=>{current=false;};
  },[allowed,refresh]);
  const cards=useMemo(()=>buildKpiCards(summary),[summary]);
  const totalPages=Math.max(1,Math.ceil(profileChanges.length/pageSize));
  const pagedChanges=profileChanges.slice((profileChangesPage-1)*pageSize,profileChangesPage*pageSize);
  function memberLink(username,origin=metric){const next=new URLSearchParams(params);next.set('username',username);next.delete('metric');next.delete('tab');next.delete('fromMetric');next.delete('fromSignal');if(origin)next.set('fromMetric',origin);else{next.set('fromSignal',signalTab);next.delete('metricPage');}return '/admin/member-monitoring?'+next.toString();}
  function account(item){return item.username&&!item.username.includes(',')?<Link to={memberLink(item.username,'')}>{item.username} 확인 <span aria-hidden="true">→</span></Link>:<strong>{item.username||'-'}</strong>;}
  function returnToEvidence(){const origin=params.get('fromMetric');updateLocation({username:'',fromMetric:'',fromSignal:'',metric:origin||'',tab:origin?'':'signals',signal:params.get('fromSignal')||signalTab});}
  if(!allowed)return <p role="alert">회원 모니터링을 조회할 권한이 없습니다.</p>;
  return <PageLayout title="회원 모니터링" description="회원을 찾고, 활동을 살펴보고, 필요한 조치를 차분히 진행하세요." className="member-workspace">
    <div className="member-workspace-toolbar"><p>찾기부터 확인까지, 한 화면에서 이어서 관리해요.</p><button type="button" className="admin-button admin-button--secondary" disabled={isLoading} onClick={()=>setRefresh(value=>value+1)}>모니터링 새로고침</button></div>
    <section className="member-workspace-stats member-workspace-stats--interactive" aria-label="회원 핵심 지표">{cards.map(card=><button id={'member-metric-'+card.key} key={card.key} type="button" aria-label={card.label+' 근거 보기'} aria-expanded={metric===card.key} aria-controls="member-metric-evidence" disabled={isLoading} onClick={()=>openMetric(card.key)}><span>{card.label}</span><strong>{isLoading?'…':card.value}</strong><small>{card.note}</small><em>자세히 보기 →</em></button>)}</section>
    {params.get('username')&&(params.get('fromMetric')||params.get('fromSignal'))&&<button type="button" className="member-quiet-button member-evidence-return" onClick={returnToEvidence}>← {cards.find(card=>card.key===params.get('fromMetric'))?.label||'이상 징후'} 확인으로 돌아가기</button>}
    {metric&&<section id="member-metric-evidence" className="member-metric-evidence" aria-labelledby="member-evidence-heading"><header><div><span className="member-eyebrow">숫자에서 실제 근거까지</span><h2 id="member-evidence-heading" tabIndex={-1} ref={evidenceHeading}>{cards.find(card=>card.key===metric)?.label} 자세히</h2></div><button type="button" className="member-quiet-button" onClick={()=>{updateLocation({metric:'',metricPage:''});document.getElementById('member-metric-'+metric)?.focus();}}>근거 닫기</button></header>{metric==='loginFailureRateToday'?<LoginEvidence summary={summary} loading={isLoading} onSignals={()=>updateLocation({metric:'',tab:'signals',signal:'login',metricPage:''})}/>:<MemberMetricRows key={metric} metric={metric} page={metricPage} refresh={refresh} memberLink={memberLink} onPage={page=>updateLocation({metricPage:page?String(page):''})}/>}</section>}
    {failures.length>0&&<p role="alert" className="member-feedback member-feedback--error">조회 실패: {failures.join(' · ')}. 새로고침으로 다시 확인해 주세요.</p>}
    <MemberTabs label="회원 관리 영역" items={[["search","회원 찾기"],["signals","이상 징후"]]} selected={tab} onSelect={setTab}/>
    <section id="member-panel-search" role="tabpanel" aria-labelledby="member-tab-search" hidden={tab!=='search'}><MemberActions/></section>
    <section id="member-panel-signals" role="tabpanel" aria-labelledby="member-tab-signals" hidden={tab!=='signals'}>
      <div className="member-signals-intro"><div><span className="member-eyebrow">서비스 살펴보기</span><h2>확인이 필요한 신호</h2><p>이상 징후는 검토를 위한 자료예요. 회원을 선택해 실제 활동과 함께 확인하세요.</p></div><details><summary>점검 순서 보기</summary><ol><li>로그인 실패와 동일 IP 다계정 기록을 확인해요.</li><li>권한 변경은 실제 요청과 수행자를 대조해요.</li><li>신고·차단 기록은 콘텐츠 활동과 함께 검토해요.</li></ol></details></div>

      <MemberTabs label="회원 모니터링 종류" items={[["login","로그인 이상 징후"],["changes","변경 이력"],["risk","신고·차단"]]} selected={signalTab} onSelect={setSignalTab}/>
      {signalTab==='login'&&<section id="member-panel-login" role="tabpanel" aria-labelledby="member-tab-login" className="member-signal-panel"><h3>로그인 이상 징후</h3><p className="member-search-help">최근 24시간 · 계정·IP·기기별 실패 3회 이상 또는 동일 IP 3계정 이상 · 최대 20건</p>{isLoading?<p role="status">로그인 기록을 불러오고 있어요…</p>:failures.includes('로그인 이상 징후')?<p className="member-empty">로그인 이상 징후 조회 실패</p>:!loginRisks.length?<p className="member-empty">현재 확인된 로그인 이상 징후가 없습니다.</p>:<ul className="member-signal-list">{loginRisks.map((item,index)=><li key={`${item.username}-${item.riskType||index}`}><div className="member-signal-main">{account(item)}<strong>{item.riskLabel||item.issue||item.riskType||'-'}</strong><p>{item.detail||[item.ipAddress,item.deviceId].filter(Boolean).join(' / ')||'-'}</p></div><span className="member-signal-state">{item.state||item.score||'확인 필요'}</span></li>)}</ul>}</section>}
      {signalTab==='changes'&&<section id="member-panel-changes" role="tabpanel" aria-labelledby="member-tab-changes" className="member-signal-panel"><h3>권한 및 회원 상태 변경</h3><p className="member-search-help">기간 필터 없는 최신 보관 이력 최대 20건 · 권한 변경 외 항목도 포함합니다.</p>{isLoading?<p role="status">변경 이력을 불러오고 있어요…</p>:failures.includes('변경 이력')?<p className="member-empty">변경 이력 조회 실패</p>:!profileChanges.length?<p className="member-empty">최근 변경 이력이 없습니다.</p>:<><ul className="member-signal-list">{pagedChanges.map((item,index)=><li key={`${item.historyId||item.username}-${item.createdAt||item.at||index}`}><div className="member-signal-main">{account(item)}<strong>{item.changedField||item.changeType||item.change||'-'}</strong></div><div className="member-signal-meta"><span>{item.actor==='system'?'수행자 미수집':item.actor||item.actorUsername||item.actorName||'수행자 미수집'}</span><time>{formatDateTime(item.createdAt||item.at)}</time></div></li>)}</ul><nav className="member-pagination" aria-label="최근 변경 이력 페이지 이동"><button type="button" disabled={profileChangesPage===1} onClick={()=>setProfileChangesPage(value=>Math.max(1,value-1))}>이전</button><span>{profileChangesPage} / {totalPages}</span><button type="button" disabled={profileChangesPage===totalPages} onClick={()=>setProfileChangesPage(value=>Math.min(totalPages,value+1))}>다음</button></nav></>}</section>}
      {signalTab==='risk'&&<section id="member-panel-risk" role="tabpanel" aria-labelledby="member-tab-risk" className="member-signal-panel"><h3>신고·차단 집중 사용자</h3><p className="member-search-help">신고·차단은 최근 30일, 콘텐츠 활동은 24시간 기준 상위 20명 · 위의 24시간 위험 회원 지표와 조회 범위가 다릅니다.</p>{isLoading?<p role="status">위험 계정 기록을 불러오고 있어요…</p>:failures.includes('위험 계정')?<p className="member-empty">위험 계정 조회 실패</p>:!riskUsers.length?<p className="member-empty">현재 표시할 위험 계정이 없습니다.</p>:<ul className="member-signal-list">{riskUsers.map(item=><li key={item.username}><div className="member-signal-main">{account(item)}<p>신고 {formatNumber(item.reportCount)}건 · 차단 {formatNumber(item.blockedCount)}건{item.recentActivityLabel?' · '+item.recentActivityLabel:''}</p></div><div className="member-signal-meta"><span>{item.recommendedAction||'운영 검토 필요'}</span>{item.score!=null&&<span>점수 {item.score}</span>}</div></li>)}</ul>}</section>}
    </section>
  </PageLayout>;
}
const metricDescriptions={
 totalUsers:'회원 계정 전체 집계입니다. 탈퇴 비노출 또는 현재 확인할 수 없는 계정은 익명 행으로 표시합니다.',
 newUsersToday:'한국 시간 오늘 날짜에 가입한 회원 계정입니다.',
 activeUsers7d:'조회 시점부터 최근 7일 동안 로그인에 한 번 이상 성공한 계정을 중복 없이 셉니다.',
 pendingRoleChanges:'조회 시점부터 최근 24시간의 권한 변경 이력입니다. 같은 회원의 여러 변경은 각각 한 건이며 승인 대기 목록이 아닙니다.',
 riskUsers24h:'최근 24시간 로그인 실패 5회 이상, 받은 신고 또는 받은 차단 중 하나 이상 해당하는 계정입니다. 여러 조건에 해당해도 회원은 한 번만 셉니다.'
};
function MemberMetricRows({metric,page,refresh,memberLink,onPage}){
 const [result,setResult]=useState(null),[error,setError]=useState(''),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{let current=true;const controller=new AbortController();setLoading(true);setError('');setResult(null);fetchMemberMetricDetails({metric,page,size:20},{signal:controller.signal}).then(value=>{const payload=unwrapPayload(value);if(payload?.metric!==metric||!Number.isSafeInteger(payload.total)||payload.total<0||!Array.isArray(payload.rows)||payload.page!==page||payload.size!==20||typeof payload.hasNext!=='boolean')throw new Error('지표 근거 응답을 확인할 수 없습니다. 다시 조회해 주세요.');if(current)setResult(payload);}).catch(failure=>{if(current&&!controller.signal.aborted)setError(failure.message||'지표 근거를 불러오지 못했습니다.');}).finally(()=>{if(current)setLoading(false);});return()=>{current=false;controller.abort();};},[metric,page,refresh,retry]);
 return <><p>{metricDescriptions[metric]}</p>{loading?<p role="status">실제 집계에 포함된 기록을 확인하고 있어요…</p>:error?<div role="alert" className="member-feedback member-feedback--error">{error}<button type="button" className="member-quiet-button" onClick={()=>setRetry(value=>value+1)}>근거 다시 조회</button></div>:result?<><p className="member-evidence-window">{result.from?formatDateTime(result.from)+'부터':'전체 기간'} · {formatDateTime(result.to)} 조회 · 한국 시간</p><p className="member-search-help">상세 조회 기준 총 {formatNumber(result.total)}{metric==='pendingRoleChanges'?'건':'명'} · 위 지표와 조회 시점이 다르면 수치가 달라질 수 있어요.</p>{result.rows?.length?<ul className="member-signal-list" aria-label="지표 집계 근거 목록">{result.rows.map((row,index)=><li key={page+'-'+index}><div className="member-signal-main">{row.available&&row.username?<Link to={memberLink(row.username)}>{row.nickname?row.nickname+' · ':''}{row.username} 확인 →</Link>:<strong>비공개 또는 삭제된 계정</strong>}<p>{row.reason}</p></div><time className="member-signal-meta">{formatDateTime(row.occurredAt)}</time></li>)}</ul>:<p className="member-empty">이 페이지에 표시할 기록이 없습니다.</p>}<nav className="member-pagination" aria-label="지표 근거 페이지 이동"><button type="button" disabled={page===0} onClick={()=>onPage(page-1)}>이전</button><span>{page+1} / {Math.max(1,Math.ceil(result.total/result.size))}</span><button type="button" disabled={!result.hasNext} onClick={()=>onPage(page+1)}>다음</button></nav></>:<p role="alert">지표 근거 응답을 확인할 수 없습니다.</p>}</>;
}
function LoginEvidence({summary,loading,onSignals}){
 const values=[summary.loginSuccessesToday,summary.loginFailuresToday,summary.loginOtherToday];
 const attempts=summary.loginAttemptsToday;
 const valid=Number.isSafeInteger(attempts)&&attempts>=0&&values.every(value=>Number.isSafeInteger(value)&&value>=0)&&values.reduce((sum,value)=>sum+value,0)===attempts;
 const labels=['성공','실패','기타 상태'];
 return <><p>한국 시간 오늘 00시부터 조회 시점까지의 실제 로그인 시도를 비교합니다. 실패는 FAIL·FAILED 상태이며, 회원 수가 아닌 시도 건수예요.</p>{loading?<p role="status">로그인 집계를 확인하고 있어요…</p>:!valid?<p role="alert">로그인 건수를 확인할 수 없어 비율 그래프를 표시하지 않았습니다. 새로고침 후 다시 확인해 주세요.</p>:attempts===0?<p className="member-empty">오늘 기록된 로그인 시도가 없습니다. 시도 0건에서는 성공률·실패율을 비교하지 않아요.</p>:<><p><strong>전체 시도 {formatNumber(attempts)}건</strong></p><div className="member-login-chart" role="img" aria-label={'오늘 로그인 시도: '+values.map((value,index)=>labels[index]+' '+value+'건').join(', ')}>{values.map((value,index)=><span key={labels[index]} className={'member-login-chart__part member-login-chart__part--'+index} style={{width:(100*value/attempts)+'%'}}/>)}</div><ul className="member-login-legend">{values.map((value,index)=><li key={labels[index]}><span className={'member-login-dot member-login-chart__part--'+index}/><span>{labels[index]}</span><strong>{formatNumber(value)}건 · {(100*value/attempts).toFixed(1)}%</strong></li>)}</ul></>}<button type="button" className="member-quiet-button" onClick={onSignals}>24시간 로그인 이상 징후 확인 →</button><p className="member-search-help">관련 이상 징후는 24시간 기준이며 오늘 로그인 전체 명단과는 다릅니다.</p></>;
}
function MemberTabs({label,items,selected,onSelect}){return <div role="tablist" aria-label={label} className="member-tabs">{items.map(([key,title],index)=><button key={key} id={'member-tab-'+key} type="button" role="tab" aria-selected={selected===key} aria-controls={'member-panel-'+key} tabIndex={selected===key?0:-1} onClick={()=>onSelect(key)} onKeyDown={event=>{const next={ArrowRight:(index+1)%items.length,ArrowLeft:(index+items.length-1)%items.length,Home:0,End:items.length-1}[event.key];if(next!==undefined){event.preventDefault();onSelect(items[next][0]);document.getElementById('member-tab-'+items[next][0])?.focus();}}}>{title}</button>)}</div>;}
export default MemberMonitoring;
