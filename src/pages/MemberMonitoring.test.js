import React from 'react';
import {render,screen,fireEvent,within,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import MemberMonitoring from './MemberMonitoring';
import {useAuth} from '../auth/AuthContext';
import {fetchMemberMonitoringSummary,fetchMemberMonitoringLoginRisks,fetchMemberMonitoringProfileChanges,fetchMemberMonitoringRiskUsers} from '../api/memberMonitoringApi';

jest.mock('../auth/AuthContext',()=>({useAuth:jest.fn()}));
jest.mock('../admin/components/MemberActions',()=>()=> <div>합성 회원 검색 화면</div>);
jest.mock('../api/memberMonitoringApi',()=>({fetchMemberMonitoringSummary:jest.fn(),fetchMemberMonitoringLoginRisks:jest.fn(),fetchMemberMonitoringProfileChanges:jest.fn(),fetchMemberMonitoringRiskUsers:jest.fn()}));

beforeEach(()=>{
 jest.clearAllMocks();
 useAuth.mockReturnValue({user:{accountSubject:'su12ng'},canAdmin:()=>true});
 fetchMemberMonitoringSummary.mockResolvedValue({data:{totalUsers:42,newUsersToday:2,activeUsers7d:9,loginFailureRateToday:3,pendingRoleChanges:1,riskUsers24h:1}});
 fetchMemberMonitoringLoginRisks.mockResolvedValue({data:[{username:'alice',riskLabel:'합성 로그인 신호',detail:'테스트 상세',state:'확인 필요'}]});
 fetchMemberMonitoringProfileChanges.mockResolvedValue({data:Array.from({length:6},(_,index)=>({historyId:index+1,username:'test'+index,changeType:'합성 변경 '+index,createdAt:'2026-10-20T00:00:00Z',actor:'system'}))});
 fetchMemberMonitoringRiskUsers.mockResolvedValue({data:[{username:'bob',reportCount:2,blockedCount:1,score:0}]});
});
const mount=()=>render(<MemoryRouter><MemberMonitoring/></MemoryRouter>);

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
