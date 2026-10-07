import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { fetchMyQna } from "../api/qnaApi";
import PageLayout from "../components/PageLayout";

export default function MyInquiries() {
  const { user } = useAuth();
  return <InquiryList key={user?.username} />;
}
function InquiryList() {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ content: [], hasNext: false });
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setBusy(true); setError("");
    fetchMyQna({ page }).then(response => {
      if (active) setResult(response?.data || response);
    }).catch(e => { if (active) setError(e.message || "문의 목록을 불러오지 못했습니다."); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [page, attempt]);
  return <PageLayout title="내 문의" description="현재 계정으로 접수한 문의와 답변을 확인하세요.">
    <div className="admin-actions"><Link to="/qna/private">새 비공개 문의</Link><button disabled={busy} onClick={() => setAttempt(v => v + 1)}>새로고침</button></div>
    <p>비로그인 상태에서 접수한 문의는 표시되지 않습니다. 접수 번호를 보관해 주세요.</p>
    {error && <p role="alert">{error}</p>}
    {busy ? <p role="status">문의를 불러오는 중입니다.</p> : !error && <section aria-label="내 문의 목록">
      {!result.content?.length && <p>아직 접수한 문의가 없습니다.</p>}
      {result.content?.map(item => <details key={item.qnaId} className="support-panel inquiry-record">
        <summary>#{item.qnaId} · {item.answer ? "답변 완료" : "답변 대기"} · {item.question?.slice(0, 80)}</summary>
        <h2>문의 내용</h2><p>{item.question}</p><h2>답변</h2><p>{item.answer || "아직 답변이 등록되지 않았습니다."}</p>
      </details>)}
    </section>}
    <div className="admin-actions"><button disabled={busy || page === 0} onClick={() => setPage(v => v - 1)}>이전</button><span>{page + 1} 페이지</span><button disabled={busy || !!error || !result.hasNext} onClick={() => setPage(v => v + 1)}>다음</button></div>
  </PageLayout>;
}
