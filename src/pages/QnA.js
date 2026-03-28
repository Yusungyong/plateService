import React, { useEffect, useMemo, useState } from "react";
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

const fallbackEntries = [
  {
    qnaId: "fallback-1",
    statusCode: "answered",
    category: "이용문의",
    question: "콘텐츠 검수 결과는 어디에서 확인할 수 있나요?",
    answer:
      "현재는 고객지원 메뉴 안에서 검수 흐름을 확인할 수 있습니다. 서버 연동이 준비되면 실제 문의 데이터로 교체됩니다.",
    guestName: "운영팀",
    guestEmail: null,
    username: null,
    answeredBy: "운영팀",
    createdAt: "",
    updatedAt: "",
    answeredAt: "",
    isPublic: true,
  },
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

function getMetaLabel(entry) {
  const author = entry.guestName || entry.username || "비로그인 사용자";
  const updatedAt = entry.updatedAt || entry.createdAt;

  if (!updatedAt) {
    return author;
  }

  return `${author} · ${String(updatedAt).slice(0, 10)}`;
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

function QnA({ adminMode = false }) {
  const { isAuthenticated, user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedQnaId, setSelectedQnaId] = useState(null);
  const [form, setForm] = useState(() => ({
    ...initialForm,
    authorName: user?.displayName || user?.username || "",
  }));
  const [answerDraft, setAnswerDraft] = useState(initialAnswerDraft);

  useEffect(() => {
    loadEntries();
  }, []);

  const selectedEntry = useMemo(() => {
    return entries.find((entry) => entry.qnaId === selectedQnaId) || entries[0] || null;
  }, [entries, selectedQnaId]);

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

  async function loadEntries() {
    setIsLoading(true);
    setLoadError("");

    try {
      const response = await fetchQna({ page: 0, size: 10 });
      const nextEntries = normalizeEntries(response);
      const resolvedEntries = nextEntries.length ? nextEntries : fallbackEntries;
      setEntries(resolvedEntries);
      setSelectedQnaId((current) => current || resolvedEntries[0]?.qnaId || null);
    } catch (error) {
      setEntries(fallbackEntries);
      setSelectedQnaId(fallbackEntries[0]?.qnaId || null);
      setLoadError("Q&A 목록을 불러오지 못해 임시 데이터를 표시합니다.");
    } finally {
      setIsLoading(false);
    }
  }

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

    if (!isAuthenticated) {
      if (guestName) {
        payload.guestName = guestName;
      }

      if (guestEmail) {
        payload.guestEmail = guestEmail;
      }
    }

    setIsSubmitting(true);

    try {
      await createQna(payload);
      setSubmitMessage("질문이 접수되었습니다.");
      resetForm();
      await loadEntries();
    } catch (error) {
      setSubmitMessage(error.message || "질문 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
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
        {loadError ? <div className="api-status api-status--error">{loadError}</div> : null}
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
              {isLoading ? (
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
      title="질문과 답변"
      description="로그인 여부와 관계없이 질문을 남길 수 있는 Q&A 화면입니다. 접수된 질문과 답변 흐름을 같은 화면에서 확인할 수 있습니다."
    >
      <div className="stack-layout">
        <section className="support-panel support-panel--split">
          <div>
            <div className="support-panel__header">
              <span className="support-kicker">질문 남기기</span>
              <h3>비로그인 사용자도 문의를 접수할 수 있습니다.</h3>
            </div>
            <p className="page-layout__description">
              질문 등록은 공개로 열어두고, 답변 관리는 관리자 화면에서 처리하는 구조를 기준으로 잡았습니다.
            </p>
          </div>

          <form className="admin-form" onSubmit={handleCreate}>
            <div className="admin-inline-fields">
              <label className="admin-field">
                <span>작성자명</span>
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(event) => updateField("authorName", event.target.value)}
                  placeholder={isAuthenticated ? "표시 이름 입력" : "이름 또는 닉네임"}
                />
              </label>

              <label className="admin-field">
                <span>답변 받을 이메일</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="선택 입력"
                />
              </label>
            </div>

            <label className="admin-field">
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
                rows={6}
                value={form.question}
                onChange={(event) => updateField("question", event.target.value)}
                placeholder="문의하실 내용을 자세히 남겨 주세요."
              />
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

            <div className="admin-actions">
              <button type="submit" className="button-primary" disabled={isSubmitting}>
                {isSubmitting ? "등록 중..." : "질문 등록"}
              </button>
              <button type="button" onClick={resetForm} disabled={isSubmitting}>
                입력 초기화
              </button>
            </div>
          </form>
        </section>

        {loadError ? <div className="api-status api-status--error">{loadError}</div> : null}

        {isLoading ? (
          <div className="board-empty">Q&A 목록을 불러오는 중입니다.</div>
        ) : (
          <div className="stack-layout">
            {entries.map((entry) => {
              const answerAuthor = getAnswerAuthor(entry);

              return (
                <article key={entry.qnaId} className="timeline-card">
                  <div className="timeline-card__badge">{getStatusLabel(entry.statusCode)}</div>
                  <h3>{entry.question}</h3>
                  <span className="timeline-card__meta">{getMetaLabel(entry)}</span>

                  {entry.answer ? (
                    <div className="qna-answer">
                      <div className="qna-answer__header">
                        <span className="qna-answer__badge">답변</span>
                        <span className="qna-answer__author">
                          {answerAuthor ? `${answerAuthor} 답변` : "운영팀 답변"}
                        </span>
                      </div>
                      <p>{entry.answer}</p>
                    </div>
                  ) : (
                    <div className="qna-answer qna-answer--pending">
                      <div className="qna-answer__header">
                        <span className="qna-answer__badge">답변 대기</span>
                      </div>
                      <p>아직 답변이 등록되지 않았습니다.</p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default QnA;
