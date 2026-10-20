import React from 'react';
import {Link} from 'react-router-dom';

export function focusEvidence(id) {
  requestAnimationFrame(() => {
    const target=document.getElementById(id);
    target?.scrollIntoView?.({block:'nearest'});
    target?.focus?.({preventScroll:true});
  });
}
export function EvidenceFlow({stages,label,onSelect}) {
  return <div className="ops-flow" role="list" aria-label={label}>{stages.map((stage,index)=><React.Fragment key={stage.title}>
    {index>0&&<span className="ops-arrow" aria-hidden="true">→</span>}
    <div role="listitem" className={'ops-node ops-node--'+stage.state}><button type="button" className="ops-flow-action" onClick={()=>onSelect(stage,index)} aria-label={stage.title+' 근거 보기'}>
      <span className={'ops-state ops-state--'+stage.state}>{stage.state==='good'?'✓ 확인':stage.state==='bad'?'! 실패':stage.state==='warning'?'! 요청 확인':'· 확인 불가'}</span><strong>{stage.title}</strong><p>{stage.detail}</p><small>근거 보기 ↗</small>
    </button></div>
  </React.Fragment>)}</div>;
}
export function EvidenceHeader({title,children,onReset,backTo}) {
  return <div className="ops-evidence-heading"><div><h2>{title}</h2>{children&&<p className="ops-muted">{children}</p>}</div>{backTo?<Link to={backTo}>전체 보기 ←</Link>:onReset&&<button type="button" className="ops-link-button" onClick={onReset}>조건 초기화</button>}</div>;
}
export function runtimeEvidence(snapshot,{failuresOnly=false,api='',response=''}={}) {
  return (snapshot?.api?.runtimeMetrics||snapshot?.runtimeMetrics||[]).filter(row=>row.path?.startsWith('/api/')&&Number.isFinite(row.requestCount)&&row.requestCount>=0&&Number.isFinite(row.totalTimeMs)&&row.totalTimeMs>=0&&(!failuresOnly||Number(row.status)>=400)&&(!api||row.method+' '+row.path===api)&&(!response||String(row.status)===response));
}
export function RuntimeTable({rows}) {
  return rows.length?<div className="ops-table-wrap"><table className="ops-table"><caption>현재 프로세스 · 메서드·경로·응답 상태별 관측</caption><thead><tr><th>API</th><th>응답 상태</th><th>요청</th><th>평균 응답</th><th>연결</th></tr></thead><tbody>{rows.map((row,index)=><tr key={index}><td><code>{row.method} {row.path}</code></td><td>{row.status}</td><td>{row.requestCount.toLocaleString()}건</td><td>{row.requestCount?(row.totalTimeMs/row.requestCount).toFixed(1)+'ms':'기록 없음'}</td><td><Link to={'/admin/api-registry?api='+encodeURIComponent(row.method+' '+row.path)}>API 근거 →</Link></td></tr>)}</tbody></table></div>:<p className="ops-empty">선택 조건에 해당하는 서버 관측 기록이 없습니다.</p>;
}
