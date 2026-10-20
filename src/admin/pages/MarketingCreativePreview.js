import React, {useState} from 'react';
import {label, time} from './marketingModel';

export default function MarketingCreativePreview({detail, actions}) {
  const [variant, setVariant] = useState('a');
  const [compare, setCompare] = useState(false);
  const [history, setHistory] = useState(false);
  const production=detail.production, latest=production.versions.at(-1), copies=latest.package.content.variants;
  const displayed=compare?copies:copies.filter(copy=>copy.id===variant);
  const records=[...(production.reviews||[]).map((r,i)=>({key:'review-'+i,at:r.at,title:r.decision==='APPROVE'?'검토 승인':'수정 필요',reason:r.reason})),...(production.contentRequests||[]).map(r=>({key:r.key,at:r.at,title:'문구 수정 '+(r.state==='APPLIED'?'반영':r.state==='CANCELLED'?'취소':'대기'),reason:r.reason}))].sort((a,b)=>Date.parse(b.at)-Date.parse(a.at));
  return <section className="mk-creative-workspace" aria-label="선택한 제작물">
    <div className="mk-creative-heading"><div><span className="mk-eyebrow">선택한 제작물</span><h3>{copies.find(copy=>copy.id===variant)?.headline||'홍보 카드'}</h3></div>
      <span className={'mk-state '+(detail.effectiveState==='READY_FOR_PUBLISHING'?'mk-state--good':'')}>{label(detail.effectiveState)}</span></div>
    <div className="mk-preview-controls"><div className="mk-segment" aria-label="홍보 카드 안 선택">
      {copies.map(copy=><button key={copy.id} type="button" aria-pressed={!compare&&variant===copy.id} onClick={()=>{setCompare(false);setVariant(copy.id);}}>{copy.id.toUpperCase()}안</button>)}
      <button type="button" aria-pressed={compare} onClick={()=>setCompare(true)}>나란히 비교</button></div>
      <button type="button" className="mk-text-button" aria-expanded={history} aria-controls="mk-creative-history" onClick={()=>setHistory(!history)}>변경·검토 기록 {records.length} <span aria-hidden="true">{history?'−':'+'}</span></button>
    </div>
    {history && <section id="mk-creative-history" className="mk-creative-history"><h4>변경·검토 기록</h4><p className="mk-muted">현재 수정 버전 {production.versions.length} · 카드에는 최신 버전을 표시해요.</p>{records.length?records.map(r=><div className="mk-history-item" key={r.key}><span>{time(r.at)}</span><strong>{r.title}</strong><p>{r.reason}</p></div>):<p>아직 변경·검토 기록이 없어요.</p>}</section>}
    {detail.effectiveState==='CONTENT_EDIT_REQUESTED'&&<p className="mk-alert">수정 요청을 저장했어요. Mac 동기화 후 새 카드를 검토해 주세요.</p>}
    <div className={'mk-preview-stage '+(compare?'is-comparing':'')}>
      {displayed.map(copy=><article className="mk-preview-variant" key={copy.id}>
        <div className="mk-image-stage">{detail.previews[copy.id]?<img className="mk-preview" src={detail.previews[copy.id]} alt={'현재 '+copy.id.toUpperCase()+'안 홍보 카드'}/>:<div className="mk-preview-empty">{detail.previews[copy.id+'Error']||'완성 카드 미리보기 동기화가 필요해요.'}</div>}</div>
        <div className="mk-creative-copy"><span className="mk-eyebrow">{copy.id.toUpperCase()}안 · 이미지 카드</span><h4>{copy.headline}</h4><p>{copy.support}</p><details><summary>게시 문구 보기</summary><p className="mk-copy">{copy.caption}</p></details><details><summary>영상 대본 보기 · {copy.script.reduce((seconds,scene)=>seconds+scene.durationSeconds,0)}초</summary><p className="mk-muted">영상 제작에 사용할 대본이에요. 완성 동영상은 아니에요.</p>{copy.script.map((s,i)=><p key={i}><strong>장면 {i+1} · {s.durationSeconds}초</strong><br/>{s.onScreen}<br/>{s.voiceover}</p>)}</details></div>
      </article>)}
    </div>
    <div className="mk-review-bar"><p><strong>카드를 확인하고 다음 단계로</strong><span>검토 승인은 A·B 두 안을 확인한 뒤 진행해요.</span></p><div className="mk-toolbar">{actions}</div></div>
  </section>;
}
