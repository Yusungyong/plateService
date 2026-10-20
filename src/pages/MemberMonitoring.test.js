import React from 'react';
import {render,screen,fireEvent,within,waitFor,act} from '@testing-library/react';
import {MemoryRouter,useLocation,useNavigate} from 'react-router-dom';
import MemberMonitoring from './MemberMonitoring';
import {useAuth} from '../auth/AuthContext';
import {fetchMemberMonitoringSummary,fetchMemberMonitoringLoginRisks,fetchMemberMonitoringProfileChanges,fetchMemberMonitoringRiskUsers,fetchMemberMetricDetails} from '../api/memberMonitoringApi';

jest.mock('../auth/AuthContext',()=>({useAuth:jest.fn()}));
jest.mock('../admin/components/MemberActions',()=>()=> <div>합성 회원 검색 화면</div>);
jest.mock('../api/memberMonitoringApi',()=>({fetchMemberMonitoringSummary:jest.fn(),fetchMemberMonitoringLoginRisks:jest.fn(),fetchMemberMonitoringProfileChanges:jest.fn(),fetchMemberMonitoringRiskUsers:jest.fn(),fetchMemberMetricDetails:jest.fn()}));

beforeEach(()=>{
 jest.clearAllMocks();
 useAuth.mockReturnValue({user:{accountSubject:'su12ng'},canAdmin:()=>true});
 fetchMemberMonitoringSummary.mockResolvedValue({data:{totalUsers:42,newUsersToday:2,activeUsers7d:9,loginFailureRateToday:3,pendingRoleChanges:1,riskUsers24h:1,loginAttemptsToday:10,loginSuccessesToday:7,loginFailuresToday:2,loginOtherToday:1}});
 fetchMemberMonitoringLoginRisks.mockResolvedValue({data:[{username:'alice',riskLabel:'합성 로그인 신호',detail:'테스트 상세',state:'확인 필요'}]});
 fetchMemberMonitoringProfileChanges.mockResolvedValue({data:Array.from({length:6},(_,index)=>({historyId:index+1,username:'test'+index,changeType:'합성 변경 '+index,createdAt:'2026-10-20T00:00:00Z',actor:'system'}))});
 fetchMemberMonitoringRiskUsers.mockResolvedValue({data:[{username:'bob',reportCount:2,blockedCount:1,score:0}]});
 fetchMemberMetricDetails.mockImplementation(({metric,page,size})=>Promise.resolve({metric,total:1,page,size,hasNext:false,from:'2026-10-19T09:00:00+09:00',to:'2026-10-20T09:00:00+09:00',rows:[{username:'exact-member',nickname:'실제 집계 회원',available:true,reason:'받은 신고',occurredAt:'2026-10-20T00:00:00'}]}));
});
function LocationProbe(){const location=useLocation(),navigate=useNavigate();return <><output aria-label="현재 경로">{location.search}</output><button onClick={()=>navigate(-1)}>브라우저 뒤로</button></>;}
const mount=(path='/admin/member-monitoring')=>render(<MemoryRouter initialEntries={[path]} future={{v7_startTransition:true,v7_relativeSplatPath:true}}><MemberMonitoring/><LocationProbe/></MemoryRouter>);

test('member finding is primary while monitoring sections remain behind named tabs',async()=>{
 mount();await screen.findByText('42');
 expect(screen.getByRole('tab',{name:'회원 찾기',exact:true})).toHaveAttribute('aria-selected','true');
 expect(screen.queryByRole('heading',{name:'로그인 이상 징후',exact:true})).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('tab',{name:'이상 징후',exact:true}));
 expect(screen.getByRole('heading',{name:'로그인 이상 징후',exact:true})).toBeVisible();
 expect(screen.getByText('합성 로그인 신호')).toBeVisible();
 fireEvent.click(screen.getByRole('tab',{name:'변경 이력',exact:true}));
 const panel=screen.getByRole('tabpanel',{name:'변경 이력'});
 expect(within(panel).getByText('합성 변경 0')).toBeVisible();
 expect(within(panel).queryByText('합성 변경 5')).not.toBeInTheDocument();
 fireEvent.click(within(panel).getByRole('button',{name:'다음'}));
 expect(within(panel).getByText('합성 변경 5')).toBeVisible();
 fireEvent.click(within(panel).getByRole('link',{name:/test5 확인/}));
 expect(screen.getByRole('tab',{name:'회원 찾기',exact:true})).toHaveAttribute('aria-selected','true');
});

