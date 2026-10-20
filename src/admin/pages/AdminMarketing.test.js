import React from 'react';
import {render,screen,fireEvent,waitFor,within} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {useAuth} from '../../auth/AuthContext';
import {getMarketingConsole,getMarketingProduction,getMarketingPreview,getMarketingMeasurement,marketingAction} from '../api/marketingApi';
import {draftKey} from '../../auth/privateDrafts';
import AdminMarketing from './AdminMarketing';
import {fixture,production,CREATIVE} from './marketingFixtures';
jest.mock('../../auth/AuthContext',()=>({useAuth:jest.fn()}));
jest.mock('../api/marketingApi',()=>({getMarketingConsole:jest.fn(),getMarketingProduction:jest.fn(),getMarketingPreview:jest.fn(),getMarketingMeasurement:jest.fn(),marketingAction:jest.fn()}));
function show(tab='overview'){return render(<MemoryRouter initialEntries={['/admin/marketing?tab='+tab]}><AdminMarketing/></MemoryRouter>);}
async function ready(){await screen.findByText('오늘 확인할 일');}
beforeEach(()=>{
 jest.clearAllMocks();sessionStorage.clear();Object.defineProperty(window,'crypto',{value:require('crypto').webcrypto,configurable:true});global.structuredClone=v=>JSON.parse(JSON.stringify(v));URL.createObjectURL=jest.fn(()=> 'blob:synthetic-card');URL.revokeObjectURL=jest.fn();window.confirm=jest.fn(()=>true);
 useAuth.mockReturnValue({user:{accountSubject:'su12ng',roles:['ADMIN']},canAdmin:()=>true});getMarketingConsole.mockResolvedValue(fixture());getMarketingProduction.mockResolvedValue(production());getMarketingPreview.mockResolvedValue(new Blob(['synthetic'],{type:'image/jpeg'}));getMarketingMeasurement.mockResolvedValue({collectionState:'DISABLED',groups:[]});marketingAction.mockResolvedValue({});
});
test('overview shows missing connection and unknown usage without eagerly fetching cards',async()=>{show();await ready();expect(screen.getByRole('button',{name:/제작물 검토하기/})).toBeInTheDocument();fireEvent.click(screen.getByText('자동 실행 · 연결 관리'));expect(screen.getAllByText('공식 연결 확인 필요')).toHaveLength(2);expect(screen.getByText(/실제 한 건 게시 검증은 계정 연결 후/)).toBeInTheDocument();expect(getMarketingProduction).not.toHaveBeenCalled();expect(getMarketingPreview).not.toHaveBeenCalled();});
test('another administrator with the su12ng display name gets no data',()=>{useAuth.mockReturnValue({user:{accountSubject:'other-admin',displayName:'su12ng',roles:['SUPER_ADMIN']},canAdmin:()=>true});show();expect(screen.getByRole('alert')).toHaveTextContent('su12ng 운영자');expect(getMarketingConsole).not.toHaveBeenCalled();});
test('the Mac session button exports only on click and never starts a job or writes to the server',async()=>{const payload=btoa(JSON.stringify({sub:'su12ng',typ:'access',exp:Math.floor(Date.now()/1000)+3600})).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');const accessToken='SYNTHETIC_HEADER.'+payload+'.SYNTHETIC_SIGNATURE';useAuth.mockReturnValue({user:{accountSubject:'su12ng',roles:['ADMIN']},canAdmin:()=>true,accessToken});const click=jest.spyOn(HTMLAnchorElement.prototype,'click').mockImplementation(()=>{});show();await ready();expect(click).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Mac 연결파일 저장'}));expect(click).toHaveBeenCalledTimes(1);expect(screen.getByRole('status')).toHaveTextContent('Mac 연결파일을 저장했어요.');expect(marketingAction.mock.calls.filter(([, ,method])=>method!=='GET')).toHaveLength(0);expect(document.querySelector('a[download]')).toBeNull();click.mockRestore();});
test('readonly exact operator can read but cannot pause, register or modify',async()=>{useAuth.mockReturnValue({user:{accountSubject:'su12ng',permissions:['ADMIN_ACCESS','DASHBOARD_READ']},canAdmin:p=>p!=='SETTING_MANAGE'});show();await ready();fireEvent.click(screen.getByText('자동 실행 · 연결 관리'));expect(screen.getByRole('button',{name:'전체 실행 중단'})).toBeDisabled();fireEvent.click(screen.getByRole('button',{name:/추가 관리/}));fireEvent.click(screen.getByRole('tab',{name:'캠페인'}));expect(screen.getByRole('button',{name:'설정 수정'})).toBeDisabled();expect(marketingAction.mock.calls.filter(([, ,method])=>method!=='GET')).toHaveLength(0);});
test('failed snapshot never replaces actual state with fabricated success data',async()=>{getMarketingConsole.mockRejectedValue(Error('offline'));show();await screen.findByText('현재 서버 상태를 확인하지 못했어요.');expect(screen.queryByText('오늘 확인할 일')).not.toBeInTheDocument();expect(marketingAction).not.toHaveBeenCalled();});
test('cards load only in the studio and their object URLs are released',async()=>{const view=show('studio');expect(await screen.findByRole('img',{name:'현재 A안 홍보 카드'})).toHaveAttribute('src','blob:synthetic-card');expect(screen.queryByRole('img',{name:'현재 B안 홍보 카드'})).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'나란히 비교'}));expect(screen.getByRole('img',{name:'현재 B안 홍보 카드'})).toBeInTheDocument();expect(getMarketingPreview).toHaveBeenCalledTimes(2);view.unmount();expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);});
test('copy edit sends a pending content request instead of reusing stale rendered artifacts',async()=>{show('studio');await screen.findByRole('img',{name:'현재 A안 홍보 카드'});fireEvent.click(screen.getByRole('button',{name:'문구·대본 수정'}));const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getAllByLabelText('행동 안내 · 20자 이내')[0],{target:{value:'오늘 기록해 보기'}});fireEvent.change(within(dialog).getByLabelText('처리 사유'),{target:{value:'문구를 자연스럽게 수정'}});fireEvent.click(within(dialog).getByRole('button',{name:'확인하고 저장'}));await waitFor(()=>expect(marketingAction).toHaveBeenCalled());const [path,request]=marketingAction.mock.calls[0];expect(path).toBe('/creatives/'+CREATIVE+'/production/content-requests');expect(request.action).toBe('REQUEST');expect(request.expectedRevision).toBe(1);expect(request.content.variants[0].cta).toBe('오늘 기록해 보기');expect(request).not.toHaveProperty('bundle');});
test('approval requires both card previews and all six explicit review checks',async()=>{getMarketingProduction.mockResolvedValue(production(false));show('studio');await screen.findByRole('button',{name:'현재 카드 검토'});fireEvent.click(screen.getByRole('button',{name:'현재 카드 검토'}));const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByLabelText('처리 사유'),{target:{value:'사진과 문구 검토'}});for(const checkbox of within(dialog).getAllByRole('checkbox'))fireEvent.click(checkbox);fireEvent.click(within(dialog).getByRole('button',{name:'확인하고 저장'}));await screen.findByText('현재 카드 두 안과 검토 항목 여섯 개를 모두 확인해 주세요.');expect(marketingAction).not.toHaveBeenCalled();});
test('a complete six-item review uses the current revision and a stable operation key',async()=>{show('studio');await screen.findByRole('img',{name:'현재 A안 홍보 카드'});fireEvent.click(screen.getByRole('button',{name:'현재 카드 검토'}));const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByLabelText('처리 사유'),{target:{value:'실제 두 카드와 목적지를 확인'}});for(const checkbox of within(dialog).getAllByRole('checkbox'))fireEvent.click(checkbox);fireEvent.click(within(dialog).getByRole('button',{name:'확인하고 저장'}));await waitFor(()=>expect(marketingAction).toHaveBeenCalled());expect(marketingAction.mock.calls[0][1]).toMatchObject({decision:'APPROVE',expectedRevision:1,checks:{facts:true,voice:true,visualMatch:true,privacy:true,readability:true,destination:true}});});
test('lost write response is recovered with the same body and key after a page reload',async()=>{
 marketingAction.mockRejectedValueOnce(Object.assign(Error('응답 유실'),{code:'NETWORK_TIMEOUT'}));const view=show('queue');await screen.findByRole('button',{name:'초안 생성 요청'});fireEvent.click(screen.getByRole('button',{name:'초안 생성 요청'}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'확인하고 저장'}));await screen.findByText('저장 여부를 확인할 요청이 남아 있어요.');const original=marketingAction.mock.calls[0];expect(sessionStorage.getItem(draftKey('su12ng','marketing-request'))).not.toBeNull();view.unmount();show('queue');await screen.findByRole('button',{name:'같은 요청으로 결과 확인'});fireEvent.click(screen.getByRole('button',{name:'같은 요청으로 결과 확인'}));await waitFor(()=>expect(marketingAction).toHaveBeenCalledTimes(2));expect(marketingAction.mock.calls[1].slice(0,3)).toEqual(original.slice(0,3));await waitFor(()=>expect(sessionStorage.getItem(draftKey('su12ng','marketing-request'))).toBeNull());
});
test('already-started failed generation has no new-attempt button',async()=>{const data=fixture();data.queue.jobs=[{id:CREATIVE,status:'FAILED',job_key:'failed-fixture',campaign_id:data.queue.campaigns[0].id,started_at:new Date().toISOString()}];getMarketingConsole.mockResolvedValue(data);show('queue');await screen.findByText('failed-fixture');expect(screen.queryByRole('button',{name:'시작 전 작업 새 요청'})).not.toBeInTheDocument();expect(screen.getByText(/모델 시작 기록이 있어요/)).toBeInTheDocument();});
test('unknown generation closes only with explicit review and never enqueues a replacement',async()=>{const data=fixture();data.queue.jobs=[{id:CREATIVE,status:'UNKNOWN',job_key:'unknown-fixture',campaign_id:data.queue.campaigns[0].id,started_at:new Date().toISOString()}];getMarketingConsole.mockResolvedValue(data);show('queue');await screen.findByText('unknown-fixture');fireEvent.click(screen.getByRole('button',{name:'기록 검토 후 종료'}));const dialog=screen.getByRole('dialog');fireEvent.change(within(dialog).getByLabelText('처리 사유'),{target:{value:'저장 기록을 확인하고 재생성 없이 종료'}});fireEvent.click(within(dialog).getByRole('checkbox'));fireEvent.click(within(dialog).getByRole('button',{name:'확인하고 저장'}));await waitFor(()=>expect(marketingAction).toHaveBeenCalled());expect(marketingAction.mock.calls[0][0]).toBe('/jobs/'+CREATIVE+'/resolve');expect(marketingAction.mock.calls[0][1].confirmedNoRetry).toBe(true);expect(marketingAction.mock.calls.some(([path])=>path==='/jobs')).toBe(false);});
test('disabled measurement remains unavailable rather than displaying zero conversion',async()=>{show('metrics');await screen.findByText(/성과 수집이 비활성이에요/);expect(screen.getByText('비교할 관찰 데이터가 없어요.')).toBeInTheDocument();expect(screen.queryByText('0.0%')).not.toBeInTheDocument();});
test('dirty dialog blocks tab changes and focuses its editor',async()=>{show('campaigns');await screen.findByRole('button',{name:'설정 수정'});fireEvent.click(screen.getByRole('button',{name:'설정 수정'}));expect(screen.getByLabelText('캠페인 이름')).toHaveFocus();window.confirm.mockReturnValue(false);fireEvent.click(screen.getByRole('tab',{name:'게시'}));expect(screen.getByRole('dialog')).toBeInTheDocument();expect(screen.getByRole('tab',{name:'캠페인'})).toHaveAttribute('aria-selected','true');});

