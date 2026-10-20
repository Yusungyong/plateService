import React from 'react';
import {act,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {MemoryRouter,createMemoryRouter,RouterProvider} from 'react-router-dom';
import QnA from './QnA';
import FAQ from './FAQ';
import {fetchQna,updateQna} from '../api/qnaApi';
import {fetchFaqs,fetchFaqDetail,createFaq,updateFaq,deleteFaq} from '../api/faqApi';
import {confirmFormLeave} from '../components/formLeaveProtection';
jest.mock('../api/qnaApi',()=>({fetchQna:jest.fn(),updateQna:jest.fn(),createQna:jest.fn()}));
jest.mock('../api/faqApi',()=>({fetchFaqs:jest.fn(),fetchFaqDetail:jest.fn(),createFaq:jest.fn(),updateFaq:jest.fn(),deleteFaq:jest.fn()}));
const questions=[{qnaId:1,question:'첫 번째 합성 문의',answer:'',category:'계정문의',statusCode:'received',guestName:'합성 사용자',isPublic:false},{qnaId:2,question:'두 번째 합성 문의',answer:'기존 답변',category:'이용문의',statusCode:'answered',guestName:'다른 사용자',isPublic:true}];
const faqs=[{faqId:11,title:'첫 FAQ 제목',answer:'첫 번째 답변',category:'service',statusCode:'published',isPinned:false,displayOrder:0},{faqId:12,title:'검토할 FAQ 제목',answer:'두 번째 답변',category:'account',statusCode:'review',isPinned:false,displayOrder:1}];
function show(Component,adminMode=true){return render(<MemoryRouter><Component adminMode={adminMode}/></MemoryRouter>);}
function listPage(content){return {content,page:0,totalElements:content.length,hasNext:false,totalPages:1};}
beforeEach(()=>{jest.clearAllMocks();window.confirm=jest.fn(()=>true);window.alert=jest.fn();fetchQna.mockResolvedValue(listPage(questions));updateQna.mockResolvedValue({});fetchFaqs.mockResolvedValue(listPage(faqs));fetchFaqDetail.mockImplementation(id=>Promise.resolve(faqs.find(row=>row.faqId===id)));updateFaq.mockResolvedValue({faqId:11});createFaq.mockResolvedValue({faqId:13});deleteFaq.mockResolvedValue({});});

test('operator Q&A status shortcuts use the existing server filter and local search is explicit',async()=>{
 show(QnA);await screen.findByRole('button',{name:/첫 번째 합성 문의/});
 fireEvent.click(screen.getByRole('button',{name:'검토 중',exact:true}));
 await waitFor(()=>expect(fetchQna).toHaveBeenLastCalledWith(expect.objectContaining({adminMode:true,statusCode:'reviewing',size:10})));
 fireEvent.change(screen.getByLabelText('불러온 문의에서 검색'),{target:{value:'두 번째'}});fireEvent.click(screen.getByRole('button',{name:'조회'}));
 await waitFor(()=>expect(within(screen.getByRole('region',{name:'문의 목록'})).queryByRole('button',{name:/첫 번째 합성 문의/})).not.toBeInTheDocument());
 expect(screen.getByText('불러온 목록 안에서 검색한 결과예요.')).toBeInTheDocument();expect(updateQna).not.toHaveBeenCalled();
});

test('Q&A selection and filters preserve an unsaved answer until the operator confirms leaving',async()=>{
 show(QnA);await screen.findByLabelText('답변 내용');fireEvent.change(screen.getByLabelText('답변 내용'),{target:{value:'아직 저장하지 않은 답변'}});window.confirm.mockReturnValue(false);
 fireEvent.click(screen.getByRole('button',{name:/두 번째 합성 문의/}));expect(screen.getByLabelText('답변 내용')).toHaveValue('아직 저장하지 않은 답변');
 fireEvent.click(screen.getByRole('button',{name:'답변 완료',exact:true}));expect(fetchQna).toHaveBeenCalledTimes(1);expect(confirmFormLeave()).toBe(false);
 window.confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:/두 번째 합성 문의/}));await waitFor(()=>expect(screen.getByLabelText('답변 내용')).toHaveValue('기존 답변'));
 expect(updateQna).not.toHaveBeenCalled();
});

