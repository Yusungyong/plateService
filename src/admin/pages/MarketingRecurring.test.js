import React from 'react';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
import MarketingRecurring from './MarketingRecurring';
import {marketingAction} from '../api/marketingApi';
jest.mock('../api/marketingApi',()=>({marketingAction:jest.fn()}));
beforeEach(()=>{jest.clearAllMocks();marketingAction.mockResolvedValue({reports:[]});});
test('never displays an unreported worker as running',async()=>{render(<MarketingRecurring scope="a" canWrite={false}/>);await screen.findByText('아직 반복 실행 기록이 없어요.');expect(screen.getByRole('button',{name:'자동 실행 연결파일 저장'})).toBeDisabled();expect(marketingAction).toHaveBeenCalledWith('/console/recurring-status',undefined,'GET',expect.any(Object));});
test('stale ready evidence is clearly marked',async()=>{marketingAction.mockResolvedValue({reports:[{state:'READY',stale:true,generation_time:'09:00',publish_time:'19:30',weekly_time:'10:00',observed_at:'2026-10-14T10:00:00Z'}]});render(<MarketingRecurring scope="a" canWrite/>);await screen.findByText('Mac 확인 정보가 오래됐어요');expect(screen.queryByText('예약 실행 대기')).not.toBeInTheDocument();});
test('revocation requires an explicit click and sends DELETE',async()=>{jest.spyOn(window,'confirm').mockReturnValue(true);render(<MarketingRecurring scope="a" canWrite/>);await waitFor(()=>expect(marketingAction).toHaveBeenCalledTimes(1));fireEvent.click(screen.getByRole('button',{name:'Mac 자동 실행 연결 해제'}));await screen.findByText('Mac 자동 실행 연결을 해제했어요.');expect(marketingAction).toHaveBeenLastCalledWith('/worker-credentials',undefined,'DELETE');window.confirm.mockRestore();});
