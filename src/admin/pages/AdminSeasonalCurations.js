import React, { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "../components/AdminPageHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import PermissionGuard from "../components/PermissionGuard";
import StatusBadge from "../components/StatusBadge";
import { ADMIN_PERMISSIONS } from "../constants/adminPermissions";
import {
  createSeasonalCuration,
  deleteSeasonalCuration,
  getSeasonalCuration,
  getSeasonalCurations,
  publishSeasonalCuration,
  unpublishSeasonalCuration,
  reorderSeasonalCurations,
  updateSeasonalCuration,
  uploadSeasonalCurationFile,
} from "../api/seasonalCurationApi";

import {Link} from "react-router-dom";
import {getPublishedSeasonalFoodOptions} from "../api/seasonalFoodApi";

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "DRAFT", label: "초안" },
  { value: "SCHEDULED", label: "예약" },
  { value: "PUBLISHED", label: "발행" },
  { value: "ARCHIVED", label: "보관" },
];

const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.filter((option) => option.value).map((option) => [option.value, option.label])
);

const SEASONAL_TERMS = [
  "소한", "대한", "입춘", "우수", "경칩", "춘분", "청명", "곡우",
  "입하", "소만", "망종", "하지", "소서", "대서", "입추", "처서",
  "백로", "추분", "한로", "상강", "입동", "소설", "대설", "동지",
];

const EMPTY_FORM = {
  id: null,
  seasonalFoodId: "",
  title: "",
  headline: "",
  description: "",
  subcopy: "",
  month: "",
  seasonalTerm: "",
  category: "",
  cardImageUrl: "",
  cardImageMobileUrl: "",
  cardImageFile: null,
  cardImageMobileFile: null,
  startsAt: "",
  endsAt: "",
  storeIds: "",
  menuIds: "",
  displayOrder: "0",
  version: null,
  status: "DRAFT",
};