test('Q&A answer saving keeps private visibility and uses only the selected admin record',async()=>{
 show(QnA);await screen.findByLabelText('답변 내용');fireEvent.change(screen.getByLabelText('답변 내용'),{target:{value:'확인한 답변'}});fireEvent.change(screen.getByLabelText('처리 상태'),{target:{value:'answered'}});fireEvent.click(screen.getByRole('button',{name:'답변 저장'}));
 await waitFor(()=>expect(updateQna).toHaveBeenCalledWith(1,{answer:'확인한 답변',statusCode:'answered',isPublic:false},true));
});

test('FAQ local status filtering exposes the pending guide and fetches only selected details',async()=>{
 show(FAQ);await screen.findByRole('button',{name:'내용 편집'});await waitFor(()=>expect(fetchFaqDetail).toHaveBeenCalledTimes(1));
 fireEvent.click(screen.getByRole('button',{name:'검토 중',exact:true}));
 expect(await screen.findByRole('heading',{name:'검토할 FAQ 제목'})).toBeInTheDocument();
 expect(fetchFaqs).toHaveBeenCalledTimes(1);expect(fetchFaqDetail).toHaveBeenLastCalledWith(12);expect(within(screen.getByRole('region',{name:'FAQ 목록'})).queryByRole('button',{name:/첫 FAQ 제목/})).not.toBeInTheDocument();
 expect(createFaq).not.toHaveBeenCalled();expect(updateFaq).not.toHaveBeenCalled();
});

test('FAQ editing locks the target and protects local selection and navigation drafts',async()=>{
 show(FAQ);await waitFor(()=>expect(screen.getByRole('button',{name:'내용 편집'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'내용 편집'}));fireEvent.change(screen.getByLabelText('제목'),{target:{value:'수정 중인 제목'}});window.confirm.mockReturnValue(false);
 fireEvent.click(screen.getByRole('button',{name:/검토할 FAQ 제목/}));expect(screen.getByLabelText('제목')).toHaveValue('수정 중인 제목');expect(confirmFormLeave()).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'수정 저장'}));await waitFor(()=>expect(updateFaq).toHaveBeenCalledWith(11,expect.objectContaining({title:'수정 중인 제목',answer:'첫 번째 답변',statusCode:'published'})));expect(createFaq).not.toHaveBeenCalled();
});

test('slow FAQ details never show or edit a previous record under a new selection',async()=>{
 let resolveSecond;fetchFaqDetail.mockImplementation(id=>id===11?Promise.resolve(faqs[0]):new Promise(resolve=>{resolveSecond=resolve;}));show(FAQ);await waitFor(()=>expect(screen.getByRole('button',{name:'내용 편집'})).toBeEnabled());
 fireEvent.click(screen.getByRole('button',{name:/검토할 FAQ 제목/}));expect(screen.getByRole('heading',{name:'검토할 FAQ 제목'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'내용 편집'})).toBeDisabled();expect(screen.queryByText('첫 번째 답변')).not.toBeInTheDocument();
 await act(async()=>resolveSecond(faqs[1]));expect(screen.getByRole('button',{name:'내용 편집'})).toBeEnabled();expect(screen.getByText('두 번째 답변')).toBeInTheDocument();
});

test('failed FAQ detail cannot be edited as though its content had loaded',async()=>{
 fetchFaqDetail.mockRejectedValue(Error('offline'));show(FAQ);await screen.findByText('상세 내용을 불러오지 못했어요. 다시 확인한 뒤 수정해 주세요.');expect(screen.getByRole('button',{name:'내용 편집'})).toBeDisabled();expect(updateFaq).not.toHaveBeenCalled();
});

test('FAQ deletion still requires the explicit existing confirmation',async()=>{
 show(FAQ);await screen.findByRole('button',{name:'삭제',exact:true});fireEvent.click(screen.getByRole('button',{name:'삭제',exact:true}));expect(deleteFaq).not.toHaveBeenCalled();const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'삭제하기'}));await waitFor(()=>expect(deleteFaq).toHaveBeenCalledWith(11));
});

