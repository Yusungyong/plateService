import UnsavedChangesGuard from "../components/UnsavedChangesGuard";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {Link} from 'react-router-dom';
import { createFaq, deleteFaq, fetchFaqDetail, fetchFaqs, updateFaq } from "../api/faqApi";
import ConfirmDialog from "../admin/components/ConfirmDialog";
import PageLayout from "../components/PageLayout";

const emptyDraft = {
  category: "notice",
  title: "",
  answer: "",
  pinned: false,
  displayOrder: 0,
  status: "published",
};

const initialFaqFilters = {
  category: "",
  keyword: "",
};

const PAGE_SIZE = 10;

const categoryLabels = {
  notice: "공지",
  account: "계정",
  service: "서비스",
  policy: "정책",
};

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

function FAQ({ adminMode = false }) {
  const [filters, setFilters] = useState(initialFaqFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFaqFilters);
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
  const [draftBaseline, setDraftBaseline] = useState(emptyDraft);
  const [editingFaqId, setEditingFaqId] = useState(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftBaseline);
  const [editorMode, setEditorMode] = useState("create");
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [pendingDeleteFaqId, setPendingDeleteFaqId] = useState(null);

  const loadFaqList = useCallback(async ({ nextSelectedFaqId, page = 0, append = false } = {}) => {
    setIsListLoading(true);
    setLoadError("");

    if (!append) {
      setFaqPage({
        content: [],
        page: 0,
        size: PAGE_SIZE,
        totalElements: 0,
        totalPages: 0,
        hasNext: false,
      });
      setSelectedFaqDetail(null);
    }

    try {
      const response = await fetchFaqs({
        page,
        size: PAGE_SIZE,
        category: appliedFilters.category,
        keyword: appliedFilters.keyword.trim(),
      });
      const content = Array.isArray(response?.content) ? response.content : [];
      const responsePage = response?.page ?? page;
      const responseSize = response?.size ?? PAGE_SIZE;
      const responseTotalPages = response?.totalPages ?? (content.length > 0 ? 1 : 0);
      const fallbackFaqId = content[0]?.faqId ?? null;
      const resolvedFaqId =
        nextSelectedFaqId && content.some((item) => item.faqId === nextSelectedFaqId)
          ? nextSelectedFaqId
          : fallbackFaqId;

      setFaqPage((current) => ({
        content: append ? mergeUniqueById(current.content, content, "faqId") : content,
        page: responsePage,
        size: responseSize,
        totalElements: response?.totalElements ?? content.length,
        totalPages: responseTotalPages,
        hasNext: response?.hasNext ?? responsePage + 1 < responseTotalPages,
      }));

      if (!append) {
        setSelectedFaqId(resolvedFaqId);
      }

      return content;
    } catch (error) {
      if (!append) {
        setSelectedFaqId(null);
      }

      setLoadError("FAQ 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return [];
    } finally {
      setIsListLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadFaqList();
  }, [loadFaqList]);

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
  const faqResultCaption = getFaqFilterSummary(appliedFilters);

  function canDiscard() {return !isSubmitting && (!dirty || window.confirm("작성 중인 FAQ를 버릴까요?"));}

  function resetDraft(force = false) {
    if (force !== true && !canDiscard()) return;
    setDraftBaseline(emptyDraft); setEditingFaqId(null);
    setDraft(emptyDraft);
    setEditorMode("create");
    setIsEditorOpen(false);
    setSubmitError("");
    setSubmitMessage("");
  }

  function fillDraftFromFaq(faq) {
    if (!faq || !canDiscard()) {
      return;
    }

    const nextDraft = {
      category: faq.category || "notice",
      title: faq.title || "",
      answer: faq.answer || "",
      pinned: Boolean(faq.isPinned),
      displayOrder: Number(faq.displayOrder ?? 0),
      status: faq.statusCode || "published",
    };
    setDraft(nextDraft); setDraftBaseline(nextDraft); setEditingFaqId(faq.faqId);
    setEditorMode("edit");
    setIsEditorOpen(true);
    setSubmitError("");
    setSubmitMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

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

      if (editorMode === "edit" && editingFaqId) {
        response = await updateFaq(editingFaqId, payload);
        setSubmitMessage("FAQ를 수정했습니다.");
      } else {
        response = await createFaq(payload);
        setSubmitMessage("FAQ를 등록했습니다.");
      }

      const nextFaqId = response?.faqId || selectedFaq?.faqId || null;
      await loadFaqList({ nextSelectedFaqId: nextFaqId });
      setDraft(emptyDraft); setDraftBaseline(emptyDraft);
      setEditorMode("create");
      setIsEditorOpen(false);
    } catch (error) {
      setSubmitError(error.message || "FAQ 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestDeleteFaq(faqId) {
    if (!canDiscard()) return;
    setPendingDeleteFaqId(faqId);
    setSubmitError("");
    setSubmitMessage("");
  }

  function updateFilter(field, value) {
    setFilters((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSearch(event) {
    event.preventDefault();
    if (!canDiscard()) return;
    resetDraft(true);
    setAppliedFilters({
      category: filters.category,
      keyword: filters.keyword.trim(),
    });
  }

  function resetFilters() {
    if (!canDiscard()) return;
    resetDraft(true);
    setFilters(initialFaqFilters);
    setAppliedFilters(initialFaqFilters);
  }

  function handleLoadMoreFaq() {
    loadFaqList({
      page: (faqPage.page ?? 0) + 1,
      append: true,
    });
  }

  async function confirmDeleteFaq() {
    if (!pendingDeleteFaqId) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError("");
    setSubmitMessage("");

    try {
      await deleteFaq(pendingDeleteFaqId);
      await loadFaqList();
      resetDraft(true);
      setSubmitMessage("FAQ를 삭제했습니다.");
      setPendingDeleteFaqId(null);
    } catch (error) {
      setSubmitError(error.message || "FAQ 삭제에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      title={adminMode ? "FAQ 관리" : "자주 묻는 질문"}
      className={adminMode ? "" : "support-page support-page--faq"}
      description={
        adminMode
          ? "관리자는 FAQ 등록, 수정, 삭제를 한 화면에서 처리할 수 있습니다."
          : "궁금한 내용을 찾아보고, 해결되지 않으면 비공개 문의를 남겨 주세요."
      }
    >
      {!adminMode && !isListLoading && !loadError && faqPage.totalElements === 0 && !appliedFilters.keyword && !appliedFilters.category && <section className="support-panel" aria-label="빠른 이용 안내">
        <h2>기본 이용 안내</h2>
        <details><summary>로그인 없이 문의할 수 있나요?</summary><p><Link to="/qna/private">비공개 1:1 문의</Link>에서 문의를 접수할 수 있습니다. 계정·연락처 등 개인 정보는 공개 게시판에 남기지 마세요.</p></details>
        <details><summary>식당 입점 신청은 어떻게 하나요?</summary><p><Link to="/business">식당 비즈니스 안내</Link>를 확인하고 로그인한 뒤 신청하세요. 로그인 후 신청 현황과 보완 요청을 확인할 수 있습니다.</p></details>
        <details><summary>접수한 문의와 답변은 어디서 보나요?</summary><p>로그인하고 남긴 문의는 <Link to="/qna/my">내 문의</Link>에서 확인합니다. 비로그인 접수는 접수 번호를 보관해 주세요.</p></details>
        <details><summary>계정을 삭제하려면 어떻게 하나요?</summary><p><Link to="/account-deletion">계정 및 개인정보 삭제 요청 안내</Link>에서 앱 밖의 요청 경로와 처리 절차를 확인할 수 있습니다.</p></details>
      </section>}
      {(adminMode || isListLoading || loadError || faqPage.totalElements > 0 || appliedFilters.keyword || appliedFilters.category) && <>
      <div className="faq-topline">
        <strong>
          전체 {faqPage.totalElements}건 중 {faqPosts.length}건 표시
        </strong>
        <span>{faqResultCaption}</span>
      </div>

      <UnsavedChangesGuard when={adminMode && dirty} pending={isSubmitting} />
      <form className="restaurant-filter-form faq-filter-form" onSubmit={handleSearch}>
        <label className="admin-field">
          <span>분류</span>
          <select
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
          >
            <option value="">전체</option>
            <option value="notice">공지</option>
            <option value="account">계정</option>
            <option value="service">서비스</option>
            <option value="policy">정책</option>
          </select>
        </label>

        <label className="admin-field">
          <span>검색어</span>
          <input
            type="search"
            value={filters.keyword}
            onChange={(event) => updateFilter("keyword", event.target.value)}
            placeholder="FAQ 제목 또는 답변"
          />
        </label>

        <div className="admin-actions restaurant-filter-actions">
          <button type="button" onClick={resetFilters}>
            초기화
          </button>
          <button type="submit" className="button-primary">
            조회
          </button>
        </div>
      </form>

      </>}
      {loadError ? <div className="api-status api-status--error">{loadError}</div> : null}

      <div className={adminMode ? "faq-columns faq-columns--admin" : "faq-columns faq-columns--public"}>
        <section
          className={adminMode ? "board-table" : "faq-public-board"}
          aria-label="FAQ 게시판"
        >
          {adminMode ? (
            <div className="board-table__head">
              <span>분류</span>
              <span>제목</span>
              <span>작성자</span>
              <span>조회수</span>
              <span>수정일</span>
            </div>
          ) : null}

          <div className={adminMode ? "board-table__body" : "faq-public-list"}>
            {isListLoading && faqPosts.length === 0 ? (
              <div className="board-empty">FAQ 목록을 불러오는 중입니다.</div>
            ) : faqPosts.length === 0 ? (
              <div className="board-empty">
                <p>{appliedFilters.category || appliedFilters.keyword ? '조회된 FAQ가 없습니다. 분류나 검색어를 바꿔 다시 확인해 주세요.' : '자주 묻는 질문을 준비하고 있습니다.'}</p>
                {!adminMode && <Link to="/qna/private">궁금한 내용은 비공개 1:1 문의로 남겨 주세요.</Link>}
              </div>
            ) : (
              faqPosts.map((post) => {
                const isSelected = selectedFaqId === post.faqId;
                const detail = isSelected && selectedFaqDetail ? selectedFaqDetail : post;

                return (
                  <details
                    key={post.faqId}
                    className={
                      adminMode
                        ? `board-row ${isSelected ? "board-row--selected" : ""}`
                        : `faq-public-item ${isSelected ? "faq-public-item--selected" : ""}`
                    }
                    open={isSelected || post.isPinned}
                  >
                    <summary
                      className={adminMode ? "board-row__summary" : "faq-public-item__summary"}
                      onClick={event => {if (adminMode && post.faqId !== selectedFaqId) {event.preventDefault(); if (!canDiscard()) return; resetDraft(true);} setSelectedFaqId(post.faqId);}}
                    >
                      <span className={post.isPinned ? "board-badge board-badge--notice" : "board-badge"}>
                        {toCategoryLabel(post.category)}
                      </span>
                      <span className={adminMode ? "board-row__title" : "faq-public-item__title"}>
                        {post.isPinned ? <strong>[고정]</strong> : null}
                        {post.title}
                      </span>
                      {adminMode ? (
                        <>
                          <span className="board-row__meta" data-label="작성자">
                            {post.username}
                          </span>
                          <span className="board-row__meta" data-label="조회수">
                            {Number(post.viewCount ?? 0).toLocaleString()}
                          </span>
                          <span className="board-row__meta" data-label="수정일">
                            {formatDate(post.updatedAt)}
                          </span>
                        </>
                      ) : null}
                    </summary>

                    <div className={adminMode ? "board-row__content" : "faq-public-item__content"}>
                      <div className={adminMode ? "board-row__answer-label" : "faq-public-item__answer-label"}>
                        답변
                      </div>
                      <div className={adminMode ? "board-row__body" : "faq-public-item__body"}>
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
                              onClick={() => requestDeleteFaq(post.faqId)}
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

          {faqPage.hasNext ? (
            <div className="list-more-actions">
              <button type="button" onClick={handleLoadMoreFaq} disabled={isListLoading}>
                {isListLoading ? "불러오는 중..." : "FAQ 더 보기"}
              </button>
            </div>
          ) : null}
        </section>

        {adminMode ? (
          <aside className="faq-side-card">
            <div className="faq-side-card__section">
              <div className="faq-side-card__header">
                <h2>FAQ 작업</h2>
                <button
                  type="button"
                  onClick={() => {
                    if (isEditorOpen && editorMode === "create") {
                      resetDraft();
                      return;
                    }

                    if (!canDiscard()) return;
                    setDraftBaseline(emptyDraft); setEditingFaqId(null);
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
                <form className="admin-form" onSubmit={handleSubmit}><fieldset className="form-fields" disabled={isSubmitting}>
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
                </fieldset></form>
              ) : (
                <div className="board-empty">새 FAQ 등록 버튼을 눌러 작성창을 열어 주세요.</div>
              )}
            </div>
          </aside>
        ) : null}
      </div>
      <ConfirmDialog
        isOpen={Boolean(pendingDeleteFaqId)}
        title="FAQ 삭제"
        description="삭제한 FAQ는 사용자 화면에 더 이상 노출되지 않습니다. 계속 삭제할까요?"
        confirmLabel="삭제하기"
        isSubmitting={isSubmitting}
        onCancel={() => setPendingDeleteFaqId(null)}
        onConfirm={confirmDeleteFaq}
      />
    </PageLayout>
  );
}

function toCategoryLabel(category) {
  if (!category) {
    return "";
  }

  return categoryLabels[category] || category;
}

function getFaqFilterSummary(filters) {
  const summary = [];

  if (filters.category) {
    summary.push(`분류: ${toCategoryLabel(filters.category)}`);
  }

  if (filters.keyword) {
    summary.push(`검색어: ${filters.keyword}`);
  }

  return summary.length > 0 ? summary.join(" · ") : "전체 FAQ를 보고 있습니다.";
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
