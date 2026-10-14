import {apiClient} from '../../api';
import {unwrapAdminResponse} from './adminApiUtils';
const ROOT='/api/admin/marketing';
const id=value=>encodeURIComponent(value);
export const getMarketingConsole=async options=>unwrapAdminResponse(await apiClient.get(ROOT+'/console',options));
export const getMarketingProduction=async (creative,options)=>unwrapAdminResponse(await apiClient.get(ROOT+'/creatives/'+id(creative)+'/production',options));
export const getMarketingMeasurement=async (campaign,options)=>unwrapAdminResponse(await apiClient.get(ROOT+'/measurement/'+id(campaign),options));
export const getMarketingPreview=async (creative,variant,options)=>{
 const blob=await apiClient.get(ROOT+'/console/creatives/'+id(creative)+'/previews/'+id(variant),{...options,headers:{Accept:'image/jpeg'}});
 if(!(blob instanceof Blob)||blob.type.split(';')[0]!=='image/jpeg'||blob.size>8000000)throw Error('미리보기 이미지 형식을 확인하지 못했습니다.');
 return blob;
};
export async function marketingAction(path,body,method='POST',options={}){
 if(!/^\/(worker-credentials|campaigns|control|jobs|schedules|reconcile|creatives|links|measurement|publishing|console)(\/|$)/.test(path))throw Error('지원하지 않는 마케팅 작업입니다.');
 return unwrapAdminResponse(await apiClient.request(ROOT+path,{...options,body,method}));
}
