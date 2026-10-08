import { captureAuthSession } from "../../api";
import React, {useCallback, useEffect, useRef, useState} from "react";
import AdminPageHeader from "../components/AdminPageHeader";
import {ADMIN_PERMISSIONS, userHasAdminPermission} from "../constants/adminPermissions";
import {useAuth} from "../../auth/AuthContext";
import {getAllSeasonalFoods, updateSeasonalFood, createSeasonalFood, deleteSeasonalFood, getSeasonalFood} from "../api/seasonalFoodApi";
import {uploadSeasonalCurationFile} from "../api/seasonalCurationApi";
import "./SeasonalFoods.css";
import UnsavedChangesGuard from "../../components/UnsavedChangesGuard";

const TEXT_FIELDS = [["shortDescription", "소개", "어떤 맛과 매력이 있는 음식인가요?"], ["selectionGuide", "고르는 법", "신선한 재료를 알아보는 방법을 알려 주세요."], ["storageGuide", "보관법", "보관 장소와 방법을 적어 주세요."], ["cautionText", "주의사항", "손질·섭취 시 주의할 내용을 적어 주세요."], ["afterSeasonText", "제철이 지난 후 안내", "제철이 아닐 때 보여줄 안내를 적어 주세요."]];
const IMAGES = [["representativeImageUrl", "대표 이미지", "imagePreviewUrl"], ["representativeImageMobileUrl", "모바일 이미지", "mobileImagePreviewUrl"]];
const STATUS = {PUBLISHED: "공개", DRAFT: "초안", ARCHIVED: "보관"};
const CATEGORIES = {CRUSTACEAN: "갑각류", FISH: "생선", SHELLFISH: "조개류", VEGETABLE: "채소", FRUIT: "과일", SEAWEED: "해조류", WILD_GREEN: "나물", GRAIN: "곡물", OTHER: "기타"};
const categoryName = value => CATEGORIES[value] || value || "미분류";
const normalized = food => ({...food, months: food.months || [], ...Object.fromEntries([...TEXT_FIELDS, ...IMAGES].map(([key]) => [key, food[key] || ""]))});
const blankFood = () => normalized({id: null, nameKo: "", categoryCode: "", status: "DRAFT", months: []});

