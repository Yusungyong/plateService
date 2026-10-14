import {ADMIN_PERMISSIONS,userCanViewApiRegistry,userHasAdminPermission} from '../constants/adminPermissions';

export function marketingSessionFile(user,accessToken,now=Date.now()){
 if(!userCanViewApiRegistry(user)||!userHasAdminPermission(user,ADMIN_PERMISSIONS.SETTING_MANAGE))throw Error('su12ng 운영자와 설정 변경 권한이 필요해요.');
 if(typeof accessToken!=='string'||accessToken.length>8191||!/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken))throw Error('현재 로그인 세션을 확인하지 못했어요. 다시 로그인해 주세요.');
 let claims;
 try{const value=accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');claims=JSON.parse(atob(value.padEnd(Math.ceil(value.length/4)*4,'=')));}catch{throw Error('현재 로그인 세션을 확인하지 못했어요. 다시 로그인해 주세요.');}
 if(claims.sub!=='su12ng'||claims.typ!==undefined&&claims.typ!=='access')throw Error('현재 로그인 계정의 세션을 다시 확인해 주세요.');
 if(!Number.isSafeInteger(claims.exp)||claims.exp*1000<=now+600000)throw Error('로그인 만료까지 10분 미만이에요. 다시 로그인한 뒤 연결파일을 저장해 주세요.');
 return {filename:'plate-marketing-session.txt',text:accessToken+'\n',expiresAt:new Date(claims.exp*1000).toISOString()};
}

export function downloadMarketingSession(user,accessToken){
 const file=marketingSessionFile(user,accessToken),url=URL.createObjectURL(new Blob([file.text],{type:'text/plain;charset=utf-8'})),link=document.createElement('a');
 try{link.href=url;link.download=file.filename;link.style.display='none';document.body.appendChild(link);link.click();}
 finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 return {expiresAt:file.expiresAt};
}
