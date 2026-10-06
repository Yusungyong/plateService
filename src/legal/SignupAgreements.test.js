import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import Signup from '../pages/Signup';
import SignupAgreements from './SignupAgreements';

const catalog = {enabled:true,catalogRevision:7,minimumAge:15,documents:[
  {documentId:'terms',version:'2026-10',title:'이용약관',body:'게시된 약관 원문',sha256:'a'.repeat(64),actionType:'ACCEPT',required:true},
  {documentId:'privacy',version:'2026-10',title:'개인정보 처리방침',body:'게시된 처리방침 원문',sha256:'b'.repeat(64),actionType:'NOTICE',required:true},
  {documentId:'optional',version:'v1',title:'선택 안내',body:'선택 문서',sha256:'c'.repeat(64),actionType:'CONSENT',required:false},
]};
const response = data => ({ok:true,status:200,headers:{get:()=> 'application/json'},json:async()=>({data})});
afterEach(() => jest.restoreAllMocks());

test.each([false,true])('blocks signup when the catalogue is unavailable (network failure: %s)', async failure => {
  const fetch = jest.spyOn(global,'fetch');
  if (failure) fetch.mockRejectedValue(new Error('연결 실패'));
  else fetch.mockResolvedValue(response({enabled:false,documents:[]}));
  render(<MemoryRouter><Signup /></MemoryRouter>);
  await screen.findByRole('alert');
  expect(screen.getByRole('button',{name:'가입하기'})).toBeDisabled();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  expect(fetch.mock.calls.every(([,o])=>o.method === 'GET')).toBe(true);
});

test('builds exact versioned choices and distinguishes notice from consent',async()=> {
  jest.spyOn(global,'fetch').mockResolvedValue(response(catalog));
  const change = jest.fn();
  render(<MemoryRouter><SignupAgreements onChange={change} /></MemoryRouter>);
  expect(await screen.findByText('게시된 약관 원문')).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('[필수] 이용약관에 동의합니다.'));
  fireEvent.click(screen.getByLabelText('[필수] 개인정보 처리방침 내용을 확인했습니다.'));
  expect(change).toHaveBeenLastCalledWith(null);
  fireEvent.click(screen.getByLabelText('[필수] 만 15세 이상입니다.'));
  await waitFor(()=>expect(change).toHaveBeenLastCalledWith({catalogRevision:7,expectedRevision:0,minimumAgeConfirmed:true,
    decisions:catalog.documents.map((d,i)=>({documentId:d.documentId,version:d.version,sha256:d.sha256,decision:['ACCEPTED','ACKNOWLEDGED','DECLINED'][i]}))}));
  fireEvent.click(screen.getByLabelText('[필수] 이용약관에 동의합니다.'));
  expect(change).toHaveBeenLastCalledWith(null);
});
