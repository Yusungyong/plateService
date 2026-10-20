import React from 'react';
import {label,time} from './marketingModel';

export function MarketingListFilter({title,state,onChange,total,count,states,onReset}){
 return <div className="mk-drilldown-filter"><label>{title}<select value={state} onChange={e=>onChange(e.target.value)}><option value="">전체 상태</option>{states.map(value=><option key={value} value={value}>{label(value)}</option>)}</select></label><p>조회된 최근 {total}건 중 <strong>{count}건</strong> · 전체 누적 건수와 별개</p><button type="button" className="mk-action" onClick={onReset}>조건 초기화</button></div>;
}
export function MarketingUnknownEvidence({data,onNavigate,onReset}){
 const jobs=data.queue.jobs.filter(row=>row.status==='UNKNOWN'),posts=data.publishing.posts.filter(row=>row.state==='UNKNOWN');
 return <section className="mk-card mk-evidence" id="mk-unknown-evidence" tabIndex={-1} aria-label="결과 확인 필요 근거"><div className="mk-section-heading"><div><h3>결과 확인 필요 · {jobs.length+posts.length}건</h3><p>최근 조회한 생성 작업 {jobs.length}건 + 게시 {posts.length}건입니다. 클릭하면 해당 기록만 확인해요.</p></div><button type="button" className="mk-action" onClick={onReset}>요약으로 돌아가기</button></div>
 {jobs.map(row=><button type="button" className="mk-evidence-row" key={'job-'+row.id} onClick={()=>onNavigate('queue',{state:'UNKNOWN',entry:row.id})}><span><strong>제작 · {row.job_key}</strong><small>{time(row.not_before)} · 모델 시작 {row.started_at?'기록 있음':'기록 없음'}</small></span><span>작업 기록 →</span></button>)}
 {posts.map(row=><button type="button" className="mk-evidence-row" key={'post-'+row.id} onClick={()=>onNavigate('posts',{state:'UNKNOWN',entry:row.id})}><span><strong>게시 · {row.title}</strong><small>{row.channel==='WEBSITE'?'접시 웹':'Instagram'} · {time(row.due_at)}</small></span><span>게시 기록 →</span></button>)}
 {!jobs.length&&!posts.length&&<p className="mk-empty">최근 조회 목록에 결과 미확인 기록이 없어요.</p>}
 <p className="mk-muted">목록을 열어도 재생성·재게시하지 않아요. 기존 복구 작업에는 확인 절차가 적용돼요.</p></section>;
}

export function MarketingMeasurementEvidence({group,field,onReset}){
 if(!group)return null;
 const titles={verified_signups:'확인된 가입',mature_cohort:'7일 관찰 완료',first_record_within_7_days:'관찰된 첫 기록',firstRecordRate:'관찰된 첫 기록 비율'};
 return <section className="mk-card mk-evidence" aria-label="성과 집계 근거"><div className="mk-section-heading"><h3>{titles[field]||'성과'} · {group.variant} · {group.channel}</h3><button type="button" className="mk-action" onClick={onReset}>근거 닫기</button></div><p>선택한 캠페인·안·채널에 대해 서버가 반환한 동일 그룹의 집계입니다.</p><dl className="mk-facts">{Object.entries(titles).map(([key,title])=><div key={key}><dt>{title}</dt><dd>{group[key]==null?'확인 불가':key==='firstRecordRate'?(group[key]*100).toFixed(1)+'%':group[key]}</dd></div>)}</dl><p className="mk-muted">선택 동의 및 연결이 확인된 범위이며 전체 설치자 수가 아닙니다. 개인별 가입·행동 명단은 이 조회 API에 제공되지 않아요. 표본 판단: {group.decision==='INSUFFICIENT_SAMPLE'?'표본 부족':group.decision==='DESCRIPTIVE_ONLY'?'관찰값 비교':'관찰 조건 확인 필요'}.</p></section>;
}
