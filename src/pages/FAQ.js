import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {Link} from 'react-router-dom';
import { createFaq, deleteFaq, fetchFaqDetail, fetchFaqs, updateFaq } from "../api/faqApi";
import ConfirmDialog from "../admin/components/ConfirmDialog";
import PageLayout from "../components/PageLayout";
import UnsavedChangesGuard from "../components/UnsavedChangesGuard";
import "./support-workspace.css";

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
  const listRequest=useRef(0);
  const detailRef=useRef(null);
  const detailHeadingRef=useRef(null);
  const [statusFilter,setStatusFilter]=useState("");
  const [editorTargetId,setEditorTargetId]=useState(null);
  const [originalDraft,setOriginalDraft]=useState(emptyDraft);
  const [detailError,setDetailError]=useState("");
  const [detailReload,setDetailReload]=useState(0);
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
    const request=++listRequest.current;
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
      if(request!==listRequest.current)return [];
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
      if(request!==listRequest.current)return [];
      if (!append) {
        setSelectedFaqId(null);
      }

      setLoadError("FAQ 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return [];
    } finally {
      if(request===listRequest.current)setIsListLoading(false);
    }
  }, [appliedFilters]);

  useEffect(() => {
    loadFaqList();
    return()=>{listRequest.current+=1;};
  }, [loadFaqList]);

  useEffect(() => {
    let ignore = false;

    async function loadFaqDetailById() {
      if (!selectedFaqId) {
        setSelectedFaqDetail(null);
        return;
      }

      setIsDetailLoading(true);
      setSelectedFaqDetail(null);
      setDetailError("");

      try {
        const response = await fetchFaqDetail(selectedFaqId);
        if (!ignore) {
          setSelectedFaqDetail(response);
        }
      } catch (error) {
        if (!ignore) {
          setSelectedFaqDetail(null);
          setDetailError("상세 내용을 불러오지 못했어요. 다시 확인한 뒤 수정해 주세요.");
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
  }, [selectedFaqId, detailReload]);

  const faqPosts = faqPage.content;

  const selectedFaq = useMemo(() => {
    if (selectedFaqDetail?.faqId === selectedFaqId) {
      return selectedFaqDetail;
    }

    return faqPosts.find((post) => post.faqId === selectedFaqId) || faqPosts[0] || null;
  }, [faqPosts, selectedFaqDetail, selectedFaqId]);
  const faqResultCaption = getFaqFilterSummary(appliedFilters);

  const editorDirty=adminMode&&isEditorOpen&&JSON.stringify(draft)!==JSON.stringify(originalDraft);
  const workspacePosts=faqPosts.filter(post=>!statusFilter||post.statusCode===statusFilter);
  const workspaceSelected=workspacePosts.some(post=>post.faqId===selectedFaqId)?selectedFaq:null;
  function allowWorkspaceChange(){return !isSubmitting&&(!editorDirty||window.confirm("저장하지 않은 FAQ 내용이 있어요. 내용을 버리고 이동할까요?"));}
  function focusFaqDetail(){
    requestAnimationFrame(()=>{
      detailRef.current?.scrollIntoView?.({block:"nearest"});
      detailHeadingRef.current?.focus({preventScroll:true});
    });
  }
  function selectFaq(id){
    if(isSubmitting)return;
    if(id===selectedFaqId){focusFaqDetail();return;}
    if(!allowWorkspaceChange())return;
    resetDraft(true);setSelectedFaqId(id);focusFaqDetail();
  }
  function changeStatus(value){if(!allowWorkspaceChange())return;resetDraft(true);setStatusFilter(value);setSelectedFaqId(faqPosts.find(post=>!value||post.statusCode===value)?.faqId||null);}
  function openCreateEditor(){if(!allowWorkspaceChange())return;setEditorMode("create");setEditorTargetId(null);setDraft(emptyDraft);setOriginalDraft(emptyDraft);setSubmitError("");setSubmitMessage("");setIsEditorOpen(true);focusFaqDetail();}
  function resetDraft(force=false) {
    if(!force&&!allowWorkspaceChange())return;
    setDraft(emptyDraft);
    setOriginalDraft(emptyDraft);
    setEditorTargetId(null);
    setEditorMode("create");
    setIsEditorOpen(false);
    setSubmitError("");
    setSubmitMessage("");
  }

  function fillDraftFromFaq(faq) {
    if (!faq || selectedFaqDetail?.faqId !== faq.faqId || isDetailLoading || detailError || !allowWorkspaceChange()) {
      return;
    }

    const value={
      category: faq.category || "notice",
      title: faq.title || "",
      answer: faq.answer || "",
      pinned: Boolean(faq.isPinned),
      displayOrder: Number(faq.displayOrder ?? 0),
      status: faq.statusCode || "published",
    };
    setDraft(value);
    setOriginalDraft(value);
    setEditorTargetId(faq.faqId);
    setEditorMode("edit");
    setIsEditorOpen(true);
    focusFaqDetail();
    setSubmitError("");
    setSubmitMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if(isSubmitting||!adminMode)return;

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

      if (editorMode === "edit" && editorTargetId) {
        response = await updateFaq(editorTargetId, payload);
        setSubmitMessage("FAQ를 수정했습니다.");
      } else {
        response = await createFaq(payload);
        setSubmitMessage("FAQ를 등록했습니다.");
      }

      const nextFaqId = response?.faqId || editorTargetId || null;
      await loadFaqList({ nextSelectedFaqId: nextFaqId });
      setDetailReload(current=>current+1);
      setDraft(emptyDraft);
      setEditorMode("create");
      setIsEditorOpen(false);
    } catch (error) {
      setSubmitError(error.message || "FAQ 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function requestDeleteFaq(faqId) {
    if(!allowWorkspaceChange())return;
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
    if(adminMode&&!allowWorkspaceChange())return;
    if(adminMode)resetDraft(true);
    setAppliedFilters({
      category: filters.category,
      keyword: filters.keyword.trim(),
    });
  }

  function resetFilters() {
    if(adminMode&&!allowWorkspaceChange())return;
    if(adminMode){resetDraft(true);setStatusFilter("");}
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
    if (!pendingDeleteFaqId || isSubmitting || !adminMode) {
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
      setPendingDeleteFaqId(null);
      setSubmitError(error.message || "FAQ 삭제에 실패했습니다.");
      focusFaqDetail();
    } finally {
      setIsSubmitting(false);
    }
  }

  if(adminMode) return <PageLayout title="자주 묻는 질문 관리" className="support-workspace" description="사용자에게 보여줄 안내를 찾고, 필요한 내용만 편집하세요.">
    <UnsavedChangesGuard when={editorDirty} pending={isSubmitting}/>
    <div className="sw-topline"><p><strong>{faqPage.totalElements.toLocaleString()}건</strong> 조회 결과 · {faqPosts.length}건 불러옴</p><button type="button" className="button-primary" onClick={openCreateEditor} disabled={isSubmitting}>새 FAQ 등록</button></div>
    <div className="sw-status-bar" aria-label="불러온 FAQ의 게시 상태">{[["","전체"],["published","게시 중"],["review","검토 중"],["draft","임시 저장"]].map(([value,text])=><button type="button" key={value} aria-pressed={statusFilter===value} disabled={isSubmitting} onClick={()=>changeStatus(value)}>{text}</button>)}</div>
    <form className="sw-filters" onSubmit={handleSearch}><label><span>FAQ 검색</span><input type="search" value={filters.keyword} onChange={event=>updateFilter("keyword",event.target.value)} placeholder="제목 또는 답변 검색" disabled={isSubmitting}/></label><label><span>분류</span><select value={filters.category} onChange={event=>updateFilter("category",event.target.value)} disabled={isSubmitting}><option value="">모든 분류</option>{Object.entries(categoryLabels).map(([value,text])=><option key={value} value={value}>{text}</option>)}</select></label><div className="sw-filter-actions"><button type="button" onClick={resetFilters} disabled={isSubmitting}>초기화</button><button type="submit" className="button-primary" disabled={isSubmitting}>조회</button></div></form>
    {loadError&&<div className="api-status api-status--error" role="alert">{loadError}<button type="button" onClick={()=>{if(allowWorkspaceChange())loadFaqList();}} disabled={isSubmitting||isListLoading}>다시 시도</button></div>}
    {submitMessage&&<div className="api-status api-status--success" role="status">{submitMessage}</div>}
    <div className="sw-columns"><section className="sw-list" aria-label="FAQ 목록"><div className="sw-panel-heading"><h2>안내 목록</h2><span>{workspacePosts.length}건 표시</span></div><p className="sw-list-hint">게시 상태는 불러온 목록을 기준으로 분류해요.</p>
      {isListLoading&&!faqPosts.length?<p className="sw-empty" role="status">FAQ 목록을 불러오고 있어요.</p>:!workspacePosts.length?<p className="sw-empty">조건에 맞는 FAQ가 없어요.</p>:<ul>{workspacePosts.map(post=><li key={post.faqId}><button type="button" className="sw-list-item" aria-current={selectedFaqId===post.faqId?'true':undefined} disabled={isSubmitting} onClick={()=>selectFaq(post.faqId)}><span className="sw-item-meta"><span className={'sw-status sw-status--'+(post.statusCode||'unknown')}>{({published:'게시 중',review:'검토 중',draft:'임시 저장'})[post.statusCode]||'상태 확인 필요'}</span><time>{formatDate(post.updatedAt)}</time></span><strong>{post.title}</strong><span className="sw-item-caption">{toCategoryLabel(post.category)}{post.isPinned?' · 상단 고정':''}</span><span className="sw-item-arrow" aria-hidden="true">→</span></button></li>)}</ul>}
      {faqPage.hasNext&&<button type="button" className="sw-more" onClick={handleLoadMoreFaq} disabled={isListLoading||isSubmitting}>{isListLoading?'불러오는 중...':'FAQ 더 보기'}</button>}
    </section><section className="sw-detail" aria-label="선택한 FAQ" ref={detailRef}><div className="sw-panel-heading"><h2 ref={detailHeadingRef} tabIndex={-1}>{isEditorOpen?(editorMode==='edit'?'FAQ 편집':'새 FAQ 작성'):'안내 상세'}</h2>{isEditorOpen&&<span className="sw-status">{editorDirty?'저장 전':'편집 중'}</span>}</div>
      {submitError&&<div className="api-status api-status--error" role="alert">{submitError}</div>}
      {isEditorOpen?                <form className="sw-editor admin-form" onSubmit={handleSubmit}><fieldset disabled={isSubmitting}>
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
                    <button type="button" onClick={()=>resetDraft()} disabled={isSubmitting}>
                      취소
                    </button>
                    <button type="submit" className="button-primary" disabled={isSubmitting}>
                      {isSubmitting ? "저장 중..." : editorMode === "edit" ? "수정 저장" : "등록"}
                    </button>
                  </div>
                </fieldset></form>:workspaceSelected?<><span className="sw-eyebrow">{toCategoryLabel(workspaceSelected.category)}{workspaceSelected.isPinned?' · 상단 고정':''}</span><h3 className="sw-detail-title">{workspaceSelected.title}</h3>
        {isDetailLoading?<p className="sw-empty" role="status">상세 내용을 불러오고 있어요.</p>:detailError?<div className="api-status api-status--error" role="alert">{detailError}<button type="button" onClick={()=>setDetailReload(current=>current+1)}>다시 확인</button></div>:<div className="sw-answer-body">{workspaceSelected.answer||'등록된 답변이 없어요.'}</div>}
        <dl className="sw-facts"><div><dt>작성자</dt><dd>{workspaceSelected.username||'-'}</dd></div><div><dt>최근 수정</dt><dd>{formatDate(workspaceSelected.updatedAt)}</dd></div><div><dt>조회수</dt><dd>{Number(workspaceSelected.viewCount??0).toLocaleString()}</dd></div><div><dt>노출 순서</dt><dd>{workspaceSelected.displayOrder??'-'}</dd></div></dl>
        <div className="sw-save-bar"><button type="button" className="sw-danger-link" onClick={()=>requestDeleteFaq(workspaceSelected.faqId)} disabled={isSubmitting}>삭제</button><button type="button" className="button-primary" disabled={isSubmitting||isDetailLoading||Boolean(detailError)||selectedFaqDetail?.faqId!==workspaceSelected.faqId} onClick={()=>fillDraftFromFaq(workspaceSelected)}>내용 편집</button></div>
      </>:<p className="sw-empty">목록에서 FAQ를 선택하거나 새 안내를 작성해 주세요.</p>}
    </section></div>
    <ConfirmDialog isOpen={Boolean(pendingDeleteFaqId)} title="FAQ 삭제" description="삭제한 FAQ는 사용자 화면에 더 이상 노출되지 않습니다. 계속 삭제할까요?" confirmLabel="삭제하기" isSubmitting={isSubmitting} onCancel={()=>setPendingDeleteFaqId(null)} onConfirm={confirmDeleteFaq}/>
  </PageLayout>;

  return (
    <PageLayout
      title="자주 묻는 질문"
      className="support-page support-page--faq"
      description="궁금한 내용을 찾아보고, 해결되지 않으면 비공개 문의를 남겨 주세요."
    >
      {!isListLoading && !loadError && faqPage.totalElements === 0 && !appliedFilters.keyword && !appliedFilters.category && <section className="support-panel" aria-label="빠른 이용 안내">
        <h2>빠른 이용 안내</h2>
        <p>계정에 접근할 수 없거나 개인 정보 확인이 필요하면 <Link to="/qna/private">비공개 문의</Link>를 이용하세요. 로그인 없이도 접수할 수 있습니다.</p>
        <p>식당 등록은 <Link to="/business">입점 안내</Link>를 확인한 뒤 로그인하고 신청해 주세요.</p>
        <p>로그인하고 남긴 문의는 <Link to="/qna/my">내 문의</Link>에서 확인할 수 있습니다.</p>
      </section>}
      {(isListLoading || loadError || faqPage.totalElements > 0 || appliedFilters.keyword || appliedFilters.category) && <>
      <div className="faq-topline">
        <strong>
          전체 {faqPage.totalElements}건 중 {faqPosts.length}건 표시
        </strong>
        <span>{faqResultCaption}</span>
      </div>

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

      <div className="faq-columns faq-columns--public">
        <section
          className="faq-public-board"
          aria-label="FAQ 게시판"
        >


          <div className="faq-public-list">
            {isListLoading && faqPosts.length === 0 ? (
              <div className="board-empty">FAQ 목록을 불러오는 중입니다.</div>
            ) : faqPosts.length === 0 ? (
              <div className="board-empty">
                <p>{appliedFilters.category || appliedFilters.keyword ? '조회된 FAQ가 없습니다. 분류나 검색어를 바꿔 다시 확인해 주세요.' : '자주 묻는 질문을 준비하고 있습니다.'}</p>
                <Link to="/qna/private">궁금한 내용은 비공개 1:1 문의로 남겨 주세요.</Link>
              </div>
            ) : (
              faqPosts.map((post) => {
                const isSelected = selectedFaqId === post.faqId;
                const detail = isSelected && selectedFaqDetail?.faqId === post.faqId ? selectedFaqDetail : post;

                return (
                  <details
                    key={post.faqId}
                    className={`faq-public-item ${isSelected ? "faq-public-item--selected" : ""}`}
                    open={isSelected || post.isPinned}
                  >
                    <summary
                      className="faq-public-item__summary"
                      onClick={() => setSelectedFaqId(post.faqId)}
                    >
                      <span className={post.isPinned ? "board-badge board-badge--notice" : "board-badge"}>
                        {toCategoryLabel(post.category)}
                      </span>
                      <span className="faq-public-item__title">
                        {post.isPinned ? <strong>[고정]</strong> : null}
                        {post.title}
                      </span>

                    </summary>

                    <div className="faq-public-item__content">
                      <div className="faq-public-item__answer-label">
                        답변
                      </div>
                      <div className="faq-public-item__body">
                        <p>
                          {isSelected && isDetailLoading
                            ? "상세 내용을 불러오는 중입니다."
                            : detail?.answer || "답변 내용이 없습니다."}
                        </p>

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
