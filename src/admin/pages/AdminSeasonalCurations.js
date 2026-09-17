import React, { useCallback, useEffect, useState } from "react";
import AdminPageHeader from "../components/AdminPageHeader";
import ConfirmDialog from "../components/ConfirmDialog";
import PermissionGuard from "../components/PermissionGuard";
import StatusBadge from "../components/StatusBadge";
import { ADMIN_PERMISSIONS } from "../constants/adminPermissions";
import {
  createSeasonalCuration,
  importSeasonalFoods,
  deleteSeasonalCuration,
  getSeasonalCuration,
  getSeasonalCurations,
  publishSeasonalCuration,
  reorderSeasonalCurations,
  updateSeasonalCuration,
  uploadSeasonalCurationFile,
} from "../api/seasonalCurationApi";

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

  async function importFoods() {
    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await importSeasonalFoods();
      setMessageType("success");
      setMessage(`${result.created}개 식재료를 현재 관리자 계정의 초안으로 가져왔습니다. 항목을 선택해 이미지를 저장하면 앱 식재료에도 반영됩니다.`);
      setStatus("");
      await loadPage(0, "");
    } catch (error) {
      showError(error, setMessage, setMessageType, "식재료를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

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
    setForm((current) => ({ ...current, [field]: value }));
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
        description="월별 제철 음식 콘텐츠를 작성하고 노출 기간과 연결 매장·메뉴를 관리합니다."
        actions={
          <PermissionGuard permission={ADMIN_PERMISSIONS.SEASONAL_MANAGE}>
            <button type="button" className="admin-button" onClick={importFoods} disabled={isSubmitting || isLoading}>
              {isSubmitting ? "처리 중…" : "앱 식재료 가져오기"}
            </button>
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

      <p className="admin-field-hint">앱의 공용 식재료가 목록에 없다면 ‘앱 식재료 가져오기’를 눌러주세요. 기존 항목은 유지되며, 가져온 초안에서 이미지 저장만 해도 앱에 반영됩니다. 초안의 월은 관리용 대표 월이며 앱의 제철 기간은 변경되지 않습니다.</p>
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
                    {item.status !== "ARCHIVED" ? (
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
        title={pendingAction?.type === "publish" ? "제철 큐레이션 발행" : "제철 큐레이션 삭제"}
        description={
          pendingAction?.type === "publish"
            ? `${pendingAction?.item?.title || "선택한 콘텐츠"}을 운영 환경에 발행할까요?`
            : `${pendingAction?.item?.title || "선택한 콘텐츠"}을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`
        }
        confirmLabel={pendingAction?.type === "publish" ? "발행하기" : "삭제하기"}
        isSubmitting={isSubmitting}
        onCancel={() => setPendingAction(null)}
        onConfirm={executeAction}
      />
    </div>
  );
}

function SeasonalEditor({ form, isEditing, isLoading, isSubmitting, onChange, onSubmit }) {
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
        <Field label="제목" required wide><input value={form.title} maxLength={150} required onChange={(event) => onChange("title", event.target.value)} /></Field>
        <Field label="헤드라인" wide><input value={form.headline} maxLength={300} onChange={(event) => onChange("headline", event.target.value)} /></Field>
        <Field label="월" required><select value={form.month} required onChange={(event) => onChange("month", event.target.value)}><option value="">선택</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}</select></Field>
        <Field label="절기"><select value={form.seasonalTerm} onChange={(event) => onChange("seasonalTerm", event.target.value)}><option value="">선택 안 함</option>{SEASONAL_TERMS.map((term) => <option key={term} value={term}>{term}</option>)}</select></Field>
        <Field label="카테고리"><input value={form.category} maxLength={100} onChange={(event) => onChange("category", event.target.value)} placeholder="예: 봄나물" /></Field>
        <Field label="노출 순서"><input type="number" min="0" value={form.displayOrder} onChange={(event) => onChange("displayOrder", event.target.value)} /></Field>
        <Field label="시작 일시"><input type="datetime-local" value={form.startsAt} onChange={(event) => onChange("startsAt", event.target.value)} /></Field>
        <Field label="종료 일시"><input type="datetime-local" value={form.endsAt} onChange={(event) => onChange("endsAt", event.target.value)} /></Field>
        <ImageUploadField
          label="PC 카드 이미지"
          file={form.cardImageFile}
          currentUrl={form.cardImageUrl}
          onFileChange={(file) => onChange("cardImageFile", file)}
          onUrlChange={(value) => onChange("cardImageUrl", value)}
        />
        <ImageUploadField
          label="모바일 카드 이미지"
          file={form.cardImageMobileFile}
          currentUrl={form.cardImageMobileUrl}
          onFileChange={(file) => onChange("cardImageMobileFile", file)}
          onUrlChange={(value) => onChange("cardImageMobileUrl", value)}
        />
        <Field label="연결 매장 ID" wide><input value={form.storeIds} onChange={(event) => onChange("storeIds", event.target.value)} placeholder="예: 12, 15" /><small>쉼표로 구분합니다.</small></Field>
        <Field label="연결 메뉴 ID" wide><input value={form.menuIds} onChange={(event) => onChange("menuIds", event.target.value)} placeholder="예: 101, 104" /><small>선택한 매장에 속한 메뉴만 입력할 수 있습니다.</small></Field>
        <Field label="설명" wide><textarea rows="5" value={form.description} maxLength={5000} onChange={(event) => onChange("description", event.target.value)} /></Field>
        <Field label="카드 보조 문구" wide><textarea rows="3" value={form.subcopy} maxLength={5000} onChange={(event) => onChange("subcopy", event.target.value)} /></Field>
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
