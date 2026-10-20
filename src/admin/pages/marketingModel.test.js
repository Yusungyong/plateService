import {eventLabel,filterCreatives} from './marketingModel';
const campaigns=[{id:'howto',config:{name:'전국 앱 사용법'}}];
const items=[{id:'older',campaign_id:'howto',created_at:'2026-10-19T01:00:00Z',state:'DRAFT'}, {id:'current',campaign_id:'howto',created_at:'2026-10-19T18:00:00Z',state:'READY_FOR_PUBLISHING'}];
test.each(['2026-10-20','10/20','10월 20일'])('creative date search uses Korean calendar day for %s',query=>{expect(filterCreatives(items,campaigns,query).map(c=>c.id)).toEqual(['current']);});
test('creative status and campaign filtering combine without modifying snapshot order',()=>{expect(filterCreatives(items,campaigns,'전국 앱','review').map(c=>c.id)).toEqual(['older']);expect(filterCreatives(items,campaigns).map(c=>c.id)).toEqual(['current','older']);expect(items[0].id).toBe('older');});

test('known event names are readable and unknown codes remain visible',()=>{expect(eventLabel('PRODUCTION_APPROVE')).toBe('제작물 검토 승인');expect(eventLabel('FUTURE_SERVER_EVENT')).toBe('FUTURE_SERVER_EVENT');});
