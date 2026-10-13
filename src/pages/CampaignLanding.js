import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../api/client';
import { APP_DOWNLOADS } from '../config/appDownloads';
import './CampaignLanding.css';
export const CAMPAIGN_CONSENT_VERSION = 'marketing-measurement-v1';
const CODE = /^[A-Z2-9]{12}$/;
const TOKEN = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const DOWNLOADS = { ...APP_DOWNLOADS, android: { ...APP_DOWNLOADS.android, url: APP_DOWNLOADS.android.url || 'https://play.google.com/store/apps/details?id=com.plateappnew' } };
const STORIES = {
 record: { title: '사진은 찍었는데,\n식당 이름은 어디 갔지?', description: '음식 사진에 식당 정보를 함께 남겨요.', steps: ['사진 등록 화면에서 음식 사진 선택하기', '식당 이름과 주소 확인하기', '내용을 적고 미리보기에서 등록하기'] },
 share: { title: '“여기 또 가볼까?”\n사진 한 장이면 충분해요.', description: '마음에 든 맛집 기록을 친구에게 보내요.', steps: ['콘텐츠에서 공유 아이콘 누르기', '보낼 친구를 고르고 메시지 적기', '채팅에서 공유한 콘텐츠 함께 보기'] },
 together: { title: '다음에 같이 갈 곳,\n접시에서 골라볼까?', description: '친구와 맛집 기록을 보며 다음 약속을 이야기해요.', steps: ['마음에 드는 콘텐츠를 친구에게 공유하기', '채팅의 콘텐츠 카드를 눌러 확인하기', '어디서 만날지 대화 나누기'] },
};
async function publicRequest(path, body, signal) {
 const response = await fetch(`${API_BASE_URL}${path}`, { method: body === undefined ? 'GET' : 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'error', signal, headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
 if (!response.ok) throw new Error('CAMPAIGN_UNAVAILABLE');
 const payload = await response.json(); if (!payload?.data) throw new Error('CAMPAIGN_INVALID_RESPONSE'); return payload.data;
}
export default function CampaignLanding() {
 const { code } = useParams(); const [link, setLink] = useState(null), [state, setState] = useState('loading');
 const [consent, setConsent] = useState(false), [visit, setVisit] = useState(null), [busy, setBusy] = useState(false), [error, setError] = useState('');
 const requestId = useRef(null), lock = useRef(false), generation = useRef(0), controller = useRef(null);
 const invalidate = useCallback(() => { generation.current++; controller.current?.abort(); lock.current = false; }, []);
 useEffect(() => {
  const epoch = ++generation.current; const abort = new AbortController(); setState('loading'); setLink(null); setConsent(false); setVisit(null); setError(''); requestId.current = null;
  if (!CODE.test(code || '')) { setState('unavailable'); return () => abort.abort(); }
  publicRequest(`/api/marketing/links/${code}`, undefined, abort.signal).then(data => { if (epoch === generation.current && !abort.signal.aborted) { if (data.code !== code || !data.enabled || !STORIES[data.variant]) throw new Error('INVALID_LINK'); setLink(data); setState('ready'); } }).catch(() => { if (!abort.signal.aborted && epoch === generation.current) setState('unavailable'); });
  return () => { invalidate(); abort.abort(); };
 }, [code, invalidate]);
 const connect = async () => {
  if (!consent || !link || lock.current) return; lock.current = true; setBusy(true); setError(''); const epoch = generation.current;
  const abort = new AbortController(); controller.current = abort; const timer = setTimeout(() => abort.abort(), 10000);
  try {
   requestId.current ||= window.crypto.randomUUID();
   const data = await publicRequest('/api/marketing/visits', { requestId: requestId.current, code, source: 'WEB', consent: true, consentVersion: CAMPAIGN_CONSENT_VERSION }, abort.signal);
   if (!TOKEN.test(data.visitToken || '') || data.code !== code) throw new Error('INVALID_VISIT');
   if (epoch === generation.current) setVisit(data);
  } catch { if (epoch === generation.current) setError('연결을 확인하지 못했어요. 다시 시도하거나 측정 없이 앱을 열어 주세요.'); }
  finally { clearTimeout(timer); if (epoch === generation.current) { lock.current = false; setBusy(false); } }
 };
 const story = STORIES[link?.variant] || STORIES.record;
 const appUrl = `plate://campaign?code=${code}${visit ? `&visit=${visit.visitToken}` : ''}`;
 return <div className="campaign-page">
  <header className="campaign-header"><Link to="/" aria-label="접시 홈"><img src="/images/home/plate-mascot.png" alt="" width="44" height="44" />접시</Link><Link to="/privacy-policy">개인정보 처리방침</Link></header>
  <main className="campaign-main">
   <p className="campaign-eyebrow">접시 사용법</p><h1>{story.title}</h1><p className="campaign-description">{story.description}</p>
   <ol className="campaign-steps">{story.steps.map((step, i) => <li key={step}><span aria-hidden="true">{i + 1}</span>{step}</li>)}</ol>
   {state === 'loading' && <p role="status">캠페인을 확인하고 있어요.</p>}
   {state === 'unavailable' && <p role="status">이 캠페인 링크는 현재 이용할 수 없어요. 아래에서 앱 설치 방법을 확인해 주세요.</p>}
   {state === 'ready' && <section className="campaign-connect" aria-label="앱으로 이어가기">
    <p>이미 설치했다면 <a className="campaign-primary" href={appUrl} rel="noreferrer">접시 앱 열기</a></p>
    <p>앱을 설치한 뒤에는 <strong>프로필 → 설정 → 캠페인 참여</strong>에서 아래 코드를 입력해 주세요.</p>
    <div className="campaign-code"><span>캠페인 코드</span><strong>{code}</strong></div>
    {!visit ? <div className="campaign-choice"><label><input type="checkbox" checked={consent} disabled={busy} onChange={e => setConsent(e.target.checked)} />선택: 캠페인 성과 측정에 동의해요</label><p>캠페인 링크 이용 기록을 최대30일 보관해요. 앱에서도 동의한 경우 계정의 가입·첫 기록·친구 요청·콘텐츠 공유·앱 열기와 연결해 집계해요. 설치 여부나 서로 다른 기기의 동일 사용자를 자동으로 확인하지 않아요. 동의하지 않아도 앱을 열거나 설치할 수 있어요.</p><button type="button" disabled={!consent || busy} onClick={connect}>{busy ? '연결 확인 중…' : '동의하고 앱 연결 준비하기'}</button></div> : <p role="status">연결을 준비했어요. 위의 ‘접시 앱 열기’를 누른 뒤 앱에서 참여를 확인해 주세요.</p>}
    {!!error && <p role="alert">{error}</p>}
   </section>}
   <section className="campaign-downloads" aria-label="앱 설치">{Object.entries(DOWNLOADS).map(([platform, store]) => /^https:\/\//.test(store.url) ? <a key={platform} href={store.url} rel="noreferrer">{store.name}에서 설치하기 ↗</a> : <span key={platform}>{store.name}에서 ‘접시’를 찾아보세요.</span>)}</section>
   <p className="campaign-footnote">앱 열기가 동작하지 않으면 설치 여부와 최신 버전을 확인해 주세요. 설치 뒤에는 이 페이지로 돌아와 앱을 열거나 캠페인 코드를 입력할 수 있어요.</p>
  </main><footer className="campaign-footer"><Link to="/terms-of-service">이용약관</Link><Link to="/privacy-policy">개인정보 처리방침</Link></footer>
 </div>;
}