function AdminSeasonalCurations() {
  const [foodOptions, setFoodOptions] = useState([]);
  const [foodError, setFoodError] = useState(false);
  useEffect(() => {let live = true; getPublishedSeasonalFoodOptions().then(items => {if(live) setFoodOptions(items);}).catch(() => {if(live) setFoodError(true);}); return () => {live = false;};}, []);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState({
    content: [], page: 0, size: 20, totalElements: 0, totalPages: 1, hasNext: false,
  });
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const isEditing = Boolean(form.id);
  const loadPage = useCallback(async (nextPage = 0, nextStatus = status) => {
    setIsLoading(true);
    try {
      setPage(await getSeasonalCurations({ page: nextPage, size: 20, status: nextStatus }));
    } catch (error) {
      showError(error, setMessage, setMessageType, "제철 큐레이션 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [status]);

  useEffect(() => {
    loadPage(0, status);
  }, [loadPage, status]);

  function startCreate() {
    setForm(EMPTY_FORM);
    setMessage("");
  }

  async function startEdit(id) {
    setIsDetailLoading(true);
    setMessage("");
    try {
      setForm(toForm(await getSeasonalCuration(id)));
    } catch (error) {
      showError(error, setMessage, setMessageType, "제철 큐레이션 상세를 불러오지 못했습니다.");
    } finally {
      setIsDetailLoading(false);
    }
  }

  function updateField(field, value) {
    setForm((current) => {
      if (field === "seasonalFoodId") {
        const selected = foodOptions.find(food => String(food.id) === String(value));
        return {...current, seasonalFoodId: value, title: current.title || selected?.nameKo || ""};
      }
      return {...current, [field]: value};
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    try {
      const [cardImage, cardImageMobile] = await Promise.all([
        form.cardImageFile ? uploadSeasonalCurationFile(form.cardImageFile) : null,
        form.cardImageMobileFile ? uploadSeasonalCurationFile(form.cardImageMobileFile) : null,
      ]);
      const command = {
        ...toCommand(form),
        seasonalFoodId: Number(form.seasonalFoodId),
        independentImages: true,
        cardImageUrl: cardImage?.fileUrl || emptyToNull(form.cardImageUrl),
        cardImageMobileUrl: cardImageMobile?.fileUrl || emptyToNull(form.cardImageMobileUrl),
      };
      const saved = isEditing
        ? await updateSeasonalCuration(form.id, command)
        : await createSeasonalCuration(command);
      setForm(toForm(saved));
      setMessageType("success");
      setMessage(isEditing ? "제철 큐레이션을 수정했습니다." : "제철 큐레이션을 등록했습니다.");
      await loadPage(page.page, status);
    } catch (error) {
      showError(error, setMessage, setMessageType, "제철 큐레이션을 저장하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function executeAction() {
    if (!pendingAction) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      if (pendingAction.type === "publish") {
        const published = await publishSeasonalCuration(pendingAction.item.id, pendingAction.item.version);
        setForm(toForm(published));
        setMessage("제철 큐레이션을 발행했습니다.");
      } else if (pendingAction.type === "unpublish") {
        setForm(toForm(await unpublishSeasonalCuration(pendingAction.item.id, pendingAction.item.version)));
        setMessage("PICK 발행을 해제했습니다.");
      } else {
        await deleteSeasonalCuration(pendingAction.item.id, pendingAction.item.version);
        if (form.id === pendingAction.item.id) setForm(EMPTY_FORM);
        setMessage("제철 큐레이션을 삭제했습니다.");
      }
      setMessageType("success");
      setPendingAction(null);
      await loadPage(page.page, status);
    } catch (error) {
      showError(error, setMessage, setMessageType, "요청을 처리하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function moveItem(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= page.content.length) return;
    const reordered = [...page.content];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setIsSubmitting(true);
    try {
      await reorderSeasonalCurations(
        reordered.map((item, displayOrder) => ({
          curationId: item.id,
          displayOrder,
          version: item.version,
        }))
      );
      setMessageType("success");
      setMessage("노출 순서를 변경했습니다.");
      await loadPage(page.page, status);
    } catch (error) {
      showError(error, setMessage, setMessageType, "노출 순서를 변경하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="admin-page admin-seasonal-page">
      <AdminPageHeader
        eyebrow="PLATE SEASONAL"
        title="제철 큐레이션"
        description="앱 상단 접시 PICK에 소개할 식재료와 추천 문구·이미지·노출 순서를 관리합니다."
        actions={
          <PermissionGuard permission={ADMIN_PERMISSIONS.SEASONAL_MANAGE}>
            <button type="button" className="admin-button admin-button--primary" onClick={startCreate}>
              새 큐레이션
            </button>
          </PermissionGuard>
        }
      />

      {message ? (
        <div className={messageType === "error" ? "api-status api-status--error" : "api-status api-status--success"}>
          {message}
        </div>
      ) : null}

      <p className="admin-field-hint">앱 상단 접시 PICK에 노출할 식재료를 선택하고 발행하세요. 월·절기·기간과 원본 제철 조건에 맞는 추천이 순서대로 최대 3개 표시됩니다. <Link to="/admin/seasonal-foods">원본 정보·이미지 수정은 식재료 관리에서</Link></p>
      {foodError ? <p role="alert">식재료 선택 목록을 불러오지 못했습니다. 페이지를 새로고침해 주세요.</p> : null}
      <section className="admin-card admin-seasonal-toolbar">
        <label className="admin-field">
          <span>상태</span>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value || "all"} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <span>총 {page.totalElements.toLocaleString()}개</span>
      </section>

      <div className="admin-seasonal-layout">
        <section className="admin-card admin-seasonal-list" aria-label="제철 큐레이션 목록">
          {isLoading ? (
            <div className="admin-empty-state">목록을 불러오는 중입니다.</div>
          ) : page.content.length === 0 ? (
            <div className="admin-empty-state">등록된 제철 큐레이션이 없습니다.</div>
          ) : (
            page.content.map((item, index) => (
              <article key={item.id} className={item.id === form.id ? "admin-seasonal-item is-selected" : "admin-seasonal-item"}>
                <button type="button" className="admin-seasonal-item__main" onClick={() => startEdit(item.id)}>
                  <span>{item.month ? `${item.month}월` : "월 미지정"}{item.seasonalTerm ? ` · ${item.seasonalTerm}` : ""}</span>
                  <strong>{item.title}</strong>
                  <small>{item.headline || item.category || "부가 설명 없음"}</small>
                </button>
                <StatusBadge status={String(item.status || "").toLowerCase()} label={STATUS_LABELS[item.status] || item.status} />
                <PermissionGuard permission={ADMIN_PERMISSIONS.SEASONAL_MANAGE}>
                  <div className="admin-seasonal-item__actions">
                    <button type="button" onClick={() => moveItem(index, -1)} disabled={index === 0 || isSubmitting} aria-label={`${item.title} 위로 이동`}>↑</button>
                    <button type="button" onClick={() => moveItem(index, 1)} disabled={index === page.content.length - 1 || isSubmitting} aria-label={`${item.title} 아래로 이동`}>↓</button>
                    {["PUBLISHED", "SCHEDULED"].includes(item.status) ? <button type="button" onClick={() => setPendingAction({type: "unpublish", item})} disabled={isSubmitting}>발행 해제</button> : item.status !== "ARCHIVED" ? (
                      <button type="button" onClick={() => setPendingAction({ type: "publish", item })} disabled={isSubmitting}>발행</button>
                    ) : null}
                    <button type="button" onClick={() => setPendingAction({ type: "delete", item })} disabled={isSubmitting}>삭제</button>
                  </div>
                </PermissionGuard>
              </article>
            ))
          )}

          <div className="admin-pagination">
            <button type="button" onClick={() => loadPage(Math.max(0, page.page - 1), status)} disabled={page.page === 0 || isLoading}>이전</button>
            <strong>{page.page + 1} / {page.totalPages}</strong>
            <button type="button" onClick={() => loadPage(page.page + 1, status)} disabled={!page.hasNext || isLoading}>다음</button>
          </div>
        </section>

        <PermissionGuard
          permission={ADMIN_PERMISSIONS.SEASONAL_MANAGE}
          fallback={<section className="admin-card admin-empty-state">조회 권한만 있어 콘텐츠를 편집할 수 없습니다.</section>}
        >
          <SeasonalEditor
            foodOptions={foodOptions}
            form={form}
            isEditing={isEditing}
            isLoading={isDetailLoading}
            isSubmitting={isSubmitting}
            onChange={updateField}
            onSubmit={handleSubmit}
          />
        </PermissionGuard>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.type === "unpublish" ? "PICK 발행 해제" : pendingAction?.type === "publish" ? "제철 큐레이션 발행" : "제철 큐레이션 삭제"}
        description={
          pendingAction?.type === "unpublish" ? "앱 추천 노출을 중단하고 초안으로 되돌립니다. 식재료 원본은 유지됩니다." : pendingAction?.type === "publish"
            ? `${pendingAction?.item?.title || "선택한 콘텐츠"}을 운영 환경에 발행할까요?`
            : `${pendingAction?.item?.title || "선택한 콘텐츠"}을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
        }
        confirmLabel={pendingAction?.type === "unpublish" ? "발행 해제" : pendingAction?.type === "publish" ? "발행하기" : "삭제하기"}
        isSubmitting={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={executeAction}
      />
    </div>
  );
}

function SeasonalEditor({ foodOptions, form, isEditing, isLoading, isSubmitting, onChange, onSubmit }) {
  if (isLoading) {
    return <section className="admin-card admin-empty-state">상세 정보를 불러오는 중입니다.</section>;
  }

  return (
    <form className="admin-card admin-seasonal-editor" onSubmit={onSubmit}>
      <header>
        <span>{isEditing ? "EDIT CURATION" : "NEW CURATION"}</span>
        <h2>{isEditing ? form.title || "제철 큐레이션 수정" : "제철 큐레이션 등록"}</h2>
        {isEditing ? <StatusBadge status={form.status.toLowerCase()} label={STATUS_LABELS[form.status] || form.status} /> : null}
      </header>

      <div className="admin-seasonal-form-grid">
        <Field label="추천 식재료" required wide><select required value={form.seasonalFoodId} onChange={event => onChange("seasonalFoodId", event.target.value)}><option value="">식재료 선택</option>{foodOptions.map(food => <option key={food.id} value={food.id}>{food.nameKo}</option>)}</select></Field>
        <Field label="제목" required wide><input aria-label="제목 *" value={form.title} maxLength={150} required onChange={(event) => onChange("title", event.target.value)} /><small>관리 목록용 제목입니다. 앱에는 선택한 식재료 이름이 표시됩니다.</small></Field>
        <Field label="헤드라인" wide><input value={form.headline} maxLength={300} onChange={(event) => onChange("headline", event.target.value)} /></Field>
        <Field label="월" required><select value={form.month} required onChange={(event) => onChange("month", event.target.value)}><option value="">선택</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}</select></Field>
        <Field label="절기"><select value={form.seasonalTerm} onChange={(event) => onChange("seasonalTerm", event.target.value)}><option value="">선택 안 함</option>{SEASONAL_TERMS.map((term) => <option key={term} value={term}>{term}</option>)}</select></Field>
        <Field label="노출 순서"><input type="number" min="0" value={form.displayOrder} onChange={(event) => onChange("displayOrder", event.target.value)} /></Field>
        <Field label="시작 일시"><input type="datetime-local" value={form.startsAt} onChange={(event) => onChange("startsAt", event.target.value)} /></Field>
        <Field label="종료 일시"><input type="datetime-local" value={form.endsAt} onChange={(event) => onChange("endsAt", event.target.value)} /></Field>
        <ImageUploadField
          label="PICK 대표 이미지 (비우면 원본 사용)"
          file={form.cardImageFile}
          currentUrl={form.cardImageUrl}
          onFileChange={(file) => onChange("cardImageFile", file)}
          onUrlChange={(value) => onChange("cardImageUrl", value)}
        />
        <ImageUploadField
          label="PICK 모바일 이미지 (비우면 대표 이미지 사용)"
          file={form.cardImageMobileFile}
          currentUrl={form.cardImageMobileUrl}
          onFileChange={(file) => onChange("cardImageMobileFile", file)}
          onUrlChange={(value) => onChange("cardImageMobileUrl", value)}
        />
        <Field label="앱 추천 문구" wide><textarea rows="3" value={form.subcopy} maxLength={5000} onChange={(event) => onChange("subcopy", event.target.value)} /></Field>
      </div>

      <div className="admin-drawer-actions">
        <button type="submit" className="admin-button admin-button--primary" disabled={isSubmitting}>
          {isSubmitting ? "저장 중" : isEditing ? "수정 저장" : "등록하기"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, required = false, wide = false, children }) {
  return <label className={`admin-field${wide ? " admin-seasonal-field--wide" : ""}`}><span>{label}{required ? " *" : ""}</span>{children}</label>;
}

function ImageUploadField({ label, file, currentUrl, onFileChange, onUrlChange }) {
  const [previewUrl, setPreviewUrl] = useState(currentUrl || "");

  useEffect(() => {
    if (!file) {
      setPreviewUrl(currentUrl || "");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [currentUrl, file]);

  return (
    <div className="admin-seasonal-field--wide admin-seasonal-image-field">
      <span>{label}</span>
      <div className="admin-seasonal-image-field__content">
        {previewUrl ? <img src={previewUrl} alt={`${label} 미리보기`} /> : <div>이미지 미리보기</div>}
        <div>
          <label className="admin-button admin-button--secondary">
            이미지 선택
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => onFileChange(event.target.files?.[0] || null)}
            />
          </label>
          {file ? <small>{file.name} · {(file.size / 1024 / 1024).toFixed(2)}MB</small> : null}
          <input
            type="url"
            value={currentUrl || ""}
            maxLength={1000}
            onChange={(event) => onUrlChange(event.target.value)}
            placeholder="기존 이미지 URL 또는 직접 입력"
          />
          <small>JPEG, PNG, WebP · 최대 10MB</small>
        </div>
      </div>
    </div>
  );
}

function toForm(item = {}) {
  return {
    ...EMPTY_FORM,
    ...item,
    seasonalFoodId: item.seasonalFoodId == null ? "" : String(item.seasonalFoodId),
    month: item.month == null ? "" : String(item.month),
    displayOrder: item.displayOrder == null ? "0" : String(item.displayOrder),
    startsAt: toDateTimeLocal(item.startsAt),
    endsAt: toDateTimeLocal(item.endsAt),
    storeIds: (item.storeIds || []).join(", "),
    menuIds: (item.menuIds || []).join(", "),
  };
}

function toCommand(form) {
  return {
    title: form.title.trim(),
    description: emptyToNull(form.description),
    displayOrder: Math.max(0, Number(form.displayOrder) || 0),
    startsAt: toOffsetDateTime(form.startsAt),
    endsAt: toOffsetDateTime(form.endsAt),
    storeIds: parseIds(form.storeIds),
    menuIds: parseIds(form.menuIds),
    version: form.version,
    month: form.month ? Number(form.month) : null,
    seasonalTerm: emptyToNull(form.seasonalTerm),
    category: emptyToNull(form.category),
    cardImageUrl: emptyToNull(form.cardImageUrl),
    cardImageMobileUrl: emptyToNull(form.cardImageMobileUrl),
    headline: emptyToNull(form.headline),
    subcopy: emptyToNull(form.subcopy),
  };
}

function parseIds(value) {
  if (!String(value || "").trim()) return [];
  const ids = String(value).split(",").map((item) => Number(item.trim()));
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
    throw new Error("매장 ID와 메뉴 ID는 쉼표로 구분한 양의 정수여야 합니다.");
  }
  return [...new Set(ids)];
}

function emptyToNull(value) {
  const normalized = String(value || "").trim();
  return normalized || null;
}

function toOffsetDateTime(value) {
  return value ? new Date(value).toISOString() : null;
}

function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function showError(error, setMessage, setMessageType, fallback) {
  setMessageType("error");
  setMessage(error?.message || fallback);
}

export default AdminSeasonalCurations;
