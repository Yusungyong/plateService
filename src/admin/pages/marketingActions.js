import {CHECKS,requestKey,toInstant,safeRetry} from './marketingModel';
export function makeDialog(kind,target,data,extra={}){
 const campaign=target?.config||data?.queue?.campaigns?.[0]?.config;
 const initial={reason:'',confirmed:false,dueAt:'',campaignId:campaign?.id||'',channel:'WEBSITE',variant:'a',linkCode:'',mediaId:'',creativeId:'',decision:'APPROVE',checks:Object.fromEntries(CHECKS.map(([key])=>[key,false])),...extra};
 if(kind==='campaign')Object.assign(initial,{name:campaign.name,audience:campaign.audience.primary,draftDay:campaign.schedule.maxDraftsPerDay,draftWeek:campaign.schedule.maxDraftsPerWeek,postTime:campaign.schedule.publishTime});
 if(kind==='edit')initial.content=structuredClone(extra.production.versions.at(-1).package.content);
 return {kind,target,initial,key:requestKey(kind),...extra};
}
export function buildRequest(spec,values,data){
 const kind=spec.kind,target=spec.target,key=spec.key;
 const reason=values.reason?.trim();
 if(['control','edit','cancel-edit','review','resolve','retime'].includes(kind)&&(!reason||reason.length>200))throw Error('처리 사유를 1~200자로 입력해 주세요.');
 const response=(path,body,method='POST',extra={})=>({path,body,method,...extra});
 const campaign=data.queue.campaigns.find(c=>c.id===values.campaignId)||data.queue.campaigns[0];
 if(kind==='bootstrap'&&!values.confirmed)throw Error('초기 설정을 확인하고 확인란을 선택해 주세요.');
 if(kind==='bootstrap')return response('/campaigns/'+target.id,{expectedRevision:0,config:target},'PUT');
 if(kind==='campaign'){
  const config=structuredClone(target.config);config.revision=target.revision+1;config.name=values.name.trim();config.audience.primary=values.audience.trim();config.schedule.maxDraftsPerDay=Number(values.draftDay);config.schedule.maxDraftsPerWeek=Number(values.draftWeek);config.schedule.publishTime=values.postTime;config.updatedAt=new Date().toISOString();
  if(!config.name||!config.audience.primary||config.schedule.maxDraftsPerDay<1||config.schedule.maxDraftsPerDay>2||config.schedule.maxDraftsPerWeek<1||config.schedule.maxDraftsPerWeek>12)throw Error('캠페인 이름·대상·생성 한도를 확인해 주세요.');
  return response('/campaigns/'+target.id,{expectedRevision:target.revision,config},'PUT');
 }
 if(kind==='control')return response(spec.path,{expectedRevision:spec.revision,paused:spec.paused,reason});
 if(kind==='generate'||kind==='retry'){
  if(!campaign)throw Error('캠페인을 먼저 등록해 주세요.');if(kind==='retry'&&!safeRetry(target))throw Error('모델이 시작된 작업은 재실행할 수 없어요.');
  return response('/jobs',{campaignId:campaign.id,campaignRevision:campaign.revision,key:kind==='retry'?'retry-'+target.id.slice(0,8)+'-'+key.slice(-24):key,notBefore:toInstant(values.dueAt),kind:'GENERATE_DRAFT'});
 }
 if(kind==='schedule'){if(!campaign)throw Error('캠페인을 먼저 등록해 주세요.');return response('/schedules',{campaignId:campaign.id,campaignRevision:campaign.revision,key,dueAt:toInstant(values.dueAt),enabled:false});}
 if(kind==='retime')return response('/console/'+(spec.post?'posts/':'schedules/')+target.id+(spec.post?'/schedule':''),{expectedDueAt:target.due_at,dueAt:toInstant(values.dueAt),reason},'PATCH');
 if(kind==='edit')return response('/creatives/'+target.id+'/production/content-requests',{expectedRevision:spec.production.revision,key,action:'REQUEST',content:values.content,reason});
 if(kind==='cancel-edit')return response('/creatives/'+target.id+'/production/content-requests',{expectedRevision:spec.production.revision,key,action:'CANCEL',content:null,reason});
 if(kind==='review'){
  if(values.decision==='APPROVE'&&(!spec.previewsVerified||CHECKS.some(([key])=>values.checks[key]!==true)))throw Error('현재 카드 두 안과 검토 항목 여섯 개를 모두 확인해 주세요.');
  return response('/creatives/'+target.id+'/production/reviews',{expectedRevision:spec.production.revision,key,decision:values.decision,checks:values.checks,reason});
 }
 if(['cancel','hide','dispatch','resolve','prepare','post','bootstrap'].includes(kind)&&!values.confirmed)throw Error('작업 내용을 확인하고 확인란을 선택해 주세요.');
 if(kind==='cancel')return response((spec.post?'/publishing/posts/':'/jobs/')+target.id+'/cancel');
 if(kind==='hide')return response('/publishing/posts/'+target.id+'/public',undefined,'DELETE');
 if(kind==='dispatch')return response('/schedules/'+target.id+'/dispatch');
 if(kind==='resolve')return response((spec.post?'/publishing/posts/':'/jobs/')+target.id+'/resolve',spec.post?{decision:'CLOSE_NO_RETRY',confirmedExternalState:true,reason}:{confirmedNoRetry:true,reason});
 if(kind==='link'){if(!campaign)throw Error('캠페인을 먼저 등록해 주세요.');return response('/links',{campaignId:campaign.id,campaignRevision:campaign.revision,channel:values.channel,variant:values.variant,key});}
 if(kind==='prepare'){
  const latest=spec.production.versions.at(-1),artifact=latest.package.artifacts.find(a=>a.variantId===values.variant);
  return response('/publishing/media',{creativeId:target.id,productionRevision:spec.production.revision,packageHash:latest.hash,variant:values.variant,pngSha:artifact.sha256,confirmedReviewedJpeg:true},'POST',{preview:{creativeId:target.id,variant:values.variant}});
 }
 if(kind==='post'){
  const creative=data.queue.creatives.find(c=>c.id===values.creativeId),media=data.media.find(m=>m.id===values.mediaId),account=data.publishing.accounts.find(a=>a.channel===values.channel),link=data.links.find(l=>l.code===values.linkCode);
  if(!creative||creative.state!=='READY_FOR_PUBLISHING'||!media||media.creative_id!==creative.id||media.variant!==values.variant||media.package_hash!==creative.packageHash||media.production_revision!==creative.productionRevision||!account||!link||!link.enabled||link.channel!==values.channel||link.campaign_id!==creative.campaign_id)throw Error('현재 검토한 제작물·이미지·계정·채널 링크를 함께 선택해 주세요.');
  return response('/publishing/posts',{creativeId:creative.id,productionRevision:creative.productionRevision,packageHash:creative.packageHash,variant:values.variant,channel:values.channel,accountRevision:account.revision,mediaId:media.id,linkCode:link.code,dueAt:toInstant(values.dueAt),key,confirmedPublish:true});
 }
 throw Error('작업 내용을 확인해 주세요.');
}
