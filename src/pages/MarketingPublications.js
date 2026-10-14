import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../api/client';
import './MarketingPublications.css';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
function validPost(item){
 if(!item||!UUID.test(item.id)||!['title','caption','cta'].every(k=>typeof item[k]==='string'&&item[k].length<=(k==='caption'?1000:100))||typeof item.publishedAt!=='string'||!Number.isFinite(Date.parse(item.publishedAt)))return false;
 try{const image=new URL(item.imageUrl),landing=new URL(item.landingUrl);return image.protocol==='https:'&&['foodplayserver.shop','plate-service.com'].includes(image.hostname)&&!image.username&&!image.password&&!image.search&&!image.hash&&/^\/api\/marketing\/published-assets\/[a-f0-9]{64}\.jpg$/.test(image.pathname)&&landing.origin==='https://plate-service.com'&&/^\/go\/[A-Z2-9]{12}$/.test(landing.pathname)&&!landing.search&&!landing.hash&&!landing.username&&!landing.password;}catch{return false;}
}
export default function MarketingPublications(){
 const {id}=useParams(),[state,setState]=useState({status:'loading',items:[]}),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(id&&!UUID.test(id)){setState({status:'missing',items:[]});return undefined;}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);let active=true;setState({status:'loading',items:[]});
  (async()=>{try{const response=await fetch(API_BASE_URL+'/api/marketing/publications'+(id?'/'+id:''),{credentials:'omit',redirect:'error',referrerPolicy:'no-referrer',signal:controller.signal});if(response.status===404){if(active)setState({status:'missing',items:[]});return;}if(!response.ok)throw Error('unavailable');const json=await response.json(),items=id?[json.data]:json.data?.items;if(!Array.isArray(items)||items.length>30||items.some(i=>!validPost(i)))throw Error('invalid');if(active)setState({status:'ready',items});}catch{if(active)setState({status:'error',items:[]});}finally{clearTimeout(timer);}})();
  return()=>{active=false;clearTimeout(timer);controller.abort();};
 },[id,retry]);
 return <div className="marketing-public"><header><Link className="marketing-wordmark" to="/">접시</Link><Link to="/how-to">사용법</Link></header><main><p className="marketing-eyebrow">사진은 남기고, 맛집은 기억하고.</p><h1>{id?'접시, 이렇게 써보세요.':'짧게 보고, 쉽게 시작해요.'}</h1><p className="marketing-intro">기록부터 친구 공유까지, 접시 사용법을 확인해 보세요.</p>
 {state.status==='loading'&&<p role="status">사용법을 불러오고 있어요.</p>}
 {state.status==='error'&&<div role="alert"><p>사용법을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p><button onClick={()=>setRetry(n=>n+1)}>다시 불러오기</button></div>}
 {state.status==='missing'&&<div><p>게시물을 찾을 수 없어요.</p><Link to="/how-to">다른 사용법 보기</Link></div>}
 {state.status==='ready'&&!state.items.length&&<p className="marketing-empty">곧 접시 사용법을 소개할게요.</p>}
 <div className={'marketing-post-grid'+(id?' is-detail':'')}>{state.items.map(item=><article key={item.id}>
 {!id?<Link to={'/how-to/'+item.id}><img src={item.imageUrl} alt={item.title.replaceAll('\n',' ')} loading="lazy"/><h2>{item.title}</h2></Link>:<><img src={item.imageUrl} alt={item.title.replaceAll('\n',' ')}/><h2>{item.title}</h2><p className="marketing-caption">{item.caption}</p></>}
 <a className="marketing-post-cta" href={item.landingUrl}>{item.cta}</a>
 </article>)}</div></main><footer><Link to="/privacy-policy">개인정보 처리방침</Link><Link to="/terms-of-service">이용약관</Link></footer></div>;
}
