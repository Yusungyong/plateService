import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";
import { useAuth } from "../auth/AuthContext";
import { createQna, fetchQna, updateQna } from "../api/qnaApi";

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
  return entry.guestName || entry.username || "비로그인 사용자";
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

  function resetForm() {
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
      setSubmitMessage("질문이 접수되었습니다. 운영팀 답변 후 공개 Q&A 목록에서 확인할 수 있습니다.");
      resetForm();
    } catch (error) {
      setSubmitMessage(error.message || "질문 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      title="공개 질문 등록"
      className="support-page support-page--qna support-page--qna-write"
      description="공개되어도 괜찮은 질문만 남겨 주세요. 다른 사용자에게도 도움이 되는 답변으로 정리됩니다."
    >
      <div className="stack-layout">
        <section className="support-panel qna-scope-panel">
          <div className="support-panel__header">
            <span className="support-kicker">공개 범위</span>
            <h3>개인 확인이 필요한 내용은 등록하지 마세요.</h3>
          </div>
          <p className="page-layout__description">
            계정, 연락처, 결제, 사업자 정보처럼 개인 확인이 필요한 내용은 공개 Q&A에 포함하지 마세요.
            개인 확인이 필요한 문의는 1:1 비공개 문의로 접수할 수 있습니다.
          </p>
          <div className="support-panel__actions">
            <Link className="support-page-action support-page-action--secondary" to="/qna/private">
              1:1 문의로 이동
            </Link>
          </div>
        </section>

        <section className="support-panel qna-compose-panel qna-compose-panel--page">
          <div className="qna-compose-panel__summary">
            <span className="support-kicker">질문 남기기</span>
            <strong>공개 질문 등록</strong>
            <span>목록에서 답을 찾지 못했다면 공개되어도 괜찮은 질문을 남길 수 있습니다.</span>
          </div>

          <form className="admin-form" onSubmit={handleCreate}>
            <div className="api-status qna-scope-notice" role="note">
              공개 질문으로 등록됩니다. 답변 받을 이메일은 운영팀 확인과 답변 안내 목적으로만 사용되며 목록에는 표시되지 않습니다.
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
                <option value="계정문의">계정문의</option>
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
                개인정보가 포함된 문의는 공개 Q&A에 남기지 말아 주세요.
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
              <button type="button" onClick={resetForm} disabled={isSubmitting}>
                입력 초기화
              </button>
              <Link className="support-page-action support-page-action--secondary" to="/qna">
                목록으로 돌아가기
              </Link>
              <Link className="support-page-action support-page-action--secondary" to="/qna/private">
                1:1 문의로 전환
              </Link>
            </div>
          </form>
        </section>
      </div>
    </PageLayout>
  );
}

