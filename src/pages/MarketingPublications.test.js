import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import MarketingPublications from './MarketingPublications';
import { API_BASE_URL } from '../api/client';
const id='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const post={id,title:'사진과 식당을 함께 기억해요.',caption:'사진에 식당 정보도 함께 기록해요.',cta:'접시 사용법 보기',imageUrl:'https://foodplayserver.shop:8090/api/marketing/published-assets/'+'a'.repeat(64)+'.jpg',landingUrl:'https://plate-service.com/go/ABCDEFGH2345',publishedAt:'2026-10-14T00:00:00Z'};
function show(path='/how-to'){return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/how-to" element={<MarketingPublications/>}/><Route path="/how-to/:id" element={<MarketingPublications/>}/></Routes></MemoryRouter>);}
function reply(data){return Promise.resolve({ok:true,json:async()=>({data})});}
beforeEach(()=>{global.fetch=jest.fn(()=>reply({items:[post]}));});
test('public list displays only verified publication links and sends no credentials',async()=>{show();await screen.findByText(post.title);expect(fetch.mock.calls[0][0]).toBe(API_BASE_URL+'/api/marketing/publications');expect(fetch.mock.calls[0][1]).toMatchObject({credentials:'omit',referrerPolicy:'no-referrer',redirect:'error'});expect(screen.getByRole('link',{name:post.cta})).toHaveAttribute('href',post.landingUrl);expect(screen.getByRole('img')).toHaveAttribute('src',post.imageUrl);});
test('detail opens matching public content without exposing account or operator fields',async()=>{fetch.mockImplementation(()=>reply(post));show('/how-to/'+id);await screen.findByText(post.caption);expect(fetch.mock.calls[0][0]).toBe(API_BASE_URL+'/api/marketing/publications/'+id);expect(screen.queryByText('su12ng')).not.toBeInTheDocument();});
test('empty list is distinct from a failed fetch and retry works',async()=>{fetch.mockRejectedValueOnce(Error('offline'));show();await screen.findByRole('alert');fetch.mockImplementationOnce(()=>reply({items:[]}));fireEvent.click(screen.getByRole('button',{name:'다시 불러오기'}));await screen.findByText('곧 접시 사용법을 소개할게요.');});
test('missing or malformed post addresses do not become published content',async()=>{show('/how-to/not-a-post');await screen.findByText('게시물을 찾을 수 없어요.');expect(fetch).not.toHaveBeenCalled();});
test('foreign URLs and nonpublished response shapes are rejected',async()=>{fetch.mockImplementationOnce(()=>reply({items:[{...post,imageUrl:'https://evil.invalid/private.jpg'}]}));show();await screen.findByRole('alert');expect(screen.queryByRole('img')).not.toBeInTheDocument();});
