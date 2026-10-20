import useActiveForm from "../components/useActiveForm";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import UnsavedChangesGuard from "../components/UnsavedChangesGuard";
import PageLayout from "../components/PageLayout";
import InquiryRetentionNotice from "../components/InquiryRetentionNotice";
import { useAuth } from "../auth/AuthContext";
import { createQna, fetchQna, updateQna } from "../api/qnaApi";
import "./support-workspace.css";

const initialForm = {
  authorName: "",
  email: "",
  category: "이용문의",
  question: "",
};

const initialAnswerDraft = {
  answer: "",
  statusCode: "reviewing",
  isPublic: true,
};

const initialQnaFilters = {
  category: "",
  statusCode: "",
};

const PAGE_SIZE = 10;

const qnaCategoryOptions = ["이용문의", "오류제보", "계정문의", "기타"];
const qnaStatusOptions = [
  { value: "received", label: "접수" },
  { value: "reviewing", label: "검토 중" },
  { value: "answered", label: "답변 완료" },
  { value: "hidden", label: "비공개" },
];

function getStatusLabel(statusCode) {
  switch (statusCode) {
    case "answered":
      return "답변 완료";
    case "reviewing":
      return "검토 중";
    case "received":
      return "접수";
    case "hidden":
      return "비공개";
    default:
      return statusCode || "접수";
  }
}

function getAuthorLabel(entry) {
  return entry.guestName || entry.username || "익명";
}

function getDateLabel(entry) {
  const updatedAt = entry.updatedAt || entry.createdAt;

  if (!updatedAt) {
    return "-";
  }

  return String(updatedAt).slice(0, 10);
}

function getAnswerAuthor(entry) {
  return (
    entry.answeredBy ||
    entry.answerAuthorName ||
    entry.answerUsername ||
    entry.answeredByName ||
    (entry.answer ? "운영팀" : "")
  );
}

function normalizeEntries(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.content)) {
    return response.content;
  }

  return [];
}

function mergeUniqueById(currentItems, nextItems, key) {
  const seen = new Set();
  return [...currentItems, ...nextItems].filter((item) => {
    const value = item?.[key];

    if (!value) {
      return true;
    }

    if (seen.has(value)) {
      return false;
    }

    seen.add(value);
    return true;
  });
}

function normalizeQnaPage(response, fallbackPage = 0) {
  const content = normalizeEntries(response);

  if (Array.isArray(response)) {
    return {
      content,
      page: fallbackPage,
      size: PAGE_SIZE,
      totalElements: content.length,
      totalPages: content.length > 0 ? 1 : 0,
      hasNext: false,
    };
  }

  const responsePage = response?.page ?? fallbackPage;
  const responseTotalPages = response?.totalPages ?? (content.length > 0 ? 1 : 0);

  return {
    content,
    page: responsePage,
    size: response?.size ?? PAGE_SIZE,
    totalElements: response?.totalElements ?? content.length,
    totalPages: responseTotalPages,
    hasNext: response?.hasNext ?? responsePage + 1 < responseTotalPages,
  };
}

function isPublicQnaEntry(entry) {
  return entry?.isPublic !== false && entry?.statusCode !== "hidden";
}

function QnAWrite() {
  const { user } = useAuth();
  return <QnaWriteForm key={user?.username || "guest"} />;
}

