import React from 'react';
import {render,screen,fireEvent,within,waitFor} from '@testing-library/react';
import {MemoryRouter,useLocation,useNavigate} from 'react-router-dom';
import {useAuth} from '../../auth/AuthContext';
import {getOperationsSnapshot,getPushAttempt,createOperationsRelease,recordReleaseCheck} from '../api/operationsApi';
import AdminOperationsHome from './AdminOperationsHome';
import AdminOperationsIncidents from './AdminOperationsIncidents';
import AdminOperationsReleases from './AdminOperationsReleases';
jest.mock('../../auth/AuthContext',()=>({useAuth:jest.fn()}));
jest.mock('../api/operationsApi',()=>({getOperationsSnapshot:jest.fn(),getPushAttempt:jest.fn(),createOperationsRelease:jest.fn(),recordReleaseCheck:jest.fn()}));
const BASE={schemaVersion:1,api:{runtimeMetrics:[],clientErrors:{available:false}},push:{available:true,counts:[],attempts:[],skips:[]},reports:{available:false},releases:{available:true,items:[],checks:[],workflows:[]},github:{status:'NOT_CONFIGURED'}};
function Location(){const location=useLocation(),navigate=useNavigate();return <><output data-testid="location">{location.search}</output><button onClick={()=>navigate(-1)}>브라우저 뒤로</button></>;}
function show(Component,path='/admin/operations'){return render(<MemoryRouter initialEntries={[path]}><Location/><Component/></MemoryRouter>);}
beforeEach(()=>{jest.clearAllMocks();useAuth.mockReturnValue({user:{accountSubject:'su12ng',roles:['ADMIN']},canAdmin:()=>true});getOperationsSnapshot.mockResolvedValue(BASE);});
test('server failure KPI drills into failed status rows and a latency bar keeps its exact response bucket',async()=>{
 getOperationsSnapshot.mockResolvedValue({...BASE,api:{runtimeMetrics:[{method:'GET',path:'/api/one',status:200,requestCount:8,totalTimeMs:80},{method:'GET',path:'/api/one',status:500,requestCount:2,totalTimeMs:60},{method:'POST',path:'/api/two',status:401,requestCount:1,totalTimeMs:10}],clientErrors:{available:false}}});
 show(AdminOperationsHome);fireEvent.click(await screen.findByRole('link',{name:/서버 응답 실패율/}));
 const evidence=screen.getByRole('region',{name:'운영 지표 근거'});expect(within(evidence).queryByRole('cell',{name:'200'})).not.toBeInTheDocument();expect(within(evidence).getByRole('cell',{name:'500'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'GET /api/one 응답 500 근거 보기'}));expect(within(evidence).getAllByRole('row')).toHaveLength(2);expect(within(evidence).getByRole('cell',{name:'30.0ms'})).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'브라우저 뒤로'}));await waitFor(()=>expect(within(evidence).getAllByRole('row')).toHaveLength(3));expect(createOperationsRelease).not.toHaveBeenCalled();expect(recordReleaseCheck).not.toHaveBeenCalled();
});
test('push total filters only the available sample and stage selection reads receipt evidence without writing',async()=>{
 const first={deliveryId:5,providerStatus:'FAILED',errorCode:'TOKEN_GONE',platform:'IOS',attemptedAt:'2026-10-20T01:00:00Z'},second={...first,deliveryId:6,providerStatus:'SUCCESS'};
 getOperationsSnapshot.mockResolvedValue({...BASE,push:{available:true,counts:[{status:'SUCCESS',count:40},{status:'FAILED',count:10}],attempts:[first,second],skips:[]}});getPushAttempt.mockResolvedValue(first);
 show(AdminOperationsIncidents,'/admin/operations/incidents?view=push');fireEvent.click(await screen.findByRole('button',{name:'전송 실패 10건 →'}));
 expect(screen.getByText('조회된 2건 중 1건')).toBeInTheDocument();expect(screen.queryByRole('button',{name:'전송 #6 보기'})).not.toBeInTheDocument();expect(screen.getByText(/최근 최대 30건 안에서/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'전송 #5 보기'}));await waitFor(()=>expect(getPushAttempt).toHaveBeenCalledTimes(1));fireEvent.click(screen.getByRole('button',{name:'기기 수신 근거 보기'}));expect(screen.getByText('선택 단계: 기기 수신')).toBeInTheDocument();expect(within(screen.getByRole('region',{name:'전송 상세'})).getByText('TOKEN_GONE')).toBeInTheDocument();expect(recordReleaseCheck).not.toHaveBeenCalled();expect(createOperationsRelease).not.toHaveBeenCalled();
});
test('release diagram and result statuses show exact revision and check histories without recording checks',async()=>{
 const release={releaseId:'r1',platform:'ANDROID',version:'2.1',build:'40',revision:'a'.repeat(40)},other={...release,releaseId:'r2',revision:'b'.repeat(40)};
 const workflow={repository:'Yusungyong/plateApp2',revision:release.revision,runId:9,workflow:'.github/workflows/mobile-ci.yml',status:'completed',conclusion:'success',attempt:1};
 getOperationsSnapshot.mockResolvedValue({...BASE,releases:{available:true,items:[release,other],workflows:[workflow,{...workflow,runId:10,revision:other.revision}],checks:[{eventId:'one',releaseId:'r1',check:'CHAT',result:'FAIL'},{eventId:'two',releaseId:'r1',check:'LOGIN',result:'PASS'},{eventId:'three',releaseId:'r2',check:'CHAT',result:'PASS'}]}});
 show(AdminOperationsReleases);fireEvent.click(await screen.findByRole('button',{name:'자동 검증 근거 보기'}));expect(screen.getByRole('link',{name:'success 실행 로그 보기'})).toHaveAttribute('href','https://github.com/Yusungyong/plateApp2/actions/runs/9');expect(screen.getByText(/조회 기록 1건/)).toBeInTheDocument();
 fireEvent.click(screen.getByRole('button',{name:'채팅 송수신 점검 이력 보기'}));const history=screen.getByRole('region',{name:'점검 변경 이력'});expect(within(history).getAllByRole('listitem')).toHaveLength(1);expect(within(history).getByRole('listitem')).toHaveTextContent('채팅 송수신 · 실패');expect(screen.getByTestId('location')).toHaveTextContent('check=CHAT');expect(recordReleaseCheck).not.toHaveBeenCalled();expect(createOperationsRelease).not.toHaveBeenCalled();
});
