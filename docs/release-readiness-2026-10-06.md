# 운영 홈페이지 점검 후속 작업

관련 이슈: [관리자 홈페이지 #13](https://github.com/Yusungyong/plateService/issues/13), [백엔드 #81](https://github.com/Yusungyong/plateAppServer/issues/81).

## 구현 내용

- 사용자 지시에 따라 개인정보 문서와 가입 동의 전환은 이번 운영 배포에서 제외한다. 기존 가입 화면/API를 유지한다. 동의 카탈로그 연동 준비 코드는 `codex/signup-consent-preparation` 브랜치의 `fc3d026`에 별도 보관했다.
- 제철 음식은 상세 재조회·초안 등록·이름/분류/상태 수정·관리자 월 기간 편집·삭제를 실제 서버에 연결한다. 기존 날짜·지역·출처 기간은 보존하며 편집 불가 이유를 표시한다. DB 허용 분류 9개에 맞춘다. 저장 URL과 미리보기 URL을 분리한다. 삭제 확인 후 서버 성공일 때만 목록에서 제거한다.
- 홈의 최신 KakaoTalk PNG 3개를 보존하고 400/800px WebP 파생본을 사용한다. 800px 3개 합계는 438,806바이트(원본 9,005,524바이트 대비 약 95% 감소). 작은 화면은 srcset으로 작은 파일을 선택한다.
- 고객용 준비 화면의 개발 용어를 없애고 문의 경로를 안내한다. 빈 FAQ에는 실제 문의 링크를 제공하며 운영 FAQ 데이터를 임의로 생성하지 않는다.
- 정적 약관 전문과 불변 다운로드 경로를 우선하는 CloudFront 전체 라우터, sitemap, 읽기 전용 배포 검사 스크립트를 추가한다.

## 미리보기·검증

```powershell
npm start
npm test -- --watchAll=false --runInBand
npm run test:legal
npm run build
npm run preview:legal:public
node scripts/legal/verify-deployment.cjs https://plate-service.com
```

React 개발 서버의 `/`, `/signup`, `/admin/seasonal-foods`에서 화면을 확인한다. 관리 API는 새 백엔드가 필요하다. 개발 API 설정은 `.env.development`를 확인한다. 문서 전용 미리보기는 출력된 로컬 주소를 사용한다. 마지막 검사는 운영에 쓰기 없이 실제 HTML/원문/모바일 패킷 해시·sitemap·404를 검사하며 아직 배포하지 않은 환경에서 실패하는 것이 정상이다.

## 배포 순서와 경로

1. 백엔드 V35 및 신규 API를 먼저 적용한다. 자세한 계약은 백엔드 `docs/api/admin-seasonal-food-crud.md`를 따른다.
2. `npm run build` 결과인 `build/`를 정적 origin에 업로드한다. 원문/초안 저장소 전체를 공개하지 않는다. HTML, JSON, XML, CSS, Markdown, WebP의 올바른 MIME을 설정한다.
3. `.legal-preview/cloudfront-viewer-request.js`는 법률 문서 우선 처리와 실제 프론트 경로의 SPA 처리를 포함하는 **전체 웹 라우터**다. 기존 viewer-request의 도메인 리디렉션·보안 동작이 있으면 보존해서 통합한다. API 전용 behavior에는 연결하지 않는다. 기존 부분 함수 `.legal-preview/cloudfront-function.js`도 계속 생성된다.
4. CloudFront의 모든 403/404를 `/index.html` 200으로 바꾸는 CustomErrorResponse를 제거하거나 정적 파일 오류에 적용되지 않도록 구성한다. 정적 문서/이미지 경로는 SPA rewrite보다 먼저 반환한다. S3 origin과 웹 배포 behavior의 실제 접근 권한도 확인한다.
5. 현재 문서 URL, `/legal/*`, `/sitemap.xml`, `/robots.txt`, `/index.html`과 기존 잘못 캐시된 응답을 무효화한다. 버전 고정 파일의 기존 콘텐츠·해시는 변경하지 않는다.
6. 읽기 전용 배포 검사와 실제 모바일 브라우저/앱 확인 후 적용 완료로 기록한다. 이 코드 작업은 운영 배포를 수행하지 않았다.

최종 URL은 `/`, `/terms-of-service`, `/privacy-policy`, `/admin/seasonal-foods`를 유지한다. 위치약관 경로는 `/location-terms`로 준비돼 있지만 **게시되지 않아 404**다. 문서 버전과 이전 버전은 기존 `content/legal/catalog.json` 및 고정 원문/해시 체계를 유지한다. 새 정책을 현재 문서에 덮어쓰지 않았다.

## 남은 운영 결정

- 가입 카탈로그는 비활성 상태를 유지한다. 이번 배포에서 가입 화면을 바꾸지 않으므로 신규 가입을 추가로 차단하지 않는다. 개인정보 문서와 가입 동의 활성화는 사용자 후속 요청 때 진행한다.
- 현재 공개 처리방침은 정정 안내다. 주소 공개 범위, 외부 계약·국외 이전, 일부 보관기간 등 운영 사실은 사용자 확인이 필요하다. 확인 주석과 준비본을 삭제하거나 임의로 공개하지 않았다.
- 만 15세 및 탈퇴·복구 등 정책의 사용자 적용은 실제 앱·백엔드 배포/인수 상태와 문서 게시 시점을 맞춰야 한다. 이번 작업에서 미구현 정책을 시행 중이라고 게시하지 않았다.
- App Store/Google Play 공식 URL은 아직 없다. 사용자가 추후 제공하기로 했으므로 설치 안내를 유지한다.
- 새 음식 삭제는 기존 연결 자료를 보호한다. 복잡한 날짜·지역·출처 기간을 편집하는 별도 편집기는 이번 월 단위 화면에 포함하지 않는다.
- 운영 PostgreSQL/CloudFront/모바일 앱 검증은 로컬 테스트 통과와 별개의 배포 인수 단계다.
