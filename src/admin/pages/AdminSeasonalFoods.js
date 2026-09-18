import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Link} from 'react-router-dom';
import AdminPageHeader from '../components/AdminPageHeader';
import PermissionGuard from '../components/PermissionGuard';
import {ADMIN_PERMISSIONS} from '../constants/adminPermissions';
import {getSeasonalFoods, updateSeasonalFood} from '../api/seasonalFoodApi';
import {uploadSeasonalCurationFile} from '../api/seasonalCurationApi';

const fields = [['shortDescription', '소개'], ['selectionGuide', '고르는 법'], ['storageGuide', '보관법'], ['cautionText', '주의사항'], ['afterSeasonText', '제철이 지난 후 안내']];
export default function AdminSeasonalFoods() {
  const [page, setPage] = useState({content: [], page: 0, totalPages: 1});
  const [form, setForm] = useState(null);
  const [files, setFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef(0);
  const load = useCallback(async (index = 0) => {
    const id = ++request.current;
    setLoading(true);
    try { const data = await getSeasonalFoods(index); if (id === request.current) setPage(data); }
    catch { if (id === request.current) setMessage('식재료 목록을 불러오지 못했습니다. 다시 시도해 주세요.'); }
    finally { if (id === request.current) setLoading(false); }
  }, []);
  useEffect(() => {load(); return () => {request.current++;};}, [load]);
  function select(food) {setForm({...food}); setFiles({}); setMessage('');}
  async function save(event) {
    event.preventDefault(); setSaving(true); setMessage('');
    try {
      const images = {};
      for (const key of ['representativeImageUrl', 'representativeImageMobileUrl']) {
        images[key] = files[key] ? (await uploadSeasonalCurationFile(files[key])).fileUrl : form[key] || null;
        if (files[key] && !images[key]) throw new Error('upload');
      }
      const command = {version: form.version, ...images};
      fields.forEach(([key]) => {command[key] = form[key] || null;});
      const saved = await updateSeasonalFood(form.id, command);
      setForm(saved); setFiles({});
      setMessage('식재료를 저장했습니다. 앱 목록과 상세에 반영됩니다.');
      await load(page.page);
    } catch (error) {setMessage(error?.status === 409 || error?.response?.status === 409 ? '다른 관리자가 수정했습니다. 목록을 새로고침하고 항목을 다시 선택해 주세요.' : '저장하지 못했습니다. 입력과 파일 형식을 확인해 주세요. 충돌 시 목록을 새로고침하고 다시 선택해 주세요.');}
    finally {setSaving(false);}
  }
  return <div className="admin-page admin-seasonal-page">
    <AdminPageHeader eyebrow="SEASONAL INGREDIENTS" title="제철 식재료 관리" description="앱에 등록된 원본 식재료의 설명·보관 안내·이미지를 직접 수정합니다. 가져오기나 발행은 필요하지 않습니다." actions={<Link className="admin-button" to="/admin/seasonal-curations">접시 PICK 선정하기</Link>} />
    {message ? <p role="status" className="api-status">{message}</p> : null}
    <button className="admin-button" onClick={() => load(page.page)} disabled={loading || saving}>목록 새로고침</button>
    <div className="admin-seasonal-layout">
      <section className="admin-card" aria-label="제철 식재료 목록">
        {loading ? <p>불러오는 중…</p> : page.content.length ? page.content.map(food => <button className="admin-seasonal-item__main" key={food.id} onClick={() => select(food)} disabled={saving} aria-pressed={food.id === form?.id}><strong>{food.nameKo}</strong><small>{food.categoryCode} · {food.status}</small></button>) : <p>등록된 식재료가 없습니다.</p>}
        <div className="admin-pagination"><button disabled={page.page === 0 || loading || saving} onClick={() => load(page.page - 1)}>이전</button><span>{page.page + 1} / {Math.max(1, page.totalPages)}</span><button disabled={!page.hasNext || loading || saving} onClick={() => load(page.page + 1)}>다음</button></div>
      </section>
      <PermissionGuard permission={ADMIN_PERMISSIONS.SEASONAL_MANAGE}>
        {form ? <form className="admin-card admin-seasonal-editor" onSubmit={save}>
          <h2>{form.nameKo} 원본 편집</h2>
          <p>제철 기간·분류·출처와 공개 상태는 유지됩니다. PICK 전용 이미지와 문구는 큐레이션에서 관리합니다.</p>
          <fieldset disabled={saving} style={{border: 0, padding: 0}}>
            {fields.map(([key, label]) => <label className="admin-field" key={key}><span>{label}</span><textarea maxLength={5000} value={form[key] || ''} onChange={event => setForm({...form, [key]: event.target.value})} /></label>)}
            {[['representativeImageUrl', '대표 이미지'], ['representativeImageMobileUrl', '모바일 이미지']].map(([key, label]) => <label className="admin-field" key={key}><span>{label}</span><input key={`${form.id}-${form.version}-${key}`} type="file" accept="image/*" onChange={event => setFiles({...files, [key]: event.target.files[0] || null})} />{form[key] ? <img src={(key === "representativeImageUrl" ? form.imagePreviewUrl : form.mobileImagePreviewUrl) || form[key]} alt={`${form.nameKo} ${label}`} style={{width: 120, height: 90, objectFit: 'cover'}} /> : null}<input aria-label={`${label} URL`} type="text" placeholder="이미지 URL 또는 위에서 파일 선택" value={form[key] || ''} onChange={event => setForm({...form, [key]: event.target.value})} /></label>)}
            <button className="admin-button admin-button--primary" type="submit">{saving ? '저장 중…' : '식재료 저장'}</button>
          </fieldset>
        </form> : <section className="admin-card"><p>수정할 식재료를 선택하세요.</p></section>}
      </PermissionGuard>
    </div>
  </div>;
}