test('a disabled publishing server has no misleading resume action',async()=>{show();await ready();expect(screen.getByRole('button',{name:'게시 서버 준비 필요'})).toBeDisabled();});
test('a dispatched generation schedule displays its actual state and disables duplicate actions',async()=>{const data=fixture();data.queue.schedules=[{id:CREATIVE,campaign_id:data.queue.campaigns[0].id,due_at:new Date(Date.now()-1000).toISOString(),dispatched:true}];getMarketingConsole.mockResolvedValue(data);show('queue');await screen.findByText('작업으로 등록됨');expect(screen.getByRole('button',{name:'시각 변경'})).toBeDisabled();expect(screen.getByRole('button',{name:'작업으로 등록'})).toBeDisabled();});

test('four primary destinations and optional advanced links retain keyboard navigation',async()=>{
 show();await ready();
 expect(screen.getAllByRole('tab').map(tab=>tab.textContent)).toEqual(['오늘','제작물','게시','이력']);
 fireEvent.keyDown(screen.getByRole('tab',{name:'오늘'}),{key:'ArrowRight'});
 expect(await screen.findByRole('img',{name:'현재 A안 홍보 카드'})).toBeInTheDocument();
 expect(screen.getByRole('tab',{name:'제작물'})).toHaveFocus();
 fireEvent.click(screen.getByRole('button',{name:/추가 관리/}));
 fireEvent.click(screen.getByRole('tab',{name:'작업·예약'}));
 expect(screen.getByRole('button',{name:'초안 생성 요청'})).toBeInTheDocument();
 expect(marketingAction.mock.calls.filter(([, ,method])=>method!=='GET')).toHaveLength(0);
});

