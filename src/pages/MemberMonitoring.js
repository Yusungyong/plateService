import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
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

  const date = new Date(value);

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
      label: "최근 24시간 권한 변경",
      value: formatNumber(summary.pendingRoleChanges),
      note: "변경 이력 수 · 승인 대기 건수가 아닙니다.",
    },
    {
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
  const [tab,setTab]=useState('search'), [signalTab,setSignalTab]=useState('login');
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
  function account(item){return item.username&&!item.username.includes(',')?<Link to={'/admin/member-monitoring?username='+encodeURIComponent(item.username)} onClick={()=>setTab('search')}>{item.username} 확인 <span aria-hidden="true">→</span></Link>:<strong>{item.username||'-'}</strong>;}
  if(!allowed)return <p role="alert">회원 모니터링을 조회할 권한이 없습니다.</p>;
  return <PageLayout title="회원 모니터링" description="회원을 찾고, 활동을 살펴보고, 필요한 조치를 차분히 진행하세요." className="member-workspace">
    <div className="member-workspace-toolbar"><p>찾기부터 확인까지, 한 화면에서 이어서 관리해요.</p><button type="button" className="admin-button admin-button--secondary" disabled={isLoading} onClick={()=>setRefresh(value=>value+1)}>모니터링 새로고침</button></div>
    <section className="member-workspace-stats" aria-label="회원 핵심 지표">{cards.slice(0,3).map(card=><div key={card.label}><span>{card.label}</span><strong>{isLoading?'…':card.value}</strong><small>{card.note}</small></div>)}</section>
    {failures.length>0&&<p role="alert" className="member-feedback member-feedback--error">조회 실패: {failures.join(' · ')}. 새로고침으로 다시 확인해 주세요.</p>}
    <MemberTabs label="회원 관리 영역" items={[["search","회원 찾기"],["signals","이상 징후"]]} selected={tab} onSelect={setTab}/>
    <section id="member-panel-search" role="tabpanel" aria-labelledby="member-tab-search" hidden={tab!=='search'}><MemberActions/></section>
    <section id="member-panel-signals" role="tabpanel" aria-labelledby="member-tab-signals" hidden={tab!=='signals'}>
      <div className="member-signals-intro"><div><span className="member-eyebrow">서비스 살펴보기</span><h2>확인이 필요한 신호</h2><p>이상 징후는 검토를 위한 자료예요. 회원을 선택해 실제 활동과 함께 확인하세요.</p></div><details><summary>점검 순서 보기</summary><ol><li>로그인 실패와 동일 IP 다계정 기록을 확인해요.</li><li>권한 변경은 실제 요청과 수행자를 대조해요.</li><li>신고·차단 기록은 콘텐츠 활동과 함께 검토해요.</li></ol></details></div>
      <section className="member-workspace-stats member-workspace-stats--signals" aria-label="회원 보안 지표">{cards.slice(3).map(card=><div key={card.label}><span>{card.label}</span><strong>{isLoading?'…':card.value}</strong><small>{card.note}</small></div>)}</section>
      <MemberTabs label="회원 모니터링 종류" items={[["login","로그인 이상 징후"],["changes","변경 이력"],["risk","신고·차단"]]} selected={signalTab} onSelect={setSignalTab}/>
      {signalTab==='login'&&<section id="member-panel-login" role="tabpanel" aria-labelledby="member-tab-login" className="member-signal-panel"><h3>로그인 이상 징후</h3><p className="member-search-help">최근 기록 최대 20건 · 회원을 선택하면 상세로 이동해요.</p>{isLoading?<p role="status">로그인 기록을 불러오고 있어요…</p>:failures.includes('로그인 이상 징후')?<p className="member-empty">로그인 이상 징후 조회 실패</p>:!loginRisks.length?<p className="member-empty">현재 확인된 로그인 이상 징후가 없습니다.</p>:<ul className="member-signal-list">{loginRisks.map((item,index)=><li key={`${item.username}-${item.riskType||index}`}><div className="member-signal-main">{account(item)}<strong>{item.riskLabel||item.issue||item.riskType||'-'}</strong><p>{item.detail||[item.ipAddress,item.deviceId].filter(Boolean).join(' / ')||'-'}</p></div><span className="member-signal-state">{item.state||item.score||'확인 필요'}</span></li>)}</ul>}</section>}
      {signalTab==='changes'&&<section id="member-panel-changes" role="tabpanel" aria-labelledby="member-tab-changes" className="member-signal-panel"><h3>권한 및 회원 상태 변경</h3><p className="member-search-help">최근 기록 최대 20건 · 변경 항목과 수행 시각을 확인해요.</p>{isLoading?<p role="status">변경 이력을 불러오고 있어요…</p>:failures.includes('변경 이력')?<p className="member-empty">변경 이력 조회 실패</p>:!profileChanges.length?<p className="member-empty">최근 변경 이력이 없습니다.</p>:<><ul className="member-signal-list">{pagedChanges.map((item,index)=><li key={`${item.historyId||item.username}-${item.createdAt||item.at||index}`}><div className="member-signal-main">{account(item)}<strong>{item.changedField||item.changeType||item.change||'-'}</strong></div><div className="member-signal-meta"><span>{item.actor==='system'?'수행자 미수집':item.actor||item.actorUsername||item.actorName||'수행자 미수집'}</span><time>{formatDateTime(item.createdAt||item.at)}</time></div></li>)}</ul><nav className="member-pagination" aria-label="최근 변경 이력 페이지 이동"><button type="button" disabled={profileChangesPage===1} onClick={()=>setProfileChangesPage(value=>Math.max(1,value-1))}>이전</button><span>{profileChangesPage} / {totalPages}</span><button type="button" disabled={profileChangesPage===totalPages} onClick={()=>setProfileChangesPage(value=>Math.min(totalPages,value+1))}>다음</button></nav></>}</section>}
      {signalTab==='risk'&&<section id="member-panel-risk" role="tabpanel" aria-labelledby="member-tab-risk" className="member-signal-panel"><h3>신고·차단 집중 사용자</h3><p className="member-search-help">최근 기록 최대 20건 · 신호만으로 회원 상태를 변경하지 않아요.</p>{isLoading?<p role="status">위험 계정 기록을 불러오고 있어요…</p>:failures.includes('위험 계정')?<p className="member-empty">위험 계정 조회 실패</p>:!riskUsers.length?<p className="member-empty">현재 표시할 위험 계정이 없습니다.</p>:<ul className="member-signal-list">{riskUsers.map(item=><li key={item.username}><div className="member-signal-main">{account(item)}<p>신고 {formatNumber(item.reportCount)}건 · 차단 {formatNumber(item.blockedCount)}건{item.recentActivityLabel?' · '+item.recentActivityLabel:''}</p></div><div className="member-signal-meta"><span>{item.recommendedAction||'운영 검토 필요'}</span>{item.score!=null&&<span>점수 {item.score}</span>}</div></li>)}</ul>}</section>}
    </section>
  </PageLayout>;
}
function MemberTabs({label,items,selected,onSelect}){return <div role="tablist" aria-label={label} className="member-tabs">{items.map(([key,title],index)=><button key={key} id={'member-tab-'+key} type="button" role="tab" aria-selected={selected===key} aria-controls={'member-panel-'+key} tabIndex={selected===key?0:-1} onClick={()=>onSelect(key)} onKeyDown={event=>{const next={ArrowRight:(index+1)%items.length,ArrowLeft:(index+items.length-1)%items.length,Home:0,End:items.length-1}[event.key];if(next!==undefined){event.preventDefault();onSelect(items[next][0]);document.getElementById('member-tab-'+items[next][0])?.focus();}}}>{title}</button>)}</div>;}
export default MemberMonitoring;