test('partial API failure is explicit rather than showing no risks',async()=>{
 fetchMemberMonitoringLoginRisks.mockRejectedValue(new Error('synthetic failure'));
 mount();await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('tab',{name:'이상 징후',exact:true}));
 expect(screen.getByText('로그인 이상 징후 조회 실패')).toBeVisible();
 expect(screen.queryByText('현재 확인된 로그인 이상 징후가 없습니다.')).not.toBeInTheDocument();
 expect(screen.getByText('42')).toBeInTheDocument();
});

test('zero risk score remains zero and keyboard changes the monitoring tabs',async()=>{
 mount();await screen.findByText('42');
 fireEvent.click(screen.getByRole('tab',{name:'이상 징후',exact:true}));
 fireEvent.keyDown(screen.getByRole('tab',{name:'로그인 이상 징후',exact:true}),{key:'End'});
 expect(screen.getByRole('tab',{name:'신고·차단',exact:true})).toHaveFocus();
 expect(screen.getByText('점수 0')).toBeVisible();
});

test('missing read permission never requests monitoring records',async()=>{
 useAuth.mockReturnValue({user:{accountSubject:'other'},canAdmin:()=>false});
 mount();expect(screen.getByRole('alert')).toHaveTextContent('조회할 권한이 없습니다');
 await waitFor(()=>expect(fetchMemberMonitoringSummary).not.toHaveBeenCalled());
 expect(fetchMemberMonitoringLoginRisks).not.toHaveBeenCalled();
});