test('creative library filters locally and fetches only the chosen creative',async()=>{
 const data=fixture(),second='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
 data.queue.creatives[0].created_at='2026-10-20T00:46:00Z';
 data.queue.creatives.push({...data.queue.creatives[0],id:second,state:'READY_FOR_PUBLISHING',created_at:'2026-10-19T00:46:00Z'});
 getMarketingConsole.mockResolvedValue(data);show('studio');await screen.findByRole('img',{name:'현재 A안 홍보 카드'});
 expect(getMarketingProduction).toHaveBeenCalledTimes(1);
 fireEvent.change(screen.getByLabelText('제작 상태'),{target:{value:'ready'}});
 await waitFor(()=>expect(getMarketingProduction).toHaveBeenCalledTimes(2));
 expect(getMarketingProduction.mock.calls[1][0]).toBe(second);
 const index=screen.getByRole('complementary',{name:'제작물 보관함'});
 expect(within(index).getAllByRole('listitem')).toHaveLength(1);
 fireEvent.change(screen.getByLabelText('제작물 검색'),{target:{value:'없는 캠페인'}});
 expect(screen.getByText('검색 조건에 맞는 제작물이 없어요.')).toBeInTheDocument();
 expect(getMarketingProduction).toHaveBeenCalledTimes(2);
 expect(marketingAction).not.toHaveBeenCalled();
});