function QnaWriteForm() {
  const {active} = useActiveForm();
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState(() => ({
    ...initialForm,
    authorName: user?.displayName || user?.username || "",
  }));
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm(ask = true) {
    if (ask && form.question && !window.confirm("입력한 질문을 지울까요?")) return;
    setForm({
      ...initialForm,
      authorName: user?.displayName || user?.username || "",
    });
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSubmitMessage("");

    const question = form.question.trim();
    const guestName = form.authorName.trim();
    const guestEmail = form.email.trim();

    if (!question) {
      setSubmitMessage("질문 내용을 입력해 주세요.");
      return;
    }

    if (!isAuthenticated && !guestName && !guestEmail) {
      setSubmitMessage("비로그인 사용자는 작성자명 또는 이메일을 입력해 주세요.");
      return;
    }

    const payload = {
      category: form.category,
      question,
      isPublic: true,
    };

    if (guestEmail) {
      payload.guestEmail = guestEmail;
    }

    if (!isAuthenticated && guestName) {
      payload.guestName = guestName;
    }

    setIsSubmitting(true);

    try {
      await createQna(payload);
      if (!active.current) return;
      setSubmitMessage("질문이 접수되었습니다. 운영팀 답변 후 공개 질문·답변 목록에서 확인할 수 있습니다.");
      resetForm(false);
    } catch (error) {
      if (!active.current) return;
      setSubmitMessage(error.message || "질문 등록에 실패했습니다.");
    } finally {
      if (active.current) setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      title="공개 질문 등록"
      className="support-page support-page--qna support-page--qna-write"
      description="공개되어도 괜찮은 질문만 남겨 주세요. 다른 사용자에게도 도움이 되는 답변으로 정리됩니다."
    >
      <div className="stack-layout">
        <UnsavedChangesGuard pending={isSubmitting} when={!!form.question.trim() && !isSubmitting} />
        <section className="support-panel qna-compose-panel qna-compose-panel--page">
          <form className="admin-form" onSubmit={handleCreate}>
            <div className="api-status qna-scope-notice" role="note">
              다른 사용자도 볼 수 있는 질문입니다. 계정·연락처 등 개인 정보가 필요한 내용은 <Link to="/qna/private">비공개 문의</Link>로 남겨 주세요.
            </div>

            <div className="admin-inline-fields">
              <label className="admin-field">
                <span>작성자명</span>
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(event) => updateField("authorName", event.target.value)}
                  placeholder={isAuthenticated ? "표시 이름 입력" : "이름 또는 닉네임"}
                />
                {!isAuthenticated ? (
                  <small className="restaurant-field-hint">
                    작성자명 또는 이메일 중 하나를 입력해 주세요.
                  </small>
                ) : null}
              </label>

              <label className="admin-field">
                <span>답변 받을 이메일</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="답변 알림이 필요하면 입력"
                />
                <small className="restaurant-field-hint">
                  이메일은 공개 목록에 표시되지 않습니다.
                </small>
              </label>
            </div>

            <label className="admin-field qna-category-field">
              <span>문의 유형</span>
              <select
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
              >
                <option value="이용문의">이용문의</option>
                <option value="오류제보">오류제보</option>
                <option value="기타">기타</option>
              </select>
            </label>

            <label className="admin-field">
              <span>질문 내용</span>
              <textarea
                rows={7}
                value={form.question}
                onChange={(event) => updateField("question", event.target.value)}
                placeholder="공개되어도 괜찮은 문의 내용을 남겨 주세요."
              />
              <small className="restaurant-field-hint">
                개인정보가 포함된 문의는 공개 질문·답변에 남기지 말아 주세요.
              </small>
            </label>

            {submitMessage ? (
              <div
                className={
                  submitMessage.includes("접수")
                    ? "api-status api-status--success"
                    : "api-status api-status--error"
                }
              >
                {submitMessage}
              </div>
            ) : null}

            <div className="admin-actions qna-write-actions">
              <button type="submit" className="button-primary" disabled={isSubmitting}>
                {isSubmitting ? "등록 중..." : "질문 등록"}
              </button>
              <button type="button" onClick={() => resetForm()} disabled={isSubmitting}>
                입력 초기화
              </button>
              <Link className="support-page-action support-page-action--secondary" to="/qna">
                목록으로 돌아가기
              </Link>
              <Link className="support-page-action support-page-action--secondary" to="/qna/private">
                비공개 1:1 문의로 전환
              </Link>
            </div>
          </form>
        </section>
      </div>
    </PageLayout>
  );
}

