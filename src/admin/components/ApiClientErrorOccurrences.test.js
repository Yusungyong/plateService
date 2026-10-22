import {act,fireEvent,render,screen} from '@testing-library/react';
import ApiClientErrorOccurrences from './ApiClientErrorOccurrences';
import {getClientErrorOccurrences} from '../api/clientErrorOccurrencesApi';
jest.mock('../api/clientErrorOccurrencesApi',()=>({getClientErrorOccurrences:jest.fn()}));
const result={limit:50,hasMore:false,rows:[{eventId:'one',identity:'VERIFIED',username:'synthetic',screenLabel:'프로필 편집',client:'IOS',kind:'HTTP',status:504,receivedAt:'2026-10-22T00:00:00Z',occurredAt:'2026-10-21T23:59:59Z'},{eventId:'two',identity:'UNAVAILABLE',username:null,screenLabel:'로그인',kind:'HTTP',status:401,client:'WEB',receivedAt:'2026-10-22T00:00:00Z'}]};
beforeEach(()=>getClientErrorOccurrences.mockReset());
test('loads only on demand and distinguishes verified and unknown identities',async()=> {
 getClientErrorOccurrences.mockResolvedValue(result);
 render(<ApiClientErrorOccurrences method="GET" path="/api/my/activity-summary"/>);
 expect(getClientErrorOccurrences).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole('button',{name:'계정·메뉴별 발생 기록 보기'}));
 expect(await screen.findByText('@synthetic')).toBeInTheDocument();
 expect(screen.getByText('프로필 편집')).toBeInTheDocument();
 expect(screen.getByText('계정 확인 불가')).toBeInTheDocument();
 expect(screen.getByText('HTTP 504')).toBeInTheDocument();
});
test('shows unavailable storage as a retryable failure, not zero errors',async()=> {
 getClientErrorOccurrences.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({limit:50,hasMore:false,rows:[]});
 render(<ApiClientErrorOccurrences method="GET" path="/api/my/activity-summary"/>);
 fireEvent.click(screen.getByRole('button'));await screen.findByRole('alert');
 fireEvent.click(screen.getByRole('button'));
 expect(await screen.findByText(/이 구간에는 계정·메뉴 상세 기록이 없습니다/)).toBeInTheDocument();
});
test('a pending response cannot appear after unmount',async()=> {
 let finish;getClientErrorOccurrences.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
 const {unmount}=render(<ApiClientErrorOccurrences method="GET" path="/api/my/activity-summary"/>);
 fireEvent.click(screen.getByRole('button'));const signal=getClientErrorOccurrences.mock.calls[0][2];unmount();
 expect(signal.aborted).toBe(true);await act(async()=>{finish(result);});
});