const metricCases=[['전체 회원 수','totalUsers'],['오늘 신규 가입','newUsersToday'],['7일 활성 회원','activeUsers7d'],['최근 24시간 권한 변경','pendingRoleChanges'],['위험 회원','riskUsers24h']];
test.each(metricCases)('%s opens the exact metric dataset rather than a similarly named monitoring sample',async(label,metric)=>{
 mount();await screen.findByText('42');
 fireEvent.click(screen.getByRole('button',{name:label+' 근거 보기'}));
 const panel=screen.getByRole('region',{name:label+' 자세히'});
 expect(await within(panel).findByRole('link',{name:/실제 집계 회원/})).toBeVisible();
 expect(fetchMemberMetricDetails).toHaveBeenLastCalledWith({metric,page:0,size:20},expect.objectContaining({signal:expect.anything()}));
 expect(within(panel).queryByText('bob')).not.toBeInTheDocument();
 expect(screen.getByLabelText('현재 경로')).toHaveTextContent('metric='+metric);
 expect(screen.getByRole('heading',{name:label+' 자세히'})).toHaveFocus();
});
test('risk member selection and explicit return retain the source metric and pagination',async()=>{
 mount('/admin/member-monitoring?metric=riskUsers24h&metricPage=2');
 fireEvent.click(await screen.findByRole('link',{name:/실제 집계 회원/}));
 expect(screen.getByLabelText('현재 경로')).toHaveTextContent('username=exact-member');
 expect(screen.getByLabelText('현재 경로')).toHaveTextContent('fromMetric=riskUsers24h');
 fireEvent.click(screen.getByRole('button',{name:/위험 회원 확인으로 돌아가기/}));
 await screen.findByRole('list',{name:'지표 집계 근거 목록'});
 expect(fetchMemberMetricDetails).toHaveBeenLastCalledWith({metric:'riskUsers24h',page:2,size:20},expect.anything());
 fireEvent.click(screen.getByRole('button',{name:'근거 닫기'}));
 expect(screen.getByRole('button',{name:'위험 회원 근거 보기'})).toHaveFocus();
 fireEvent.click(screen.getByRole('button',{name:'브라우저 뒤로'}));
 expect(await screen.findByRole('region',{name:'위험 회원 자세히'})).toBeVisible();
});
test('selecting a member from signals replaces a previous metric return destination',async()=>{
 mount('/admin/member-monitoring?username=alice&fromMetric=riskUsers24h&metricPage=2');
 await screen.findByText('42');
 fireEvent.click(screen.getByRole('tab',{name:'이상 징후',exact:true}));
 fireEvent.click(screen.getByRole('tab',{name:'신고·차단',exact:true}));
 fireEvent.click(screen.getByRole('link',{name:/bob 확인/}));
 const params=new URLSearchParams(screen.getByLabelText('현재 경로').textContent);
 expect(params.get('username')).toBe('bob');expect(params.get('fromSignal')).toBe('risk');
 expect(params.has('fromMetric')).toBe(false);expect(params.has('metricPage')).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:/이상 징후 확인으로 돌아가기/}));
 expect(screen.getByRole('tab',{name:'신고·차단',exact:true})).toHaveAttribute('aria-selected','true');
 expect(screen.queryByRole('region',{name:'위험 회원 자세히'})).not.toBeInTheDocument();
});
test('login evidence plots actual success failure and other counts, not inferred success',async()=>{
 mount();await screen.findByText('42');fireEvent.click(screen.getByRole('button',{name:'오늘 로그인 실패율 근거 보기'}));
 expect(screen.getByRole('img',{name:'오늘 로그인 시도: 성공 7건, 실패 2건, 기타 상태 1건'})).toBeVisible();
 expect(screen.getByText('70.0%',{exact:false})).toBeVisible();
 expect(fetchMemberMetricDetails).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:/24시간 로그인 이상 징후 확인/}));
 expect(screen.getByRole('tab',{name:'이상 징후'})).toHaveAttribute('aria-selected','true');
 expect(screen.queryByRole('region',{name:'오늘 로그인 실패율 자세히'})).not.toBeInTheDocument();
});
test('zero login attempts has an honest empty state without a success chart',async()=>{
 fetchMemberMonitoringSummary.mockResolvedValue({loginAttemptsToday:0,loginFailuresToday:0,loginSuccessesToday:0,loginOtherToday:0});
 mount('/admin/member-monitoring?metric=loginFailureRateToday');
 expect(await screen.findByText(/오늘 기록된 로그인 시도가 없습니다/)).toBeVisible();
 expect(screen.queryByRole('img',{name:/오늘 로그인/})).not.toBeInTheDocument();
});
test('masked identities remain anonymous and detail failures do not become an empty list',async()=>{
 fetchMemberMetricDetails.mockRejectedValueOnce(new Error('근거 요청 실패')).mockResolvedValueOnce({metric:'riskUsers24h',page:0,size:20,total:1,hasNext:false,rows:[{username:null,nickname:null,available:false,reason:'받은 차단'}]});
 mount('/admin/member-monitoring?metric=riskUsers24h');
 expect(await screen.findByRole('alert')).toHaveTextContent('근거 요청 실패');
 expect(screen.queryByText('이 페이지에 표시할 기록이 없습니다.')).not.toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'근거 다시 조회'}));
 expect(await screen.findByText('비공개 또는 삭제된 계정')).toBeVisible();
 expect(within(screen.getByRole('list',{name:'지표 집계 근거 목록'})).queryByRole('link')).not.toBeInTheDocument();
});
test('changing metrics ignores a late previous response and denied users do not fetch details',async()=>{
 let resolveOld;fetchMemberMetricDetails.mockImplementationOnce(()=>new Promise(resolve=>{resolveOld=resolve;}));
 const view=mount('/admin/member-monitoring?metric=totalUsers');await screen.findByText('42');
 fireEvent.click(screen.getByRole('button',{name:'위험 회원 근거 보기'}));
 await screen.findByRole('link',{name:/실제 집계 회원/});
 await act(async()=>{resolveOld({metric:'totalUsers',page:0,size:20,total:1,rows:[{username:'old-member',available:true}]});});
 expect(screen.queryByText(/old-member/)).not.toBeInTheDocument();
 view.unmount();jest.clearAllMocks();useAuth.mockReturnValue({user:{accountSubject:'denied'},canAdmin:()=>false});
 mount('/admin/member-monitoring?metric=riskUsers24h');expect(screen.getByRole('alert')).toHaveTextContent('권한이 없습니다');expect(fetchMemberMetricDetails).not.toHaveBeenCalled();
});
