import React, { useEffect, useMemo, useState } from "react";
import { fetchFaqDetail, fetchFaqs } from "../api/faqApi";
import PageLayout from "../components/PageLayout";

const emptyDraft = {
  category: "account",
  title: "",
  answer: "",
  author: "admin",
  pinned: false,
  status: "published",
};

function FAQ() {
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
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadFaqList() {
      setIsListLoading(true);
      setLoadError("");

      try {
        const response = await fetchFaqs({ page: 0, size: 10 });
        if (ignore) {
          return;
        }

        const content = Array.isArray(response?.content) ? response.content : [];
        setFaqPage({
          content,
          page: response?.page ?? 0,
          size: response?.size ?? 10,
          totalElements: response?.totalElements ?? content.length,
          totalPages: response?.totalPages ?? 1,
          hasNext: response?.hasNext ?? false,
        });

        if (content.length > 0) {
          setSelectedFaqId(content[0].faqId);
        }
      } catch (error) {
        if (!ignore) {
          setLoadError("FAQ 목록을 불러오지 못했습니다. API 응답을 확인해 주세요.");
        }
      } finally {
        if (!ignore) {
          setIsListLoading(false);
        }
      }
    }

    loadFaqList();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadFaqDetail() {
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

    loadFaqDetail();

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

  return (
    <PageLayout
      title="자주 묻는 질문"
      description="FAQ 읽기 API 연동 기준으로 목록 조회와 상세 조회를 연결한 화면입니다."
    >
      <section className="board-toolbar">
        <div className="board-toolbar__group">
          <span className="support-kicker">FAQ Board</span>
          <strong>전체 {faqPage.totalElements}건</strong>
        </div>
        <div className="board-toolbar__filters">
          <span>account</span>
          <span>service</span>
          <span>policy</span>
          <span>published</span>
        </div>
      </section>

      {loadError ? <div className="api-status api-status--error">{loadError}</div> : null}

      <div className="faq-workspace">
        <section className="faq-workspace__board">
          <div className="faq-section-head">
            <div>
              <span className="support-kicker">Customer View</span>
              <h3>FAQ Board</h3>
            </div>
            <p>목록은 `GET /api/faqs`, 펼친 상세는 `GET /api/faqs/{'{faqId}'}` 응답 기준으로 표시됩니다.</p>
          </div>

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
                          {post.category}
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
                          <div className="board-row__actions">
                            <button type="button" onClick={() => setSelectedFaqId(post.faqId)}>
                              수정
                            </button>
                            <button type="button" className="button-danger">
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    </details>
                  );
                })
              )}
            </div>
          </section>
        </section>

        <aside className="faq-workspace__admin">
          <div className="faq-section-head faq-section-head--sidebar">
            <div>
              <span className="support-kicker">Operator View</span>
              <h3>Admin Panel</h3>
            </div>
            <p>쓰기/수정/삭제 UI는 남겨두되, 현재는 읽기 API만 먼저 연결한 상태입니다.</p>
          </div>

          <section className="admin-panel">
            <div className="admin-panel__header">
              <div>
                <span className="support-kicker">Admin UI</span>
                <h3>FAQ 작성</h3>
              </div>
              <button type="button" onClick={() => setDraft(emptyDraft)}>
                새 글
              </button>
            </div>

            <div className="admin-form">
              <label className="admin-field">
                <span>분류</span>
                <select
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, category: event.target.value }))
                  }
                >
                  <option value="account">account</option>
                  <option value="service">service</option>
                  <option value="policy">policy</option>
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
                  rows="6"
                  placeholder="FAQ 답변 입력"
                  value={draft.answer}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, answer: event.target.value }))
                  }
                />
              </label>

              <div className="admin-inline-fields">
                <label className="admin-field">
                  <span>작성자</span>
                  <input
                    type="text"
                    value={draft.author}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, author: event.target.value }))
                    }
                  />
                </label>

                <label className="admin-field">
                  <span>상태</span>
                  <select
                    value={draft.status}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    <option value="published">published</option>
                    <option value="review">review</option>
                    <option value="draft">draft</option>
                  </select>
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
                <span>상단 고정으로 등록</span>
              </label>

              <div className="admin-actions">
                <button type="button">임시 저장</button>
                <button type="button" className="button-primary">
                  등록 요청
                </button>
              </div>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel__header">
              <div>
                <span className="support-kicker">Selected</span>
                <h3>선택한 게시글</h3>
              </div>
              <span className={`status-pill status-pill--${statusToClassName(selectedFaq?.statusCode)}`}>
                {selectedFaq?.statusCode || "none"}
              </span>
            </div>

            <div className="admin-detail">
              <div className="admin-detail__row">
                <span>제목</span>
                <strong>{selectedFaq?.title || "-"}</strong>
              </div>
              <div className="admin-detail__row">
                <span>분류</span>
                <strong>{selectedFaq?.category || "-"}</strong>
              </div>
              <div className="admin-detail__row">
                <span>작성자</span>
                <strong>{selectedFaq?.username || "-"}</strong>
              </div>
              <div className="admin-detail__row">
                <span>수정일</span>
                <strong>{selectedFaq ? formatDate(selectedFaq.updatedAt) : "-"}</strong>
              </div>
              <div className="admin-detail__row admin-detail__row--block">
                <span>답변 미리보기</span>
                <p>{selectedFaq?.answer || "선택된 게시글이 없습니다."}</p>
              </div>
              <div className="admin-actions">
                <button type="button">수정 모드</button>
                <button type="button" className="button-danger">
                  삭제 요청
                </button>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </PageLayout>
  );
}

function statusToClassName(statusCode) {
  switch (statusCode) {
    case "published":
      return "published";
    case "review":
      return "review";
    case "draft":
      return "draft";
    default:
      return "default";
  }
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