export default function AdminSeasonalFoods() {
  const {user} = useAuth();
  const canManage = userHasAdminPermission(user, ADMIN_PERMISSIONS.SEASONAL_MANAGE);
  const [foods, setFoods] = useState([]);
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState(null);
  const [files, setFiles] = useState({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteDialog = useRef(null);
  const newName = useRef(null);
  const request = useRef(0);
  const creating = Boolean(form && form.id == null);
  const dirty = Boolean(form && (JSON.stringify(form) !== JSON.stringify(baseline) || Object.values(files).some(Boolean)));
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setLoadError("");
    try {const result = await getAllSeasonalFoods(); if (id === request.current) setFoods(result);}
    catch (error) {if (id === request.current) setLoadError(error.message || "음식 목록을 불러오지 못했습니다.");}
    finally {if (id === request.current) setLoading(false);}
  }, []);
  useEffect(() => {load(); const sequence = request; return () => {sequence.current++;};}, [load]);
  useEffect(() => {if (creating) newName.current?.focus();}, [creating]);
  useEffect(() => {if (deleteOpen) deleteDialog.current?.showModal?.();}, [deleteOpen]);
  async function select(food) {
    if (saving || (dirty && !window.confirm("저장하지 않은 변경 내용을 버리고 이동할까요?"))) return;
    let next;
    try {
      if (food?.id != null) {setSaving(true); next = normalized(await getSeasonalFood(food.id));}
      else next = food ? normalized(food) : null;
    } catch (error) {setNotice({type: "error", text: error.message || "최신 정보를 불러오지 못했습니다."}); return;}
    finally {setSaving(false);}
    setForm(next); setBaseline(next); setFiles({}); setNotice(null);
  }
  function change(key, value) {setForm(current => ({...current, [key]: value}));}
  async function save(event) {
    event.preventDefault();
    const assertSession = captureAuthSession();
    if (saving || !canManage || !form) return;
    setSaving(true); setNotice(null);
    try {
      const images = {};
      for (const [key] of IMAGES) {
        const value = form[key].trim();
        if (value && !files[key] && value !== baseline[key]) {
          let url;
          try {url = new URL(value);} catch {throw new Error("이미지 주소는 HTTPS 주소를 입력해 주세요.");}
          if (url.protocol !== "https:" || url.username || url.password) throw new Error("이미지 주소는 HTTPS 주소를 입력해 주세요.");
        }
        images[key] = files[key] ? (await uploadSeasonalCurationFile(files[key])).fileUrl : value || null;
        if (files[key] && !images[key]) throw new Error("이미지 업로드 결과를 확인하지 못했습니다. 다시 시도해 주세요.");
      }
      const command = {version: form.version, ...images, nameKo: form.nameKo.trim(), categoryCode: form.categoryCode};
      if (creating || JSON.stringify(form.months) !== JSON.stringify(baseline.months)) command.months = form.months;
      if (!creating && form.status !== baseline.status) command.status = form.status;
      TEXT_FIELDS.forEach(([key]) => {command[key] = form[key].trim() || null;});
      assertSession();
      const saved = normalized(await (creating ? createSeasonalFood(command) : updateSeasonalFood(form.id, command)));
      setForm(saved); setBaseline(saved); setFiles({});
      setFoods(current => creating ? [...current, saved] : current.map(food => food.id === saved.id ? saved : food));
      setNotice({type: "success", text: creating ? "음식을 초안으로 등록했습니다. 검토 후 공개 상태로 변경해 주세요." : "식재료를 저장했습니다."});
    } catch (error) {
      setNotice({type: "error", text: error.status === 409 ? `${error.message || "저장 요청이 충돌했습니다."} 입력 내용은 유지했습니다. 최신 항목을 다시 확인해 주세요.` : error.message || "저장하지 못했습니다. 다시 시도해 주세요."});
    } finally {setSaving(false);}
  }
  async function removeFood() {
    if (saving || !canManage || !form?.id) return;
    setSaving(true); setNotice(null);
    try {
      await deleteSeasonalFood(form.id, form.version);
      setFoods(current => current.filter(food => food.id !== form.id));
      setForm(null); setBaseline(null); setFiles({}); setDeleteOpen(false);
      setNotice({type: "success", text: "음식을 삭제했습니다."});
    } catch (error) {setDeleteOpen(false); setNotice({type: "error", text: error.message || "삭제하지 못했습니다."});}
    finally {setSaving(false);}
  }
  const visible = foods.filter(food => (!status || food.status === status) && (!category || food.categoryCode === category) && `${food.nameKo} ${food.shortDescription || ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const categories = [...new Set(foods.map(food => food.categoryCode).filter(Boolean))];
  return <div className="admin-page seasonal-foods-page">
    <UnsavedChangesGuard when={dirty} pending={saving} />
    <AdminPageHeader eyebrow="SEASONAL FOOD LIBRARY" title="제철 음식 관리" description="계절마다 찾게 되는 음식, 한곳에서 정리하세요." actions={<><button className="admin-button" onClick={load} disabled={loading || saving}>목록 새로고침</button>{canManage && <button className="admin-button admin-button--primary" onClick={() => select(blankFood())} disabled={saving}>＋ 음식 등록</button>}</>} />
    <section className="food-library-intro" aria-label="음식 관리 현황"><div><span>OUR SEASONAL TABLE</span><h2>좋은 음식의 이야기를 채우는 곳</h2><p>음식을 찾아 선택하고, 사진과 소개를 함께 살펴보며 편집하세요.</p></div><div className="food-library-count"><strong>{foods.length}</strong><span>등록된 음식</span><small>공개 {foods.filter(food => food.status === "PUBLISHED").length} · 초안 {foods.filter(food => food.status === "DRAFT").length}</small></div></section>
    {notice && <div role={notice.type === "error" ? "alert" : "status"} className={`api-status api-status--${notice.type}`}>{notice.text}</div>}
    <div className={`food-workspace${form ? " has-selection" : ""}`}>
      <section id="food-library" className="food-library" aria-label="제철 음식 목록">
        <div className="food-library-tools"><label><span>음식 검색</span><input type="search" placeholder="음식 이름 또는 소개 검색" value={query} onChange={event => setQuery(event.target.value)} /></label><div><label><span>공개 상태</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="">모든 상태</option>{Object.entries(STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label><span>분류</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="">모든 분류</option>{categories.map(key => <option key={key} value={key}>{categoryName(key)}</option>)}</select></label></div></div>
        <p className="food-results" role="status">{loading ? "음식을 불러오는 중…" : `${visible.length}개의 음식`}</p>
        {loadError ? <div role="alert" className="food-empty"><p>{loadError}</p><button onClick={load}>다시 불러오기</button></div> : loading ? <div className="food-empty">목록을 준비하고 있습니다.</div> : visible.length ? <div className="food-card-grid">{visible.map(food => <button className="food-card" key={food.id} aria-pressed={form?.id === food.id} onClick={() => select(food)} disabled={saving}><FoodImage url={food.imagePreviewUrl || food.representativeImageUrl} alt="" /><div><small>{categoryName(food.categoryCode)}<span>{STATUS[food.status] || food.status}</span></small><h3>{food.nameKo}</h3><p>{food.shortDescription || "소개를 작성해 주세요."}</p><span className="food-card-action">{form?.id === food.id ? "선택한 음식" : "자세히 보기"} ↗</span></div></button>)}</div> : <div className="food-empty"><h3>{foods.length ? "검색 결과가 없습니다" : "등록된 음식이 없습니다"}</h3><p>검색어나 필터를 확인해 주세요.</p>{(query || status || category) && <button onClick={() => {setQuery(""); setStatus(""); setCategory("");}}>필터 초기화</button>}</div>}
      </section>
      {form && <form id="food-editor" className="food-editor" onSubmit={save}>
        <header><div><span>{creating ? "NEW SEASONAL FOOD" : `${canManage ? "음식 편집" : "음식 상세"} · #${form.id}`}</span><h2>{creating ? form.nameKo || "새 음식 등록" : form.nameKo}</h2><p>{creating ? "이름과 제철 정보를 먼저 채워 주세요." : `${categoryName(form.categoryCode)} · ${STATUS[form.status] || form.status}`}</p></div><button type="button" aria-label="음식 상세 닫기" onClick={() => select(null)} disabled={saving}>×</button></header>
        {!canManage && <p className="food-helper">조회 권한으로 열람 중입니다.</p>}

        <nav className="food-editor-jumps" aria-label="음식 편집 위치"><a href="#food-library">목록</a><a href="#food-basics">기본 정보</a><a href="#food-story">음식 이야기</a><a href="#food-photos">사진</a></nav>
        <fieldset disabled={saving || !canManage}><legend>음식 정보</legend>
          <section id="food-basics" className="food-editor-section"><h3>01 · 기본 정보</h3><label className="food-input"><span>음식 이름 *</span><input ref={newName} aria-label="음식 이름" maxLength={100} required value={form.nameKo} onChange={event => change("nameKo", event.target.value)} placeholder="예: 대하" /></label><label className="food-input"><span>음식 분류 *</span><select aria-label="음식 분류" value={form.categoryCode} onChange={event => change("categoryCode", event.target.value)} required><option value="">분류 선택</option>{Object.entries(CATEGORIES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><div className="food-input"><span>제철 월 · 여러 달 선택 가능</span><div className="food-months">{Array.from({length: 12}, (_, i) => i + 1).map(month => <label key={month}><input type="checkbox" disabled={!creating && !form.monthsEditable} checked={form.months.includes(month)} onChange={event => change("months", event.target.checked ? [...form.months, month].sort((a,b) => a-b) : form.months.filter(value => value !== month))} /><span>{month}월</span></label>)}</div></div><p className="food-helper">{creating ? "새 음식은 초안으로 등록됩니다." : form.monthsEditable ? "제철 월은 전국 기준으로 저장됩니다." : "날짜·지역·출처가 있는 기존 제철 정보는 보존됩니다. 이 화면에서는 월을 변경할 수 없습니다."}</p>{!creating && <label className="food-input"><span>공개 상태 변경</span><select aria-label="공개 상태 변경" value={form.status} onChange={event => change("status", event.target.value)}>{Object.entries(STATUS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select><small>공개하려면 소개·대표 이미지·제철 기간이 필요합니다. 보관하면 앱 카탈로그에서 숨겨집니다.</small></label>}</section>
          <section id="food-story" className="food-editor-section"><h3>02 · 음식 이야기</h3>{TEXT_FIELDS.map(([key, label, placeholder], index) => <label className="food-input" key={key}><span>{label}</span><textarea aria-label={label} rows={index === 0 ? 4 : 3} maxLength={5000} placeholder={placeholder} value={form[key]} onChange={event => change(key, event.target.value)} /><small>{form[key].length.toLocaleString()} / 5,000</small></label>)}</section>
          <section id="food-photos" className="food-editor-section"><h3>03 · 음식 사진</h3><p className="food-helper">대표 사진과 모바일 사진을 관리합니다. 선택한 파일이 URL보다 우선합니다.</p>{IMAGES.map(([key, label, preview]) => <FoodImageInput key={`${form.id}-${form.version}-${key}`} label={label} value={form[key]} preview={form[key] === baseline[key] ? form[preview] || form[key] : form[key]} file={files[key]} onFile={file => setFiles(current => ({...current, [key]: file}))} onChange={value => change(key, value)} />)}</section>
        </fieldset>
        {canManage && <footer className="food-editor-actions"><span>{creating ? "초안으로 등록" : dirty ? "저장하지 않은 변경 사항" : "저장된 내용"}</span><div>{!creating && <button type="button" className="food-delete" onClick={() => setDeleteOpen(true)} disabled={saving}>음식 삭제</button>}<button type="submit" className="admin-button admin-button--primary" disabled={saving || !dirty}>{saving ? "저장 중…" : creating ? "초안 등록" : "식재료 저장"}</button></div></footer>}
      </form>}
    </div>
    {deleteOpen && <dialog ref={deleteDialog} className="food-delete-dialog" aria-labelledby="food-delete-title" onCancel={() => setDeleteOpen(false)}><h2 id="food-delete-title">{form?.nameKo} 삭제</h2><p>연결된 추천과 앱 노출에 영향을 줄 수 있어, 삭제 전 사용 여부를 확인해야 합니다.</p><p>삭제하면 되돌릴 수 없습니다. 연결된 콘텐츠가 있으면 삭제가 제한됩니다.</p><div><button className="admin-button" autoFocus disabled={saving} onClick={() => {deleteDialog.current?.close?.(); setDeleteOpen(false);}}>돌아가기</button><button className="admin-button" disabled={saving} onClick={removeFood}>{saving ? "삭제 중…" : "삭제 확인"}</button></div></dialog>}
  </div>;
}

function FoodImage({url, alt}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  return url && !failed ? <img src={url} alt={alt} loading="lazy" onError={() => setFailed(true)} /> : <div className="food-image-placeholder" aria-label="등록된 이미지 없음"><span>◯</span><small>계절의 맛을 담아 주세요</small></div>;
}

function FoodImageInput({label, value, preview, file, onFile, onChange}) {
  const [local, setLocal] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {if (!file) {setLocal(""); return;} const url = URL.createObjectURL(file); setLocal(url); return () => URL.revokeObjectURL(url);}, [file]);
  return <div className="food-image-input"><h4>{label}</h4><FoodImage url={local || preview} alt={label} /><label className="food-file-button">사진 선택<input aria-label={`${label} 파일`} type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {const next = event.target.files?.[0]; event.target.value = ""; if (!next) return; if (!["image/jpeg", "image/png", "image/webp"].includes(next.type) || next.size > 10 * 1024 * 1024) {setError("JPEG·PNG·WebP, 10MB 이하 파일을 선택해 주세요."); return;} setError(""); onFile(next);}} /></label>{file && <div><small>{file.name}</small><button type="button" onClick={() => onFile(null)}>파일 선택 취소</button></div>}<label className="food-input"><span>{label} URL</span><input aria-label={`${label} URL`} type="url" maxLength={1000} placeholder="https://" value={value} onChange={event => onChange(event.target.value)} /></label>{(file || value) && <button type="button" onClick={() => {onFile(null); onChange(""); setError("");}}>이미지 지정 해제</button>}<small>JPEG · PNG · WebP / 최대 10MB</small>{error && <p role="alert">{error}</p>}</div>;
}