test('card variants and review history are reachable without changing production',async()=>{
 const value=production();value.production.reviews=[{at:'2026-10-20T01:00:00Z',decision:'APPROVE',reason:'실제 카드의 사진과 이동 주소 확인'}];
 getMarketingProduction.mockResolvedValue(value);show('studio');await screen.findByRole('img',{name:'현재 A안 홍보 카드'});
 fireEvent.click(screen.getByRole('button',{name:'B안'}));
 expect(screen.getByRole('img',{name:'현재 B안 홍보 카드'})).toBeInTheDocument();
 expect(screen.queryByRole('img',{name:'현재 A안 홍보 카드'})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:/변경·검토 기록 1/}));
 expect(screen.getByText('실제 카드의 사진과 이동 주소 확인')).toBeInTheDocument();
 expect(getMarketingProduction).toHaveBeenCalledTimes(1);expect(getMarketingPreview).toHaveBeenCalledTimes(2);expect(marketingAction).not.toHaveBeenCalled();
});

test('unknown publication is the recommended task and directs to its existing recovery actions',async()=>{
 const data=fixture();data.publishing.posts=[{id:CREATIVE,state:'UNKNOWN',channel:'INSTAGRAM',title:'확인할 게시'}];getMarketingConsole.mockResolvedValue(data);
 show();await ready();fireEvent.click(screen.getByRole('button',{name:/미확인 작업 확인/}));
 expect(screen.getByRole('tab',{name:'게시'})).toHaveAttribute('aria-selected','true');
 expect(screen.getByRole('button',{name:'외부 기록 검토 후 종료'})).toBeInTheDocument();
 expect(marketingAction.mock.calls.filter(([, ,method])=>method!=='GET')).toHaveLength(0);
});

test('a paused execution remains visible while setup is folded and opens the existing controls',async()=>{
 const data=fixture();data.queue.control.paused=true;getMarketingConsole.mockResolvedValue(data);show();await ready();
 expect(screen.getByText('전체 실행이 중단되어 있어요.')).toBeInTheDocument();
 const settings=document.getElementById('mk-execution-settings');expect(settings).not.toHaveAttribute('open');
 fireEvent.click(screen.getByRole('button',{name:/실행 상태 확인/}));
 expect(settings).toHaveAttribute('open');expect(screen.getByRole('button',{name:'전체 실행 재개'})).toBeInTheDocument();
 expect(marketingAction.mock.calls.filter(([, ,method])=>method!=='GET')).toHaveLength(0);
});

