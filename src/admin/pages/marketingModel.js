export const TABS=[['overview','현황'],['campaigns','캠페인'],['studio','제작물'],['queue','작업·예약'],['posts','게시'],['metrics','성과'],['history','이력']];
export const CHECKS=[['facts','실제 기능과 문구가 맞아요'],['voice','말투와 표현이 자연스러워요'],['visualMatch','문구와 카드 이미지가 맞아요'],['privacy','개인정보와 사용 허용 범위를 확인했어요'],['readability','이미지와 글씨를 실제 크기로 확인했어요'],['destination','이동할 페이지와 안내가 맞아요']];
export const LABELS={DRAFT:'검토 전',NO_PRODUCTION:'카드 제작 대기',CONTENT_EDIT_REQUESTED:'수정 카드 제작 대기',READY_FOR_PUBLISHING:'검토 완료',REJECTED:'수정 필요',BLOCKED_CURRENT_POLICY:'현재 설정으로 실행 불가',QUEUED:'대기',LEASED:'작업 준비 중',RUNNING:'생성 중',SUCCEEDED:'생성 완료',FAILED:'실패',BLOCKED:'실행 차단',UNKNOWN:'결과 확인 필요',CANCELLED:'취소',CONTAINER_STARTING:'이미지 전달 중',CONTAINER_READY:'이미지 처리 중',PUBLISHING:'게시 중',MEDIA_SAVED:'게시 결과 확인 중',PUBLISHED:'게시 완료',HIDDEN:'웹에서 숨김',READY:'최근 확인 통과',NOT_READY:'준비 필요',NOT_REPORTED:'Mac 확인 기록 없음'};
export const label=value=>LABELS[value]||value||'확인 필요';
export function time(value){if(value===null||value===undefined)return '기록 없음';const d=new Date(value);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('ko-KR',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'short'}).format(d):'시각 확인 불가';}
export function datetime(value){const date=value?new Date(value):new Date();if(!Number.isFinite(date.getTime()))return '';return new Date(date.getTime()+9*3600000).toISOString().slice(0,16);}
export function toInstant(value){const d=new Date(value+':00+09:00');if(!Number.isFinite(d.getTime()))throw Error('예약 시각을 확인해 주세요.');return d.toISOString();}
export function requestKey(prefix='console'){const bytes=new Uint8Array(12);window.crypto.getRandomValues(bytes);return prefix+'-'+Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');}
export function healthyAccount(account,now=Date.now()){return account?.state==='VERIFIED'&&(account.channel==='WEBSITE'||account.profile_landing_confirmed===true&&new Date(account.token_expires_at).getTime()>now+600000);}
export function summarize(value){
 const queue=value?.queue,publish=value?.publishing;
 if(!queue?.control||!publish?.control||!['assets','links','media','workerChecks'].every(k=>Array.isArray(value[k]))||!Array.isArray(queue.events)||!Array.isArray(queue.schedules)||!Array.isArray(publish.accounts)||!Array.isArray(queue.campaigns)||!Array.isArray(queue.jobs)||!Array.isArray(queue.creatives)||!Array.isArray(publish?.posts)||!Array.isArray(value.links))throw Error('마케팅 운영 API 응답을 확인하지 못했습니다.');
 const jobs=queue.jobs,creatives=queue.creatives,posts=publish.posts;
 return {campaigns:queue.campaigns.length,waiting:jobs.filter(j=>j.status==='QUEUED').length,review:creatives.filter(c=>['DRAFT','REJECTED'].includes(c.state)).length,unknown:jobs.filter(j=>j.status==='UNKNOWN').length+posts.filter(p=>p.state==='UNKNOWN').length,published:posts.filter(p=>p.state==='PUBLISHED').length,instagramConnected:healthyAccount(publish.accounts?.find(a=>a.channel==='INSTAGRAM')),generationPaused:queue.control?.paused===true,publishingPaused:queue.control?.paused===true||publish.control?.paused===true||publish.runtimeEnabled!==true};
}
export const safeRetry=job=>['FAILED','BLOCKED'].includes(job.status)&&!job.started_at;
export function errorMessage(error){const messages={STALE_PRODUCTION_REVISION:'제작물이 변경됐어요. 최신 내용을 다시 불러와 주세요.',CONTENT_RENDER_PENDING:'Mac에서 수정 카드를 만드는 중이에요. 완료 후 다시 검토해 주세요.',PUBLISHING_NOT_ACTIVATED:'서버의 게시 기능이 아직 활성화되지 않았어요.',UNKNOWN_PUBLICATION_REMAINS:'결과를 확인하지 못한 게시물을 먼저 조치해 주세요.',PREVIEW_STORAGE_NOT_CONFIGURED:'서버의 비공개 카드 보관 경로를 준비해 주세요.',CAMPAIGN_CHANGED_OR_PAUSED:'캠페인이 변경되거나 중단됐어요. 최신 설정을 확인해 주세요.'};return messages[error?.payload?.message]||messages[error?.message]||error?.message||'작업 결과를 확인하지 못했어요.';}

export function workerReason(reason){return {ACCOUNT_NOT_CONNECTED:'Instagram 공식 연결을 아직 하지 않았어요.',PROFILE_LINK_NOT_CONFIRMED:'실제 프로필 링크를 확인해야 해요.',SOURCE_SYNC_NEEDS_REVIEW:'이 Mac의 제작물·캠페인·소재를 확인해 주세요.',USAGE_UNKNOWN:'계정 사용량을 확인하지 못했어요.',USAGE_STALE_OR_UNKNOWN:'사용량 확인 정보가 오래됐어요.',USAGE_HEADROOM_LOW:'계정 사용량이 생성 중단 기준에 도달했어요.',EXECUTOR_PAUSED:'Mac 제작 실행이 중단되어 있어요.',CHATGPT_AUTH_REQUIRED:'Mac의 ChatGPT 구독 로그인을 확인해 주세요.',ACCOUNT_PLAN_CHANGED_OR_UNKNOWN:'확정한 구독 플랜과 현재 계정을 확인해 주세요.',CREDIT_USAGE_NOT_ALLOWED:'추가 비용0원 정책으로 크레딧 사용을 차단했어요.',USAGE_CHECK_PASSED:'Mac에서 최근 사용량 조건을 확인했어요.',ACCOUNT_CHECK_PASSED:'Mac에서 계정 연결 조건을 확인했어요.'}[reason]||'Mac에서 현재 연결과 준비 자료를 확인해 주세요.';}

export const PRIMARY_TABS=[['overview','오늘'],['studio','제작물'],['posts','게시'],['history','이력']];
export const MORE_TABS=[['campaigns','캠페인'],['queue','작업·예약'],['metrics','성과']];
export function creativeDate(creative){return creative.created_at||creative.createdAt||creative.producedAt||null;}
export function creativeCampaign(creative,campaigns){return campaigns.find(c=>c.id===creative.campaign_id)?.config?.name||creative.campaign_id||'캠페인 확인 필요';}
export function creativeTitle(creative,campaigns){return (creativeDate(creative)?time(creativeDate(creative)):'날짜 기록 없음')+' · '+creativeCampaign(creative,campaigns);}
export function filterCreatives(creatives,campaigns,query='',filter='all'){
 const normalize=text=>String(text).toLocaleLowerCase().replace(/[\s.\/월일-]/g,'');
 const needle=normalize(query.trim());
 return [...creatives].sort((a,b)=>(Date.parse(creativeDate(b))||0)-(Date.parse(creativeDate(a))||0)).filter(c=>{
  if(filter==='review'&&!['DRAFT','REJECTED'].includes(c.state))return false;
  if(filter==='ready'&&c.state!=='READY_FOR_PUBLISHING')return false;
  if(filter==='waiting'&&!['NO_PRODUCTION','CONTENT_EDIT_REQUESTED'].includes(c.state))return false;
  const stamp=Date.parse(creativeDate(c)),day=Number.isFinite(stamp)?new Date(stamp+9*3600000).toISOString().slice(0,10):'';
  return !needle||normalize([creativeTitle(c,campaigns),c.id,label(c.state),day,day.slice(5)].join(' ')).includes(needle);
 });
}

const EVENT_LABELS={MAC_CHECK_GENERATOR:'Mac 제작 상태 확인',MAC_CHECK_PUBLISHER:'게시 연결 상태 확인',QUEUED:'제작 요청 등록',CLAIMED:'제작 작업 준비',START_ACKNOWLEDGED:'제작 시작 확인',RESULT_SUCCEEDED:'제작 완료',PRODUCTION_SAVED:'제작물 저장',PRODUCTION_APPROVE:'제작물 검토 승인',PRIVATE_PREVIEW_SAVED:'미리보기 저장',PUBLISH_ACCOUNT_VERIFIED:'게시 계정 연결 확인',PUBLISH_RESUMED:'게시 실행 재개',PUBLISH_PAUSED:'게시 실행 중단',PUBLISH_MEDIA_PREPARED:'게시용 이미지 준비',PUBLISH_QUEUED:'게시 예약 등록',PUBLISH_PUBLISHING:'게시 시작',PUBLISH_PUBLISHED:'게시 완료',PUBLISH_CONTAINER_STARTING:'게시 이미지 전달 시작',PUBLISH_CONTAINER_READY:'게시 이미지 처리 완료',PUBLISH_MEDIA_SAVED:'게시 결과 저장',WORKER_CREDENTIAL_ISSUED:'자동 실행 연결파일 발급',CAMPAIGN_VERSION_SAVED:'캠페인 설정 저장'};
export const eventLabel=value=>EVENT_LABELS[value]||value||'운영 기록';
