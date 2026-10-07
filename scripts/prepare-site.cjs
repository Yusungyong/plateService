const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname,'..'), build = path.join(root,'build');
const base = fs.readFileSync(path.join(build,'index.html'),'utf8');
const routes = {
 '/faq':['자주 묻는 질문 | 접시','접시 이용, 식당 입점, 계정과 문의에 관한 도움말입니다.'],
 '/qna':['공개 질문·답변 | 접시','공개된 질문과 운영팀 답변을 확인하세요.'],
 '/qna/private':['비공개 1:1 문의 | 접시','계정과 서비스 이용에 관한 문의를 비공개로 접수하세요.'],
 '/business':['식당 비즈니스 | 접시','로그인 후 식당 입점 신청과 매장 관리를 시작하세요.'],
 '/signup':['회원가입 | 접시','접시 서비스 계정을 만드세요.'],
 '/login':['로그인 | 접시','내 문의와 식당 입점 신청 현황을 확인하세요.']
};
const mapping = {};
for(const [uri,[title,description]] of Object.entries(routes)) {
 const url = 'https://plate-service.com'+uri;
 let html = base.replace(/<title>.*?<\/title>/,`<title>${title}</title>`)
  .replace(/(<meta\s+name="description"\s+content=")[^"]*/,`$1${description}`)
  .replace(/(<meta property="og:title" content=")[^"]*/,`$1${title}`)
  .replace(/(<meta property="og:description" content=")[^"]*/,`$1${description}`)
  .replace(/(<meta property="og:url" content=")[^"]*/,`$1${url}`)
  .replace('</head>',`<link rel="canonical" href="${url}"></head>`);
 const target = path.join(build,uri,'index.html');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,html);mapping[uri]=uri+'/index.html';
}
fs.writeFileSync(path.join(build,'index.html'),base.replace('</head>','<link rel="canonical" href="https://plate-service.com/"></head>'));
const file = path.join(root,'.legal-preview/cloudfront-viewer-request.js');
let fn=fs.readFileSync(file,'utf8').replace("result.uri = '/index.html'",`result.uri = (${JSON.stringify(mapping)})[normalized] || '/index.html'`);
fn=fn.replace('var result = routeLegal(event);',`var host = event.request.headers && event.request.headers.host;
  if (host && host.value === 'www.plate-service.com') {
    var query = event.request.querystring || {}, pairs = [];
    for (var key in query) {var values = query[key].multiValue || [query[key]]; for(var j=0;j<values.length;j++) pairs.push(key+'='+values[j].value);}
    return {statusCode:301,statusDescription:'Moved Permanently',headers:{location:{value:'https://plate-service.com'+event.request.uri+(pairs.length?'?'+pairs.join('&'):'')}}};
  }
  var result = routeLegal(event);`);
fs.writeFileSync(file,fn);
fs.mkdirSync(path.join(build,'deployment'),{recursive:true});
fs.writeFileSync(path.join(build,'deployment/cloudfront-viewer-request.js'),fn);
fs.copyFileSync(path.join(root,'deploy/response-headers-policy.json'),path.join(build,'deployment/response-headers-policy.json'));
console.log('Initial metadata and deployment artifacts generated. AWS application remains a separate operation.');
