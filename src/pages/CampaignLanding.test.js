import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CampaignLanding from './CampaignLanding';
const code='ABCDEFGH2345', token='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
function show(path=`/go/${code}`) { return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/go/:code" element={<CampaignLanding/>}/></Routes></MemoryRouter>); }
function reply(data) { return Promise.resolve({ok:true,json:async()=>({data})}); }
beforeEach(()=>{global.fetch=jest.fn(url=>reply(url.endsWith('/capabilities')?{enabled:true,consentVersion:'marketing-measurement-v1'}:{code,enabled:true,variant:'record',channel:'INSTAGRAM'}));Object.defineProperty(globalThis,'crypto',{configurable:true,value:{randomUUID:()=>token}});});
test('opening the landing fetches only public metadata, without tracking or credentials',async()=>{
 show();await screen.findByText('12자리 캠페인 코드',{exact:false}).catch(()=>{});await screen.findByText(code);
 expect(fetch).toHaveBeenCalledTimes(2);expect(fetch.mock.calls[0][1]).toMatchObject({method:'GET',credentials:'omit',referrerPolicy:'no-referrer'});
 expect(screen.getByRole('link',{name:'App Store에서 설치하기 ↗'})).toHaveAttribute('href','https://apps.apple.com/kr/app/id6759185760');
 expect(screen.getByRole('link',{name:'Google Play에서 설치하기 ↗'})).toHaveAttribute('href','https://play.google.com/store/apps/details?id=com.plateappnew');
 expect(screen.getByRole('checkbox')).not.toBeChecked();expect(screen.getByRole('button',{name:'동의하고 앱 연결 준비하기'})).toBeDisabled();expect(screen.getByRole('link',{name:'접시 앱 열기'})).toHaveAttribute('href',`plate://campaign?code=${code}`);
});
test('explicit opt-in creates one visit and supplies the verified token for the app',async()=>{
 show();await screen.findByText(code);fetch.mockImplementationOnce(()=>reply({code,visitToken:token}));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'동의하고 앱 연결 준비하기'}));
 await waitFor(()=>expect(screen.getByRole('link',{name:'접시 앱 열기'})).toHaveAttribute('href',`plate://campaign?code=${code}&visit=${token}`));
 const body=JSON.parse(fetch.mock.calls[2][1].body);expect(body).toEqual({code,requestId:token,source:'WEB',consent:true,consentVersion:'marketing-measurement-v1'});expect(body).not.toHaveProperty('username');
});
test('lost visit response retries the same requestId and preserves nontracking app link',async()=>{
 show();await screen.findByText(code);fetch.mockRejectedValueOnce(Error('lost'));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'동의하고 앱 연결 준비하기'}));await screen.findByRole('alert');
 const first=JSON.parse(fetch.mock.calls[2][1].body);fetch.mockImplementationOnce(()=>reply({code,visitToken:token}));fireEvent.click(screen.getByRole('button',{name:'동의하고 앱 연결 준비하기'}));await waitFor(()=>expect(fetch).toHaveBeenCalledTimes(4));expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual(first);
});
test('invalid or disabled campaign has no measurement controls',async()=>{show('/go/../../evil');expect(fetch).not.toHaveBeenCalled();});
test('wrong token response is rejected and cannot enter the app URL',async()=>{show();await screen.findByText(code);fetch.mockImplementationOnce(()=>reply({code,visitToken:'private-name'}));fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'동의하고 앱 연결 준비하기'}));await screen.findByRole('alert');expect(screen.getByRole('link',{name:'접시 앱 열기'})).toHaveAttribute('href',`plate://campaign?code=${code}`);});

test.each(['disabled','unavailable'])('measurement %s keeps app access without consent controls',async(mode)=>{
 fetch.mockImplementation(url=>url.endsWith('/capabilities')?(mode==='disabled'?reply({enabled:false,consentVersion:'marketing-measurement-v1'}):Promise.reject(Error('offline'))):reply({code,enabled:true,variant:'record',channel:'INSTAGRAM'}));
 show();await screen.findByText(code);
 expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
 expect(screen.getByRole('link',{name:'접시 앱 열기'})).toHaveAttribute('href',`plate://campaign?code=${code}`);
 expect(fetch.mock.calls.every(([,options])=>options.method==='GET')).toBe(true);
});