function QnA({ adminMode = false }) {
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
      });
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
      setIsLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const entries = qnaPage.content;
  const visibleEntries = adminMode ? entries : entries.filter(isPublicQnaEntry);
  const visibleTotalElements =
    adminMode || visibleEntries.length === entries.length
      ? qnaPage.totalElements
      : visibleEntries.length;
  const selectedEntry = useMemo(() => {
    return entries.find((entry) => entry.qnaId === selectedQnaId) || entries[0] || null;
  }, [entries, selectedQnaId]);
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

  function updateQnaFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();
    setAppliedFilters(filters);
  }

  function resetFilters() {
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
      });
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
    return (
      <PageLayout
        title="Q&A 관리"
        description="접수된 질문을 선택하고 답변과 상태를 관리하는 관리자 화면입니다."
      >
        {loadError ? (
          <div className="api-status api-status--error" role="alert">
            <span>{loadError}</span>
            <button type="button" onClick={() => loadEntries()} disabled={isLoading}>
              다시 시도
            </button>
          </div>
        ) : null}
        {submitMessage ? (
          <div
            className={
              submitMessage.includes("저장")
                ? "api-status api-status--success"
                : "api-status api-status--error"
            }
          >
            {submitMessage}
          </div>
        ) : null}

        <QnaFilterPanel
          filters={filters}
          onChange={updateQnaFilter}
          onSubmit={handleFilterSubmit}
          onReset={resetFilters}
        />

        <div className="faq-columns faq-columns--admin">
          <section className="board-table" aria-label="Q&A 목록">
            <div className="board-table__head">
              <span>상태</span>
              <span>질문</span>
              <span>작성자</span>
              <span>유형</span>
              <span>수정일</span>
            </div>

            <div className="board-table__body">
              {isLoading && entries.length === 0 ? (
                <div className="board-empty">Q&A 목록을 불러오는 중입니다.</div>
              ) : entries.length === 0 ? (
                <div className="board-empty">등록된 질문이 없습니다.</div>
              ) : (
                entries.map((entry) => (
                  <details
                    key={entry.qnaId}
                    className={`board-row ${selectedQnaId === entry.qnaId ? "board-row--selected" : ""}`}
                    open={selectedQnaId === entry.qnaId}
                  >
                    <summary
                      className="board-row__summary"
                      onClick={() => setSelectedQnaId(entry.qnaId)}
                    >
                      <span className="board-badge">{getStatusLabel(entry.statusCode)}</span>
                      <span className="board-row__title">{entry.question}</span>
                      <span className="board-row__meta" data-label="작성자">
                        {entry.guestName || entry.username || "-"}
                      </span>
                      <span className="board-row__meta" data-label="유형">
                        {entry.category}
                      </span>
                      <span className="board-row__meta" data-label="수정일">
                        {String(entry.updatedAt || entry.createdAt || "-").slice(0, 10)}
                      </span>
                    </summary>

                    <div className="board-row__content">
                      <div className="board-row__answer-label">문의</div>
                      <div className="board-row__body">
                        <p>{entry.question}</p>
                      </div>
                    </div>
                  </details>
                ))
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

          <aside className="faq-side-card">
            <div className="faq-side-card__section">
              <div className="faq-side-card__header">
                <h3>답변 작성</h3>
              </div>

              {selectedEntry ? (
                <form className="admin-form" onSubmit={handleAnswerSubmit}>
                  <div className="faq-editor-caption">
                    선택한 질문: {selectedEntry.question}
                  </div>

                  <div className="admin-inline-fields">
                    <label className="admin-field">
                      <span>질문자</span>
                      <input
                        type="text"
                        value={selectedEntry.guestName || selectedEntry.username || "비로그인 사용자"}
                        readOnly
                      />
                    </label>

                    <label className="admin-field">
                      <span>답변 이메일</span>
                      <input type="text" value={selectedEntry.guestEmail || "-"} readOnly />
                    </label>
                  </div>

                  <label className="admin-field">
                    <span>상태</span>
                    <select
                      value={answerDraft.statusCode}
                      onChange={(event) =>
                        setAnswerDraft((current) => ({
                          ...current,
                          statusCode: event.target.value,
                        }))
                      }
                    >
                      <option value="received">접수</option>
                      <option value="reviewing">검토 중</option>
                      <option value="answered">답변 완료</option>
                      <option value="hidden">비공개</option>
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>답변 내용</span>
                    <textarea
                      rows={8}
                      value={answerDraft.answer}
                      onChange={(event) =>
                        setAnswerDraft((current) => ({
                          ...current,
                          answer: event.target.value,
                        }))
                      }
                      placeholder="답변 내용을 입력해 주세요."
                    />
                  </label>

                  <label className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={answerDraft.isPublic}
                      onChange={(event) =>
                        setAnswerDraft((current) => ({
                          ...current,
                          isPublic: event.target.checked,
                        }))
                      }
                    />
                    <span>공개 답변</span>
                  </label>

                  <div className="admin-actions">
                    <button type="submit" className="button-primary" disabled={isSubmitting}>
                      {isSubmitting ? "저장 중..." : "답변 저장"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="board-empty">목록에서 질문을 선택해 주세요.</div>
              )}
            </div>
          </aside>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="공개 Q&A"
      className="support-page support-page--qna"
      description="다른 사용자의 질문과 운영팀 답변을 먼저 확인할 수 있습니다."
    >
      <div className="stack-layout">
        <section className="support-panel qna-scope-panel">
          <div className="support-panel__header">
            <span className="support-kicker">공개 범위</span>
            <h3>공개되어도 괜찮은 질문만 남겨 주세요.</h3>
          </div>
          <p className="page-layout__description">
            계정, 연락처, 결제, 사업자 정보처럼 개인 확인이 필요한 내용은 공개 Q&A에 포함하지 마세요.
            개인 확인이 필요한 문의는 1:1 비공개 문의로 접수할 수 있습니다.
          </p>
          <div className="support-panel__actions">
            <Link className="support-page-action support-page-action--secondary" to="/qna/private">
              1:1 문의로 이동
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
              1:1 문의
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

        <section className="board-table qna-public-board" aria-label="공개 Q&A 목록">
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

  return summary.length > 0 ? summary.join(" · ") : "전체 공개 Q&A를 보고 있습니다.";
}

export { QnAWrite };
export default QnA;