test('public FAQ retains its support list and never exposes operator tools',async()=>{
 show(FAQ,false);await screen.findByRole('heading',{name:'자주 묻는 질문'});await screen.findByText('첫 번째 답변');expect(screen.queryByRole('button',{name:'새 FAQ 등록'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'내용 편집'})).not.toBeInTheDocument();expect(screen.getByLabelText('검색어')).toBeInTheDocument();
});

test('a slower earlier Q&A status request cannot overwrite the latest selection',async()=>{
 let resolveReceived;fetchQna.mockImplementation(({statusCode})=>statusCode==='received'?new Promise(resolve=>{resolveReceived=resolve;}):Promise.resolve(listPage(statusCode==='answered'?[questions[1]]:questions)));
 show(QnA);await screen.findByRole('button',{name:/첫 번째 합성 문의/});fireEvent.click(screen.getByRole('button',{name:'접수',exact:true}));fireEvent.click(screen.getByRole('button',{name:'답변 완료',exact:true}));await screen.findByRole('button',{name:/두 번째 합성 문의/});
 await act(async()=>resolveReceived(listPage([questions[0]])));
 expect(screen.queryByRole('button',{name:/첫 번째 합성 문의/})).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'답변 완료',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('failed FAQ deletion closes confirmation and exposes the error inside the selected detail without retrying',async()=>{
 deleteFaq.mockRejectedValueOnce(Error('삭제 요청 결과를 확인해 주세요.'));show(FAQ);await screen.findByRole('button',{name:'삭제',exact:true});fireEvent.click(screen.getByRole('button',{name:'삭제',exact:true}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'삭제하기'}));
 const detail=screen.getByRole('region',{name:'선택한 FAQ'});expect(await within(detail).findByRole('alert')).toHaveTextContent('삭제 요청 결과를 확인해 주세요.');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(deleteFaq).toHaveBeenCalledTimes(1);
 await waitFor(()=>expect(screen.getByRole('heading',{name:'안내 상세'})).toHaveFocus());
});

test('FAQ default selection, new writing and editing move focus into the matching detail workspace',async()=>{
 show(FAQ);await waitFor(()=>expect(screen.getByRole('button',{name:'내용 편집'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:/첫 FAQ 제목/}));await waitFor(()=>expect(screen.getByRole('heading',{name:'안내 상세'})).toHaveFocus());
 fireEvent.click(screen.getByRole('button',{name:'새 FAQ 등록'}));await waitFor(()=>expect(screen.getByRole('heading',{name:'새 FAQ 작성'})).toHaveFocus());fireEvent.click(screen.getByRole('button',{name:'취소',exact:true}));fireEvent.click(screen.getByRole('button',{name:'내용 편집'}));await waitFor(()=>expect(screen.getByRole('heading',{name:'FAQ 편집'})).toHaveFocus());expect(createFaq).not.toHaveBeenCalled();expect(updateFaq).not.toHaveBeenCalled();
});

test('Q&A default selection and another inquiry both move keyboard focus to the detail heading',async()=>{
 show(QnA);await screen.findByRole('button',{name:/첫 번째 합성 문의/});fireEvent.click(screen.getByRole('button',{name:/첫 번째 합성 문의/}));await waitFor(()=>expect(screen.getByRole('heading',{name:'문의 상세'})).toHaveFocus());
 fireEvent.click(screen.getByRole('button',{name:/두 번째 합성 문의/}));await waitFor(()=>expect(screen.getByLabelText('답변 내용')).toHaveValue('기존 답변'));await waitFor(()=>expect(screen.getByRole('heading',{name:'문의 상세'})).toHaveFocus());expect(updateQna).not.toHaveBeenCalled();
});

function showAt(Component,path){const router=createMemoryRouter([{path:'*',element:<Component adminMode/>}],{initialEntries:[path]});render(<RouterProvider router={router}/>);return router;}

test('Q&A deep links apply server status and explicit loaded search, including browser history',async()=>{
 const router=showAt(QnA,'/admin/qna?statusCode=received&keyword=첫');
 await screen.findByRole('button',{name:/첫 번째 합성 문의/});expect(fetchQna).toHaveBeenLastCalledWith(expect.objectContaining({statusCode:'received',adminMode:true}));
 expect(within(screen.getByRole('region',{name:'문의 목록'})).queryByRole('button',{name:/두 번째 합성 문의/})).not.toBeInTheDocument();
 expect(screen.getByLabelText('적용된 문의 조건')).toHaveTextContent('불러온 목록 검색: 첫');
 fireEvent.click(screen.getByRole('button',{name:'답변 완료',exact:true}));await waitFor(()=>expect(new URLSearchParams(router.state.location.search).get('statusCode')).toBe('answered'));
 await act(async()=>router.navigate(-1));await waitFor(()=>expect(fetchQna).toHaveBeenLastCalledWith(expect.objectContaining({statusCode:'received'})));
 expect(screen.getByLabelText('불러온 문의에서 검색')).toHaveValue('첫');expect(updateQna).not.toHaveBeenCalled();
});

test('Q&A dirty drafts block URL navigation and approved status drilldown asks only once',async()=>{
 const router=showAt(QnA,'/admin/qna?statusCode=received');await screen.findByLabelText('답변 내용');fireEvent.change(screen.getByLabelText('답변 내용'),{target:{value:'보존할 답변'}});window.confirm.mockReturnValue(false);
 await act(async()=>router.navigate('/admin/qna?statusCode=answered'));expect(router.state.location.search).toBe('?statusCode=received');expect(screen.getByLabelText('답변 내용')).toHaveValue('보존할 답변');
 window.confirm.mockClear();window.confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'답변 완료',exact:true}));
 await waitFor(()=>expect(new URLSearchParams(router.state.location.search).get('statusCode')).toBe('answered'));expect(window.confirm).toHaveBeenCalledTimes(1);expect(updateQna).not.toHaveBeenCalled();
});

