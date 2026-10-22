import React, {useEffect,useState} from "react";
import {getClientErrorOccurrences} from "../api/clientErrorOccurrencesApi";
import {errorTime} from "../pages/apiClientErrors";
const clients={IOS:"iOS",ANDROID:"Android",WEB:"웹"};
export default function ApiClientErrorOccurrences({method,path}) {
  const [attempt,setAttempt]=useState(0);
  const [state,setState]=useState({loading:false,data:null,error:null});
  useEffect(()=> {
    if (!attempt) return undefined;
    const controller=new AbortController();
    setState({loading:true,data:null,error:null});
    getClientErrorOccurrences(method,path,controller.signal).then(data=> {
      if (!controller.signal.aborted) setState({loading:false,data,error:null});
    }).catch(()=> {
      if (!controller.signal.aborted) setState({loading:false,data:null,error:"발생 기록을 불러오지 못했어요. 다시 시도해 주세요."});
    });
    return ()=>controller.abort();
  },[method,path,attempt]);
  return <section aria-label="계정·메뉴별 발생 기록" className="api-error-occurrences">
    <div className="api-section-heading"><h4>어느 계정이 어떤 메뉴에서 실패했나요?</h4>
      <button type="button" className="api-text-button" disabled={state.loading} onClick={()=>setAttempt(value=>value+1)}>
        {state.loading?"확인 중…":attempt?"발생 기록 새로고침":"계정·메뉴별 발생 기록 보기"}</button></div>
    <p>요청 시작 화면과 서버가 인증한 계정을 표시합니다. 로그인 전·인증 만료는 계정 확인이 불가능할 수 있어요. 본문·비밀번호·검색어는 수집하지 않습니다.</p>
    {state.loading&&<p role="status">발생 기록을 불러오는 중이에요.</p>}
    {state.error&&<p role="alert">{state.error}</p>}
    {state.data&&<>
      {!state.data.rows.length?<p role="status">이 구간에는 계정·메뉴 상세 기록이 없습니다. 이전 버전에서 수집한 집계에는 상세 정보가 없을 수 있어요.</p>:
        <div className="api-registry-table"><table><caption>최근 24시간 구간 발생 기록 · 최대 50건</caption><thead><tr>
          <th scope="col">계정</th><th scope="col">요청 시작 메뉴</th><th scope="col">오류</th><th scope="col">기기</th><th scope="col">시각</th>
        </tr></thead><tbody>{state.data.rows.map(item=><tr key={item.eventId}>
          <td>{item.identity==="VERIFIED"&&item.username?<><strong>@{item.username}</strong><small>서버 인증 계정</small></>:"계정 확인 불가"}</td>
          <td>{item.screenLabel||"화면 정보 없음"}</td><td>{item.kind==="HTTP"?`HTTP ${item.status}`:item.kind==="TIMEOUT"?"시간 초과":"연결 실패"}</td>
          <td>{clients[item.client]||"미확인"}</td><td><time dateTime={item.occurredAt||item.receivedAt}>{errorTime(item.occurredAt||item.receivedAt)}</time>
            <small>{item.occurredAt?"요청 시작 · 기기 시각":"서버 수신 시각"}</small>
            {item.occurredAt&&<small>수신 {errorTime(item.receivedAt)}</small>}</td>
        </tr>)}</tbody></table></div>}
      {state.data.hasMore&&<p role="status">최신 50건만 표시하고 있어요. 전체 발생 수는 위 집계를 확인해 주세요.</p>}
      <p>새 수집 기능 적용 후의 기록만 상세 확인할 수 있으며, 기록은 7일 뒤 삭제됩니다.</p>
    </>}
  </section>;
}