test('review and published summary counts lead to exactly the matching records',async()=>{
 const data=fixture();data.queue.creatives.push({...data.queue.creatives[0],id:'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',state:'REJECTED'},{...data.queue.creatives[0],id:'cccccccc-cccc-4ccc-cccc-cccccccccccc',state:'READY_FOR_PUBLISHING'});data.publishing.posts=[{id:'post-one',title:'게시한 카드',state:'PUBLISHED',channel:'WEBSITE'},{id:'post-two',title:'아직 대기중 카드',state:'QUEUED',channel:'INSTAGRAM'}];getMarketingConsole.mockResolvedValue(data);
 show();await ready();fireEvent.click(screen.getByRole('button',{name:'검토할 제작물 2개 근거 보기'}));expect(screen.getByLabelText('제작 상태')).toHaveValue('review');expect(within(screen.getByRole('complementary',{name:'제작물 보관함'})).getAllByRole('listitem')).toHaveLength(2);
 fireEvent.click(screen.getByRole('tab',{name:'오늘'}));fireEvent.click(screen.getByRole('button',{name:'게시 완료 1건 근거 보기'}));expect(screen.getByLabelText('게시 상태')).toHaveValue('PUBLISHED');expect(screen.getByText('게시한 카드')).toBeInTheDocument();expect(screen.queryByText('아직 대기중 카드')).not.toBeInTheDocument();fireEvent.click(screen.getByRole('button',{name:'조건 초기화'}));expect(screen.getByText('아직 대기중 카드')).toBeInTheDocument();expect(marketingAction.mock.calls.filter(([, ,method])=>method!=='GET')).toHaveLength(0);
});
test('unknown summary includes both generation and publication then opens only the chosen record',async()=>{
 const data=fixture();data.queue.jobs=[{id:'job-one',job_key:'결과 미확인 생성',status:'UNKNOWN',started_at:'2026-10-20T01:00:00Z'},{id:'job-two',job_key:'다른 대기 작업',status:'QUEUED'}];data.publishing.posts=[{id:'post-one',title:'결과 미확인 게시',state:'UNKNOWN',channel:'INSTAGRAM'}];getMarketingConsole.mockResolvedValue(data);show();await ready();
 fireEvent.click(screen.getByRole('button',{name:'결과 확인 필요 2건 근거 보기'}));const evidence=screen.getByRole('region',{name:'결과 확인 필요 근거'});expect(within(evidence).getByText(/생성 작업 1건 \+ 게시 1건/)).toBeInTheDocument();fireEvent.click(within(evidence).getByRole('button',{name:/제작 · 결과 미확인 생성/}));expect(screen.getByLabelText('생성 작업 상태')).toHaveValue('UNKNOWN');expect(screen.getByText('결과 미확인 생성')).toBeInTheDocument();expect(screen.queryByText('다른 대기 작업')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'기록 검토 후 종료'})).toBeInTheDocument();expect(marketingAction.mock.calls.filter(([, ,method])=>method!=='GET')).toHaveLength(0);
});

test('measurement counts expose their exact group and limitations without an invented user list',async()=>{
 getMarketingMeasurement.mockResolvedValue({collectionState:'ENABLED',groups:[{variant:'a',channel:'WEBSITE',verified_signups:12,mature_cohort:10,first_record_within_7_days:4,firstRecordRate:.4,decision:'DESCRIPTIVE_ONLY'},{variant:'b',channel:'WEBSITE',verified_signups:5,mature_cohort:0,first_record_within_7_days:0,firstRecordRate:null,decision:'INSUFFICIENT_SAMPLE'}]});show('metrics');fireEvent.click(await screen.findByRole('button',{name:'a WEBSITE 첫 기록 비율 근거'}));
 const evidence=screen.getByRole('region',{name:'성과 집계 근거'});expect(evidence).toHaveTextContent('관찰된 첫 기록 비율 · a · WEBSITE');expect(evidence).toHaveTextContent('40.0%');expect(evidence).toHaveTextContent('개인별 가입·행동 명단은 이 조회 API에 제공되지 않아요');expect(marketingAction.mock.calls.filter(([, ,method])=>method!=='GET')).toHaveLength(0);
});