function QnA({ adminMode = false }) {
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const detailRef = useRef(null);
  const detailHeadingRef = useRef(null);
  const listRequest = useRef(0);
  const [qnaPage, setQnaPage] = useState({
    content: [],
    page: 0,
    size: PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  });
  const [filters, setFilters] = useState(initialQnaFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialQnaFilters);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQnaId, setSelectedQnaId] = useState(null);
  const [answerDraft, setAnswerDraft] = useState(initialAnswerDraft);

  const loadEntries = useCallback(async ({ page = 0, append = false } = {}) => {
    const request = ++listRequest.current;
    setIsLoading(true);
    setLoadError("");

    if (!append) {
      setQnaPage({
        content: [],
        page: 0,
        size: PAGE_SIZE,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
      });
    }

    try {
      const response = await fetchQna({
        page,
        size: PAGE_SIZE,
        category: appliedFilters.category,
        statusCode: appliedFilters.statusCode,
        adminMode,
      });
      if (request !== listRequest.current) return;
      const nextPage = normalizeQnaPage(response, page);

      setQnaPage((current) => ({
        ...nextPage,
        content: append
          ? mergeUniqueById(current.content, nextPage.content, "qnaId")
          : nextPage.content,
      }));

      if (!append) {
        setSelectedQnaId((current) =>
          nextPage.content.some((entry) => entry.qnaId === current)
            ? current
            : nextPage.content[0]?.qnaId || null
        );
      }
    } catch (error) {
      if (request !== listRequest.current) return;
      if (!append) {
        setQnaPage({
          content: [],
          page: 0,
          size: PAGE_SIZE,
          totalElements: 0,
          totalPages: 0,
          hasNext: false,
        });
        setSelectedQnaId(null);
      }
      setLoadError("Q&A 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      if (request === listRequest.current) setIsLoading(false);
    }
  }, [appliedFilters, adminMode]);

  useEffect(() => {
    loadEntries();
    return () => { listRequest.current += 1; };
  }, [loadEntries]);

  const entries = qnaPage.content;
  const visibleEntries = adminMode ? entries : entries.filter(isPublicQnaEntry);
  const visibleTotalElements =
    adminMode || visibleEntries.length === entries.length
      ? qnaPage.totalElements
      : visibleEntries.length;
  const selectedEntry = useMemo(() => {
    const entry = entries.find((item) => item.qnaId === selectedQnaId) || (adminMode ? null : entries[0]) || null;
    if (adminMode && appliedSearch && entry && ![entry.question,entry.username,entry.guestName,entry.category].filter(Boolean).join(" ").toLocaleLowerCase().includes(appliedSearch.toLocaleLowerCase())) return null;
    return entry;
  }, [entries, selectedQnaId, adminMode, appliedSearch]);
  const qnaResultCaption = getQnaFilterSummary(appliedFilters);

  useEffect(() => {
    if (!adminMode || !selectedEntry) {
      return;
    }

    setAnswerDraft({
      answer: selectedEntry.answer || "",
      statusCode: selectedEntry.statusCode || "reviewing",
      isPublic: selectedEntry.isPublic ?? true,
    });
  }, [adminMode, selectedEntry]);

  const answerDirty = adminMode && Boolean(selectedEntry) && (
    answerDraft.answer !== (selectedEntry.answer || "") ||
    answerDraft.statusCode !== (selectedEntry.statusCode || "reviewing") ||
    answerDraft.isPublic !== (selectedEntry.isPublic ?? true)
  );
  const matchesSearch = entry => !appliedSearch || [entry.question, entry.username, entry.guestName, entry.category].filter(Boolean).join(" ").toLocaleLowerCase().includes(appliedSearch.toLocaleLowerCase());
  const workspaceEntries = entries.filter(matchesSearch);
  function allowWorkspaceChange() {
    if (isSubmitting) return false;
    return !answerDirty || window.confirm("저장하지 않은 답변이 있어요. 내용을 버리고 이동할까요?");
  }
  function focusQuestionDetail() {
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView?.({block:"nearest"});
      detailHeadingRef.current?.focus({preventScroll:true});
    });
  }
  function selectQuestion(id) {
    if (isSubmitting) return;
    if (id === selectedQnaId) { focusQuestionDetail(); return; }
    if (!allowWorkspaceChange()) return;
    setSelectedQnaId(id);
    setSubmitMessage("");
    focusQuestionDetail();
  }
  function quickStatus(statusCode) {
    if (!allowWorkspaceChange()) return;
    setFilters(current=>({...current,statusCode}));
    setAppliedFilters(current=>({...current,statusCode}));
    setSearchText("");setAppliedSearch("");
  }

  function updateQnaFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    if (adminMode && !allowWorkspaceChange()) return;
    setAppliedFilters(filters);
    if (adminMode) {
      const query=searchText.trim();setAppliedSearch(query);
      const matches=entries.filter(entry=>!query||[entry.question,entry.username,entry.guestName,entry.category].filter(Boolean).join(" ").toLocaleLowerCase().includes(query.toLocaleLowerCase()));
      setSelectedQnaId(matches[0]?.qnaId||null);
    }
  }

  function resetFilters() {
    if (adminMode && !allowWorkspaceChange()) return;
    setSearchText("");setAppliedSearch("");
    setFilters(initialQnaFilters);
    setAppliedFilters(initialQnaFilters);
  }

  function handleLoadMoreQna() {
    loadEntries({
      page: (qnaPage.page ?? 0) + 1,
      append: true,
    });
  }

  async function handleAnswerSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitMessage("");

    if (!selectedEntry?.qnaId) {
      setSubmitMessage("답변할 질문을 먼저 선택해 주세요.");
      return;
    }

    if (!answerDraft.answer.trim()) {
      setSubmitMessage("답변 내용을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);

    try {
      await updateQna(selectedEntry.qnaId, {
        answer: answerDraft.answer.trim(),
        statusCode: answerDraft.statusCode,
        isPublic: answerDraft.isPublic,
      }, adminMode);
      setSubmitMessage("답변이 저장되었습니다.");
      await loadEntries();
      setSelectedQnaId(selectedEntry.qnaId);
    } catch (error) {
      setSubmitMessage(error.message || "답변 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (adminMode) {
    return <PageLayout title="문의 답변" className="support-workspace" description="기다리는 질문을 찾고, 한 건씩 답변을 마무리하세요.">
      <UnsavedChangesGuard when={answerDirty} pending={isSubmitting}/>
      <div className="sw-topline"><p><strong>{qnaPage.totalElements.toLocaleString()}건</strong> 조회 결과 · {entries.length}건 불러옴</p><span>문의 내용과 연락처는 운영자에게만 보여요.</span></div>
      <div className="sw-status-bar" aria-label="문의 상태 바로 찾기">
        {[{value:"",label:"전체"},...qnaStatusOptions].map(status=><button type="button" key={status.value} aria-pressed={appliedFilters.statusCode===status.value} disabled={isSubmitting} onClick={()=>quickStatus(status.value)}>{status.label}</button>)}
      </div>
      <form className="sw-filters" onSubmit={handleFilterSubmit}>
        <label><span>불러온 문의에서 검색</span><input type="search" value={searchText} onChange={event=>setSearchText(event.target.value)} placeholder="질문 내용, 작성자" disabled={isSubmitting}/></label>
        <label><span>문의 유형</span><select value={filters.category} onChange={event=>updateQnaFilter("category",event.target.value)} disabled={isSubmitting}><option value="">모든 유형</option>{qnaCategoryOptions.map(category=><option key={category} value={category}>{category}</option>)}</select></label>
        <div className="sw-filter-actions"><button type="button" onClick={resetFilters} disabled={isSubmitting}>초기화</button><button type="submit" className="button-primary" disabled={isSubmitting}>조회</button></div>
      </form>
      {loadError&&<div className="api-status api-status--error" role="alert"><span>{loadError}</span><button type="button" onClick={()=>{if(allowWorkspaceChange())loadEntries();}} disabled={isLoading||isSubmitting}>다시 시도</button></div>}
      {submitMessage&&<div className={'api-status '+(submitMessage==='답변이 저장되었습니다.'?'api-status--success':'api-status--error')} role="status">{submitMessage}</div>}
      <div className="sw-columns">
        <section className="sw-list" aria-label="문의 목록"><div className="sw-panel-heading"><h2>받은 문의</h2><span>{workspaceEntries.length}건 표시</span></div>
          <p className="sw-list-hint">{appliedSearch?'불러온 목록 안에서 검색한 결과예요.':'상태를 눌러 접수·검토 중인 문의를 찾으세요.'}</p>
          {isLoading&&!entries.length?<p className="sw-empty" role="status">문의 목록을 불러오고 있어요.</p>:!workspaceEntries.length?<p className="sw-empty">조건에 맞는 문의가 없어요.</p>:<ul>{workspaceEntries.map(entry=><li key={entry.qnaId}><button type="button" className="sw-list-item" aria-current={selectedQnaId===entry.qnaId?'true':undefined} disabled={isSubmitting} onClick={()=>selectQuestion(entry.qnaId)}><span className="sw-item-meta"><span className={'sw-status sw-status--'+(entry.statusCode||'received')}>{getStatusLabel(entry.statusCode)}</span><time>{getDateLabel(entry)}</time></span><strong>{entry.question}</strong><span className="sw-item-caption">{entry.category||'미분류'} · {getAuthorLabel(entry)}{entry.isPublic===false?' · 비공개':''}</span><span className="sw-item-arrow" aria-hidden="true">→</span></button></li>)}</ul>}
          {qnaPage.hasNext&&<button type="button" className="sw-more" onClick={handleLoadMoreQna} disabled={isLoading||isSubmitting}>{isLoading?'불러오는 중...':'Q&A 더 보기'}</button>}
        </section>
        <section className="sw-detail" aria-label="선택한 문의" ref={detailRef}>
          {selectedEntry?<><div className="sw-panel-heading"><h2 ref={detailHeadingRef} tabIndex={-1}>문의 상세</h2><span className={'sw-status sw-status--'+(selectedEntry.statusCode||'received')}>{getStatusLabel(selectedEntry.statusCode)}</span></div>
            <p className="sw-question">{selectedEntry.question}</p>
            <dl className="sw-facts"><div><dt>질문자</dt><dd>{getAuthorLabel(selectedEntry)}</dd></div><div><dt>문의 유형</dt><dd>{selectedEntry.category||'-'}</dd></div><div><dt>답변 이메일</dt><dd>{selectedEntry.guestEmail||'등록된 이메일 없음'}</dd></div><div><dt>최근 수정</dt><dd>{getDateLabel(selectedEntry)}</dd></div></dl>
            <InquiryRetentionNotice entry={selectedEntry}/>
            <form className="sw-editor admin-form" onSubmit={handleAnswerSubmit}><fieldset disabled={isSubmitting}><legend>답변 작성</legend>
              <label className="admin-field"><span>답변 내용</span><textarea rows={8} value={answerDraft.answer} onChange={event=>setAnswerDraft(current=>({...current,answer:event.target.value}))} placeholder="사용자에게 전달할 답변을 작성해 주세요."/></label>
              <div className="sw-editor-options"><label className="admin-field"><span>처리 상태</span><select value={answerDraft.statusCode} onChange={event=>setAnswerDraft(current=>({...current,statusCode:event.target.value}))}>{qnaStatusOptions.map(status=><option key={status.value} value={status.value}>{status.label}</option>)}</select></label><label className="admin-toggle"><input type="checkbox" checked={answerDraft.isPublic} onChange={event=>setAnswerDraft(current=>({...current,isPublic:event.target.checked}))}/><span>공개 답변</span></label></div>
              <div className="sw-save-bar"><span>{answerDirty?'저장하지 않은 변경 내용이 있어요.':'저장하면 선택한 문의에 반영돼요.'}</span><button type="submit" className="button-primary" disabled={isSubmitting}>{isSubmitting?'저장 중...':'답변 저장'}</button></div>
            </fieldset></form>
          </>:<p className="sw-empty">목록에서 답변할 문의를 선택해 주세요.</p>}
        </section>
      </div>
    </PageLayout>;
  }

  return (
    <PageLayout
      title="공개 질문·답변"
      className="support-page support-page--qna"
      description="다른 사용자의 질문과 운영팀 답변을 먼저 확인할 수 있습니다."
    >
      <div className="stack-layout">
        <section className="support-panel qna-scope-panel">
          <div className="support-panel__header">
            <span className="support-kicker">공개 범위</span>
            <h2>공개되어도 괜찮은 질문만 남겨 주세요.</h2>
          </div>
          <p className="page-layout__description">
            계정, 연락처, 결제, 사업자 정보처럼 개인 확인이 필요한 내용은 공개 질문·답변에 포함하지 마세요.
            개인 확인이 필요한 문의는 1:1 비공개 문의로 접수할 수 있습니다.
          </p>
          <div className="support-panel__actions">
            <Link className="support-page-action support-page-action--secondary" to="/qna/private">
              비공개 1:1 문의로 이동
            </Link>
          </div>
        </section>

        <QnaFilterPanel
          filters={filters}
          onChange={updateQnaFilter}
          onSubmit={handleFilterSubmit}
          onReset={resetFilters}
          includeHidden={false}
        />

        <div className="faq-topline qna-list-topline">
          <div className="qna-list-topline__copy">
            <strong>
              전체 {visibleTotalElements}건 중 {visibleEntries.length}건 표시
            </strong>
            <span>{qnaResultCaption}</span>
          </div>
          <div className="qna-list-topline__actions">
            <Link className="support-page-action support-page-action--primary" to="/qna/new">
              질문 등록
            </Link>
            <Link className="support-page-action support-page-action--secondary" to="/qna/private">
              비공개 1:1 문의
            </Link>
          </div>
        </div>

        {loadError ? (
          <div className="api-status api-status--error" role="alert">
            <span>{loadError}</span>
            <button type="button" onClick={() => loadEntries()} disabled={isLoading}>
              다시 시도
            </button>
          </div>
        ) : null}

        <section className="board-table qna-public-board" aria-label="공개 질문·답변 목록">
          <div className="board-table__head qna-public-board__head">
            <span>상태</span>
            <span>질문</span>
            <span>문의 유형</span>
            <span>작성자</span>
            <span>작성일</span>
          </div>

          <div className="board-table__body">
            {isLoading && visibleEntries.length === 0 ? (
              <div className="board-empty">Q&A 목록을 불러오는 중입니다.</div>
            ) : visibleEntries.length === 0 ? (
              <div className="board-empty">아직 공개 질문이 없습니다.</div>
            ) : (
              visibleEntries.map((entry) => {
                const answerAuthor = getAnswerAuthor(entry);

                return (
                  <details key={entry.qnaId} className="board-row qna-public-row">
                    <summary className="board-row__summary qna-public-row__summary">
                      <span className="board-badge">{getStatusLabel(entry.statusCode)}</span>
                      <span className="board-row__title qna-public-row__title">{entry.question}</span>
                      <span className="board-row__meta" data-label="문의 유형">
                        {entry.category || "-"}
                      </span>
                      <span className="board-row__meta" data-label="작성자">
                        {getAuthorLabel(entry)}
                      </span>
                      <span className="board-row__meta" data-label="작성일">
                        {getDateLabel(entry)}
                      </span>
                    </summary>

                    <div className="board-row__content qna-public-row__content">
                      <span className="board-row__answer-label">답변</span>
                      <div className="board-row__body">
                        {entry.answer ? (
                          <div className="qna-answer qna-answer--inline">
                            <div className="qna-answer__header">
                              <span className="qna-answer__badge">답변</span>
                              <span className="qna-answer__author">
                                {answerAuthor ? `${answerAuthor} 답변` : "운영팀 답변"}
                              </span>
                            </div>
                            <p>{entry.answer}</p>
                          </div>
                        ) : (
                          <div className="qna-answer qna-answer--pending qna-answer--inline">
                            <div className="qna-answer__header">
                              <span className="qna-answer__badge">답변 대기</span>
                            </div>
                            <p>아직 답변이 등록되지 않았습니다.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </details>
                );
              })
            )}
          </div>

          {qnaPage.hasNext ? (
            <div className="list-more-actions">
              <button type="button" onClick={handleLoadMoreQna} disabled={isLoading}>
                {isLoading ? "불러오는 중..." : "Q&A 더 보기"}
              </button>
            </div>
          ) : null}
        </section>

      </div>
    </PageLayout>
  );
}

function QnaFilterPanel({ filters, onChange, onSubmit, onReset, includeHidden = true }) {
  const visibleStatusOptions = includeHidden
    ? qnaStatusOptions
    : qnaStatusOptions.filter((status) => status.value !== "hidden");

  return (
    <form className="restaurant-filter-form qna-filter-form" onSubmit={onSubmit}>
      <label className="admin-field">
        <span>문의 유형</span>
        <select
          value={filters.category}
          onChange={(event) => onChange("category", event.target.value)}
        >
          <option value="">전체</option>
          {qnaCategoryOptions.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </label>

      <label className="admin-field">
        <span>상태</span>
        <select
          value={filters.statusCode}
          onChange={(event) => onChange("statusCode", event.target.value)}
        >
          <option value="">전체</option>
          {visibleStatusOptions.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <div className="admin-actions restaurant-filter-actions">
        <button type="button" onClick={onReset}>
          초기화
        </button>
        <button type="submit" className="button-primary">
          조회
        </button>
      </div>
    </form>
  );
}

function getQnaFilterSummary(filters) {
  const summary = [];

  if (filters.category) {
    summary.push(`문의 유형: ${filters.category}`);
  }

  if (filters.statusCode) {
    summary.push(`상태: ${getStatusLabel(filters.statusCode)}`);
  }

  return summary.length > 0 ? summary.join(" · ") : "전체 공개 질문·답변을 보고 있습니다.";
}

export { QnAWrite };
export default QnA;