test('FAQ deep-linked status filters only loaded rows and browser back restores the condition',async()=>{
 const router=showAt(FAQ,'/admin/faq?status=review&category=account&keyword=FAQ');
 expect(await screen.findByRole('heading',{name:'검토할 FAQ 제목'})).toBeInTheDocument();
 expect(fetchFaqs).toHaveBeenLastCalledWith(expect.objectContaining({category:'account',keyword:'FAQ'}));expect(fetchFaqs.mock.calls[0][0]).not.toHaveProperty('status');
 expect(screen.getByLabelText('적용된 FAQ 조건')).toHaveTextContent('불러온 목록 상태: 검토 중');
 fireEvent.click(screen.getByRole('button',{name:'게시 중',exact:true}));expect(fetchFaqs).toHaveBeenCalledTimes(1);
 await act(async()=>router.navigate(-1));expect(screen.getByRole('button',{name:'검토 중',exact:true})).toHaveAttribute('aria-pressed','true');expect(fetchFaqs).toHaveBeenCalledTimes(1);
 fireEvent.click(screen.getByRole('button',{name:'조회 결과 2건 FAQ 목록 보기'}));await waitFor(()=>expect(screen.getByRole('heading',{name:'안내 목록'})).toHaveFocus());expect(updateFaq).not.toHaveBeenCalled();
});

test('FAQ filtered navigation protects edits and never saves when following a status',async()=>{
 const router=showAt(FAQ,'/admin/faq');await waitFor(()=>expect(screen.getByRole('button',{name:'내용 편집'})).toBeEnabled());fireEvent.click(screen.getByRole('button',{name:'내용 편집'}));fireEvent.change(screen.getByLabelText('제목'),{target:{value:'보존할 제목'}});
 window.confirm.mockReturnValue(false);fireEvent.click(screen.getByRole('button',{name:'검토 중',exact:true}));expect(router.state.location.search).toBe('');expect(screen.getByLabelText('제목')).toHaveValue('보존할 제목');
 window.confirm.mockClear();window.confirm.mockReturnValue(true);fireEvent.click(screen.getByRole('button',{name:'검토 중',exact:true}));await waitFor(()=>expect(router.state.location.search).toBe('?status=review'));expect(window.confirm).toHaveBeenCalledTimes(1);
 expect(updateFaq).not.toHaveBeenCalled();expect(createFaq).not.toHaveBeenCalled();expect(deleteFaq).not.toHaveBeenCalled();
});
