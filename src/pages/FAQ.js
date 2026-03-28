import React, { useEffect, useMemo, useState } from "react";
import { createFaq, deleteFaq, fetchFaqDetail, fetchFaqs, updateFaq } from "../api/faqApi";
import PageLayout from "../components/PageLayout";

const emptyDraft = {
  category: "notice",
  title: "",
  answer: "",
  pinned: false,
  displayOrder: 0,
  status: "published",
};

const categoryLabels = {
  notice: "공지",
  account: "계정",
  service: "서비스",
  policy: "정책",
};

function FAQ({ adminMode = false }) {
  const [faqPage, setFaqPage] = useState({
    content: [],
    page: 0,
    size: 10,
    totalElements: 0,
    totalPages: 0,
    hasNext: false,
  });
  const [selectedFaqId, setSelectedFaqId] = useState(null);
  const [selectedFaqDetail, setSelectedFaqDetail] = useState(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [editorMode, setEditorMode] = useState("create");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    loadFaqList();
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadFaqDetailById() {
      if (!selectedFaqId) {
        setSelectedFaqDetail(null);
        return;
      }

      setIsDetailLoading(true);

      try {
        const response = await fetchFaqDetail(selectedFaqId);
        if (!ignore) {
          setSelectedFaqDetail(response);
        }
      } catch (error) {
        if (!ignore) {
          setSelectedFaqDetail(null);
        }
      } finally {
        if (!ignore) {
          setIsDetailLoading(false);
        }
      }
    }

    loadFaqDetailById();

    return () => {
      ignore = true;
    };
  }, [selectedFaqId]);

  const faqPosts = faqPage.content;

  const selectedFaq = useMemo(() => {
    if (selectedFaqDetail) {
      return selectedFaqDetail;
    }

    return faqPosts.find((post) => post.faqId === selectedFaqId) || faqPosts[0] || null;
  }, [faqPosts, selectedFaqDetail, selectedFaqId]);

  async function loadFaqList(nextSelectedFaqId) {
    setIsListLoading(true);
    setLoadError("");

    try {
      const response = await fetchFaqs({ page: 0, size: 10 });
      const content = Array.isArray(response?.content) ? response.content : [];
      const fallbackFaqId = content[0]?.faqId ?? null;
      const resolvedFaqId =
        nextSelectedFaqId && content.some((item) => item.faqId === nextSelectedFaqId)
          ? nextSelectedFaqId
          : fallbackFaqId;

      setFaqPage({
        content,
        page: response?.page ?? 0,
        size: response?.size ?? 10,
        totalElements: response?.totalElements ?? content.length,
        totalPages: response?.totalPages ?? 1,
        hasNext: response?.hasNext ?? false,
      });
      setSelectedFaqId(resolvedFaqId);
      return content;
    } catch (error) {
      setLoadError("FAQ 목록을 불러오지 못했습니다. API 응답을 확인해 주세요.");
      return [];
    } finally {
      setIsListLoading(false);
    }
  }

  function resetDraft() {
    setDraft(emptyDraft);
    setEditorMode("create");
    setIsEditorOpen(false);
    setSubmitError("");
    setSubmitMessage("");
  }

  function fillDraftFromFaq(faq) {
    if (!faq) {
      return;
    }

    setDraft({
      category: faq.category || "notice",
      title: faq.title || "",
      answer: faq.answer || "",
      pinned: Boolean(faq.isPinned),
      displayOrder: Number(faq.displayOrder ?? 0),
      status: faq.statusCode || "published",
    });
    setEditorMode("edit");
    setIsEditorOpen(true);
    setSubmitError("");
    setSubmitMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!draft.title.trim() || !draft.answer.trim()) {
      setSubmitError("제목과 답변은 필수입니다.");
      setSubmitMessage("");
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");

    const payload = {
      category: draft.category,
      title: draft.title.trim(),
      answer: draft.answer.trim(),
      isPinned: draft.pinned,
      displayOrder: Number(draft.displayOrder) || 0,
      statusCode: draft.status,
    };

    try {
      let response;

      if (editorMode === "edit" && selectedFaq?.faqId) {
        response = await updateFaq(selectedFaq.faqId, payload);
        setSubmitMessage("FAQ를 수정했습니다.");
      } else {
        console.log("[FAQ CREATE] request", payload);
        response = await createFaq(payload);
        console.log("[FAQ CREATE] response", response);
        setSubmitMessage("FAQ를 등록했습니다.");
      }

      const nextFaqId = response?.faqId || selectedFaq?.faqId || null;
      await loadFaqList(nextFaqId);
      setDraft(emptyDraft);
      setEditorMode("create");
      setIsEditorOpen(false);
    } catch (error) {
      setSubmitError(error.message || "FAQ 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteFaq(faqId) {
    if (!faqId) {
      return;
    }

    const shouldDelete = window.confirm("선택한 FAQ를 삭제하시겠습니까?");
    if (!shouldDelete) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");

    try {
      await deleteFaq(faqId);
      await loadFaqList();
      resetDraft();
      setSubmitMessage("FAQ를 삭제했습니다.");
    } catch (error) {
      setSubmitError(error.message || "FAQ 삭제에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      title={adminMode ? "FAQ 관리" : "자주 묻는 질문"}
      description={
        adminMode
          ? "관리자는 FAQ 등록, 수정, 삭제를 한 화면에서 처리할 수 있습니다."
          : "일반 사용자는 자주 묻는 질문 목록과 답변만 간단하게 확인할 수 있습니다."
      }
    >
      <div className="faq-topline">
        <strong>전체 {faqPage.totalElements}건</strong>
      </div>

      {loadError ? <div className="api-status api-status--error">{loadError}</div> : null}

      <div className={adminMode ? "faq-columns faq-columns--admin" : "faq-columns faq-columns--public"}>
        <section className="board-table" aria-label="FAQ 게시판">
          <div className="board-table__head">
            <span>분류</span>
            <span>제목</span>
            <span>작성자</span>
            <span>조회수</span>
            <span>수정일</span>
          </div>

          <div className="board-table__body">
            {isListLoading ? (
              <div className="board-empty">FAQ 목록을 불러오는 중입니다.</div>
            ) : faqPosts.length === 0 ? (
              <div className="board-empty">조회된 FAQ가 없습니다.</div>
            ) : (
              faqPosts.map((post) => {
                const isSelected = selectedFaqId === post.faqId;
                const detail = isSelected && selectedFaqDetail ? selectedFaqDetail : post;

                return (
                  <details
                    key={post.faqId}
                    className={`board-row ${isSelected ? "board-row--selected" : ""}`}
                    open={isSelected || post.isPinned}
                  >
                    <summary className="board-row__summary" onClick={() => setSelectedFaqId(post.faqId)}>
                      <span className={post.isPinned ? "board-badge board-badge--notice" : "board-badge"}>
                        {toCategoryLabel(post.category)}
                      </span>
                      <span className="board-row__title">
                        {post.isPinned ? <strong>[고정]</strong> : null}
                        {post.title}
                      </span>
                      <span className="board-row__meta" data-label="작성자">
                        {post.username}
                      </span>
                      <span className="board-row__meta" data-label="조회수">
                        {Number(post.viewCount ?? 0).toLocaleString()}
                      </span>
                      <span className="board-row__meta" data-label="수정일">
                        {formatDate(post.updatedAt)}
                      </span>
                    </summary>

                    <div className="board-row__content">
                      <div className="board-row__answer-label">답변</div>
                      <div className="board-row__body">
                        <p>
                          {isSelected && isDetailLoading
                            ? "상세 내용을 불러오는 중입니다."
                            : detail?.answer || "답변 내용이 없습니다."}
                        </p>
                        {adminMode ? (
                          <div className="board-row__actions">
                            <button type="button" onClick={() => fillDraftFromFaq(detail)}>
                              수정
                            </button>
                            <button
                              type="button"
                              className="button-danger"
                              onClick={() => handleDeleteFaq(post.faqId)}
                              disabled={isSubmitting}
                            >
                              삭제
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </details>
                );
              })
            )}
          </div>
        </section>

        {adminMode ? (
          <aside className="faq-side-card">
            <div className="faq-side-card__section">
              <div className="faq-side-card__header">
                <h3>FAQ 작업</h3>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditorOpen && editorMode === "create") {
                      resetDraft();
                      return;
                    }

                    setEditorMode("create");
                    setDraft(emptyDraft);
                    setSubmitError("");
                    setSubmitMessage("");
                    setIsEditorOpen(true);
                  }}
                >
                  {isEditorOpen && editorMode === "create" ? "등록창 닫기" : "새 FAQ 등록"}
                </button>
              </div>

              {submitMessage ? <div className="api-status api-status--success">{submitMessage}</div> : null}
              {submitError ? <div className="api-status api-status--error">{submitError}</div> : null}

              {isEditorOpen ? (
                <form className="admin-form" onSubmit={handleSubmit}>
                  <div className="faq-editor-caption">
                    {editorMode === "edit" ? "선택한 FAQ를 수정 중입니다." : "새 FAQ를 등록합니다."}
                  </div>

                  <label className="admin-field">
                    <span>분류</span>
                    <select
                      value={draft.category}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, category: event.target.value }))
                      }
                    >
                      <option value="notice">공지</option>
                      <option value="account">계정</option>
                      <option value="service">서비스</option>
                      <option value="policy">정책</option>
                    </select>
                  </label>

                  <label className="admin-field">
                    <span>제목</span>
                    <input
                      type="text"
                      placeholder="FAQ 제목 입력"
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                  </label>

                  <label className="admin-field">
                    <span>답변</span>
                    <textarea
                      rows="5"
                      placeholder="FAQ 답변 입력"
                      value={draft.answer}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, answer: event.target.value }))
                      }
                    />
                  </label>

                  <div className="admin-inline-fields">
                    <label className="admin-field">
                      <span>상태</span>
                      <select
                        value={draft.status}
                        onChange={(event) =>
                          setDraft((current) => ({ ...current, status: event.target.value }))
                        }
                      >
                        <option value="published">게시중</option>
                        <option value="review">검토중</option>
                        <option value="draft">임시저장</option>
                      </select>
                    </label>

                    <label className="admin-field">
                      <span>노출 순서</span>
                      <input
                        type="number"
                        min="0"
                        value={draft.displayOrder}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            displayOrder: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="admin-toggle">
                    <input
                      type="checkbox"
                      checked={draft.pinned}
                      onChange={(event) =>
                        setDraft((current) => ({ ...current, pinned: event.target.checked }))
                      }
                    />
                    <span>상단 고정</span>
                  </label>

                  <div className="admin-actions">
                    <button type="button" onClick={resetDraft} disabled={isSubmitting}>
                      취소
                    </button>
                    <button type="submit" className="button-primary" disabled={isSubmitting}>
                      {isSubmitting ? "저장 중..." : editorMode === "edit" ? "수정 저장" : "등록"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="board-empty">새 FAQ 등록 버튼을 눌러 작성창을 열어 주세요.</div>
              )}
            </div>
          </aside>
        ) : null}
      </div>
    </PageLayout>
  );
}

function toCategoryLabel(category) {
  if (!category) {
    return "";
  }

  return categoryLabels[category] || category;
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toISOString().slice(0, 10).replace(/-/g, ".");
}

export default FAQ;
