import React, {useEffect, useRef, useState} from "react";
import {apiClient} from "../api";
// Enable only with the backend/app consent rollout. A disabled catalog never activates an age policy.
export default function useSignupConsent() {
  const configured = process.env.REACT_APP_LEGAL_CONSENT_WEB === "true";
  const [catalog,setCatalog]=useState(null), [loading,setLoading]=useState(configured), [error,setError]=useState("");
  const [choices,setChoices]=useState({}), [age,setAge]=useState(false), [attempt,setAttempt]=useState(0);
  const submission=useRef(null);
  useEffect(()=>{
    if (!configured) return;
    let active=true; setLoading(true); setError(""); setCatalog(null); setChoices({}); setAge(false);
    apiClient.get("/api/legal/consent-catalog",{withAuth:false}).then(response=>{
      const next=response?.data || response;
      if (typeof next?.enabled !== "boolean" || (next.enabled && (!Array.isArray(next.documents) || !next.documents.length || !Number.isInteger(next.catalogRevision) || !Number.isInteger(next.minimumAge) || next.documents.some(doc=>!doc.documentId || !doc.version || !doc.sha256 || typeof doc.body !== "string" || !["ACCEPT","NOTICE","CONSENT"].includes(doc.actionType))))) throw new Error("가입 안내를 확인하지 못했습니다.");
      if(active)setCatalog(next);
    }).catch(()=>{if(active)setError("가입 조건을 불러오지 못했습니다. 다시 시도해 주세요.");}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[configured,attempt]);
  const enabled=Boolean(catalog?.enabled);
  function acceptance(form) {
    if (loading || error) throw new Error("가입 조건을 먼저 확인해 주세요.");
    if (!enabled) return undefined;
    if (!age || catalog.documents.some(doc=>doc.required && !choices[doc.documentId])) throw new Error("가입 연령과 필수 문서 확인이 필요합니다.");
    const decisions=catalog.documents.map(doc=>({documentId:doc.documentId,version:doc.version,sha256:doc.sha256,decision:choices[doc.documentId]?(doc.actionType==="NOTICE"?"ACKNOWLEDGED":"ACCEPTED"):"DECLINED"}));
    const signature=JSON.stringify({form,decisions,catalogRevision:catalog.catalogRevision});
    if(submission.current?.signature!==signature) submission.current={signature,key:crypto.randomUUID()};
    return {catalogRevision:catalog.catalogRevision,expectedRevision:0,minimumAgeConfirmed:true,decisions,idempotencyKey:submission.current.key};
  }
  const content=<section aria-label="가입 조건 확인">
    {loading && <p role="status">가입 조건을 불러오는 중입니다.</p>}
    {error && <p role="alert">{error} <button type="button" onClick={()=>setAttempt(value=>value+1)}>다시 시도</button></p>}
    {enabled && <><label className="admin-toggle"><input type="checkbox" checked={age} onChange={event=>setAge(event.target.checked)}/>만 {catalog.minimumAge}세 이상입니다.</label>{catalog.documents.map(doc=><div key={doc.documentId} className="consent-document"><details><summary>{doc.title} · {doc.version} 전문 보기</summary><div style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{doc.body}</div></details><label className="admin-toggle"><input type="checkbox" checked={!!choices[doc.documentId]} onChange={event=>setChoices(current=>({...current,[doc.documentId]:event.target.checked}))}/>{doc.required?"필수":"선택"} · {doc.title}{doc.actionType==="NOTICE"?"을 확인했습니다.":"에 동의합니다."}</label></div>)}</>}
  </section>;
  return {enabled,loading,error,content,acceptance,reload:()=>setAttempt(value=>value+1)};
}
