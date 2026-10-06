import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {apiClient} from '../api';

export default function SignupAgreements({onChange, disabled}) {
  const [catalog, setCatalog] = useState(null);
  const [choices, setChoices] = useState({});
  const [age, setAge] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setCatalog(null); setChoices({}); setAge(false); setError('');
    apiClient.get('/api/legal/consent-catalog', {withAuth: false}).then(response => {
      if (!active) return;
      const value = response?.data ?? response;
      if (!value.enabled) {setError('회원가입에 필요한 문서를 준비하고 있습니다. 준비가 완료되면 가입할 수 있습니다.'); return;}
      if (!Number.isInteger(value.catalogRevision) || !Number.isInteger(value.minimumAge)
          || !Array.isArray(value.documents) || !value.documents.length
          || !value.documents.some(d => d.required && d.actionType === 'ACCEPT')
          || !value.documents.some(d => d.required && d.actionType === 'NOTICE')
          || value.documents.some(d => !d.documentId || !d.version || !d.title || !d.body
            || !/^[a-f0-9]{64}$/.test(d.sha256) || !['NOTICE', 'ACCEPT', 'CONSENT'].includes(d.actionType))) {
        throw new Error('가입 문서를 확인할 수 없습니다. 잠시 후 다시 시도해 주세요.');
      }
      setCatalog(value);
    }).catch(e => {if (active) setError(e.message || '가입 문서를 불러오지 못했습니다.');});
    return () => {active = false;};
  }, [attempt]);
  useEffect(() => {
    if (!catalog || !age || catalog.documents.some(d => d.required && !choices[d.documentId])) {onChange(null); return;}
    onChange({catalogRevision: catalog.catalogRevision, expectedRevision: 0, minimumAgeConfirmed: age,
      decisions: catalog.documents.map(d => ({documentId: d.documentId, version: d.version, sha256: d.sha256,
        decision: choices[d.documentId] ? d.actionType === 'NOTICE' ? 'ACKNOWLEDGED' : 'ACCEPTED' : 'DECLINED'}))});
  }, [catalog, age, choices, onChange]);
  return <div className="signup-agreements">
    <h3>가입 문서 확인</h3>
    {error ? <div role="alert"><p>{error}</p><button type="button" disabled={disabled} onClick={() => setAttempt(v => v + 1)}>문서 다시 불러오기</button></div>
      : !catalog ? <p role="status">가입 문서를 불러오고 있습니다.</p> : <fieldset disabled={disabled} style={{border: 0, padding: 0}}>
        <legend className="sr-only">문서별 확인과 동의</legend>
        {catalog.documents.map(d => <div key={d.documentId}>
          <details><summary>{d.title} · {d.version} 전문 보기</summary><div style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', maxHeight: '24rem', overflowY: 'auto', padding: '1rem'}} tabIndex={0}>{d.body}</div></details>
          <label className="admin-toggle"><input type="checkbox" checked={Boolean(choices[d.documentId])} onChange={e => setChoices(v => ({...v, [d.documentId]: e.target.checked}))} /><span>[{d.required ? '필수' : '선택'}] {d.title}{d.actionType === 'NOTICE' ? ' 내용을 확인했습니다.' : '에 동의합니다.'}</span></label>
        </div>)}
        <label className="admin-toggle"><input type="checkbox" checked={age} onChange={e => setAge(e.target.checked)} /><span>[필수] 만 {catalog.minimumAge}세 이상입니다.</span></label>
      </fieldset>}
    <p className="restaurant-field-hint"><Link to="/terms-of-service">이용약관</Link> · <Link to="/privacy-policy">개인정보 처리방침</Link></p>
  </div>;
}
