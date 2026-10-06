# 약관 페이지 정비 및 게시 인계

작성일: 2026-09-15. **로컬 구현·검토용 준비 상태이며 운영 사이트 배포나 새 정책 시행을 완료한 기록이 아닙니다.**

## 이번 변경의 범위

이용약관·개인정보 처리방침의 미완성 카드 화면을 문서 페이지로 교체했다. 현재 공개 반영 후보는 이름·담당자·이메일·무료 서비스 범위·광고 목적 정정과 확인된 기능별 처리 범위 안내다. 법적 근거·기간·외부 계약 등이 남아 있어 이를 완성된 약관 전문이나 개인정보 처리방침의 최종 시행본으로 표시하지 않는다.

별도로 이용약관·처리방침·위치약관 **전문 준비본**을 만들었다. 원문의 확인 주석, 미확정 주소, 외부 계약, 보관기간, 30일 복구 및 연령 검증 관련 주석을 그대로 보존했다. 준비본은 공개 `src`/`public` 및 최종 `build`에 포함되지 않는다. 로그인으로 숨기는 방식이 아니라 공개 산출물에서 제외한다.

운영자·담당자는 유성용, 공식 이메일은 su12ng@gmail.com이다. 주소는 공개 요건 검토 전이므로 공개 정정 안내에 추가하지 않았다.

## 근거와 적용 상태

요청에 커밋 링크가 기입되지 않아 조회한 앱 `main`을 고정했다.

- 앱 기준: [plateApp2 e5befc6426cb5a1eb315369bbeae46d3adf5eefd](https://github.com/Yusungyong/plateApp2/tree/e5befc6426cb5a1eb315369bbeae46d3adf5eefd).
- 최신 정책: `docs/legal/operating-policy-2026-09-15.md`. 초안 경로는 `drafts/2026-09-14`지만 본문은 9월 15일 통합 정책을 반영한다. 원문 버전명을 임의로 변경하지 않았다.
- 백엔드 [이슈 #36](https://github.com/Yusungyong/plateAppServer/issues/36), [PR #37](https://github.com/Yusungyong/plateAppServer/pull/37): 조회 시 Draft, 미병합, head `9658f06292962ce332ec3f7284f17cbe454dc051`. PR 설명상 신규 정책·API 미활성·미배포. 기반 순수 로직만 있으며 DB/controller와 연결 전이다.
- PR이 마지막으로 확인했다고 밝힌 성공 배포는 `cdd1f30`. 이번에 운영 DB나 설치된 앱을 실측해 기능 완료를 판정한 것은 아니다.
- 앱 `src/screens/shared/LegalDocumentScreen.tsx`는 URL을 fetch한 후 HTML을 텍스트로 변환한다. 현재 소스의 문서 타입은 `terms | privacy`이며 위치약관 타입은 없다. 앱 설치본의 버전·환경변수는 미확인이다.
- 기존 plateService 화면 기준은 `629dc8aa1384f23d731eb137d87f112404266390`. 보관본은 그 소스의 본문을 옮긴 것이며 과거 동의·시행일을 증명하지 않는다.

원본 6개와 파일별 SHA-256·고정 URL은 `content/legal/review/source/`, `content/legal/review/provenance.json`에 보관했다. 확인 주석을 지우거나 미확정 항목을 추정하지 않았다. 준비본의 상대 문서 링크는 로컬에 보관한 자료 또는 해당 고정 GitHub 커밋으로 연결한다.

## 미리보기

```powershell
npm ci
npm run preview:legal
```

`http://127.0.0.1:4174`에서 정정 안내와 전문 준비본을 비교한다. 서버는 루프백 주소에만 바인딩하며 no-store/noindex 응답을 사용한다. 파일을 수정하면 서버를 재시작한다. 준비본 원문은 보존용이므로 실제 수정 제안은 새 버전의 별도 파일로 만든다.

| 용도 | 로컬 URL |
| --- | --- |
| 이용약관 정정 안내 | http://127.0.0.1:4174/terms-of-service |
| 처리방침 정정 안내 | http://127.0.0.1:4174/privacy-policy |
| 이용약관 전문 준비본 | http://127.0.0.1:4174/review/terms-of-service |
| 처리방침 전문 준비본 | http://127.0.0.1:4174/review/privacy-policy |
| 위치약관 전문 준비본 | http://127.0.0.1:4174/review/location-terms |

공개 반영 후보만 보려면 `npm run preview:legal:public` → `http://127.0.0.1:4173`. 이 서버에서는 `/review/*`와 미게시 위치약관이 404다. 웹 앱 내부 이동은 `npm start`로 확인한다. 개발 서버의 최초 HTML은 CRA 셸이며, 정적 최초 HTML 검증은 문서 전용 미리보기 또는 `npm run build` 산출물에서 한다.

## URL과 버전 관리

| 문서 | 최종 기준 URL | 현재 공개 반영 후보 |
| --- | --- | --- |
| 이용약관 | https://plate-service.com/terms-of-service | `2026-09-15-correction`, 시행일 미확정, 동의 대상 아님 |
| 개인정보 처리방침 | https://plate-service.com/privacy-policy | `2026-09-15-correction`, 시행일 미확정, 동의 대상 아님 |
| 위치기반서비스 이용약관 | https://plate-service.com/location-terms | 경로 예약만. 준비본 게시·공개 메뉴 연결 없음 |

- 이력: `/{문서 경로}/versions`.
- 버전 고정 URL: `/{문서 경로}/versions/{version}`.
- 앱용 불변 HTML: `/legal/documents/{documentId}/{version}.html`.
- 원문: `/legal/documents/{documentId}/{version}.md`.
- 문서 ID: `service-terms`, `privacy-notice`, `location-terms`.
- 표시용 목록: `/legal/manifest.json`. **백엔드 동의 API가 아니다.** `purpose=DOCUMENT_DISPLAY_ONLY`, 현재 자료는 모두 `consentEligible=false`다. 이를 가입 동의 수집·구버전 동의 이전의 근거로 사용하지 않는다.

`content/legal/catalog.json`이 현재 포인터와 버전·시행일·기록일·변경 요약·해시를 관리한다. `effectiveDate=null`은 UI에 ‘미확정’으로 표시하고 기록일을 시행일로 대체하지 않는다. `legacy-629dc8a`는 기존 미완성 화면의 보관 ID로서 정식 약관 버전이 아니다. 옛 이메일과 마케팅 문구는 해당 보관본에만 역사 자료로 남는다.

Markdown 원문은 `content/legal/public/{version}/`에 둔다. `content/legal/artifacts/{documentId}/{version}.html`에는 완성 HTML 바이트를 고정한다. 빌드는 원문 및 HTML의 SHA-256을 확인하며 고정 버전의 HTML을 다시 렌더링하지 않는다. 따라서 이후 렌더러 변경이나 이력 추가가 옛 HTML 해시를 바꾸지 않는다. 전송 압축 해제 후 UTF-8 HTML 원본 바이트가 manifest 해시의 입력이다. CSS는 별도 표시 자원이며 본문 HTML 해시에 포함되지 않는다.

새 버전은 기존 원문/HTML을 덮어쓰지 않고 새 파일·새 버전 ID로 추가한다. 최종 전문은 미확정 항목 검토와 적용 증거가 확보된 별도 원문으로 작성하고, 확정 시행일과 `releaseEvidence`를 지정한 `published` 버전으로 등록한다. 기존 `correction`/`snapshot`을 시행본으로 이름만 바꾸지 않는다. 미래 시행 문서는 시행 전 `currentVersion`으로 전환하지 않는다. 신규 버전의 HTML 생성·고정은 아래 스크립트를 사용한다.

```powershell
node scripts/legal/freeze.cjs service-terms 2026-10-01-v1
```

원문 해시도 사전 등록해야 하며 이미 HTML 해시가 있는 버전은 스크립트가 변경을 거절한다. 검토 중인 신규 버전을 아직 current로 연결하지 않은 상태에서 준비한다. **catalog에 올린 버전은 이력으로 공개 빌드에 포함**되므로 미게시 준비본은 catalog에 등록하지 않는다.

## 초기 HTML 및 배포

`npm run build`는 CRA 빌드 후 공개 문서 8개를 `build/{경로}/index.html`에 생성한다. 전문 준비본은 제외되며 공개 정정 안내의 모든 본문과 이력이 초기 HTML에 있다. 별도 React 실행·API 호출이 필요 없다. SPA 내부 이동도 같은 고정 HTML 본문을 사용한다. 앱의 현재 HTML→텍스트 방식으로 본문을 읽을 수 있으나 표 레이아웃·링크 클릭·이전 버전 이동은 앱 네이티브 화면에서 별도 개선이 필요하다. 브라우저의 ‘원문 열기’에서는 표·목차·링크를 그대로 사용할 수 있다.

2026-09-15 운영 URL의 읽기 전용 HTTP 확인에서는 AmazonS3/CloudFront, 773바이트 진입 HTML, `s-maxage=31536000` 응답을 확인했다. **파일만 업로드하면 기존 SPA rewrite 또는 캐시에 의해 다시 빈 셸이 제공될 수 있다.**

배포 담당자는 다음을 함께 적용해야 한다.

1. 전체 `build/`만 배포한다. `content/`, `scripts/`, `.legal-preview/`를 웹 공개 디렉터리에 복사하지 않는다.
2. 빌드가 생성한 `.legal-preview/cloudfront-function.js`의 문서 경로 처리를 기존 viewer-request 함수의 SPA fallback보다 먼저 통합한다. 기존 함수 전체를 덮어쓰지 않는다. `/terms-of-service`와 버전 URL을 각 `/index.html`로 매핑하고 미게시/없는 문서 버전은 404로 반환한다. S3 REST origin은 폴더의 index.html을 자동 선택하지 않는다.
3. `/legal/*` 정적 HTML·Markdown·CSS·manifest는 SPA fallback 대상에서 제외하고 없는 파일은 404로 유지한다. Content-Type을 HTML은 `text/html; charset=utf-8`, JSON은 `application/json`, CSS는 `text/css`로 설정한다.
4. 현재 URL·이력·manifest는 재검증 또는 짧은 캐시를 사용하고, 버전 고정 HTML·원문에는 불변 캐시를 적용한다. 현재 CloudFront의 기존 두 URL·관련 index.html·manifest 캐시를 무효화한다. 쿼리로 준비본을 전환하지 않는다.
5. 인증 없이 두 공개 URL 및 고정 HTML URL을 fetch해서 한글 본문, MIME, 해시, 이전 버전, 404, 모바일 표를 확인한다. 앱의 현재 `TERMS_OF_SERVICE_URL`/`PRIVACY_POLICY_URL`은 그대로 유지할 수 있다. 위치약관 연결은 앱의 문서 타입·화면 지원 및 백엔드 위치 기능 전환 후 별도 진행한다.

이 작업에서는 CloudFront 설정·운영 콘텐츠·앱·백엔드 코드를 변경하거나 배포하지 않았다.

## 게시 전 남은 항목

| 항목 | 상태와 공개 조건 |
| --- | --- |
| 운영자·공식 이메일·무료/광고 없는 범위 | 운영자 확정값. 이번 정정 안내에 우선 반영 |
| 주소 공개 범위 | 덕양구까지만 공개하는 안의 고지 요건 검토 전. 추정 주소 추가 금지 |
| 외부 처리 계약 | 계약 법인·국가·항목·기간·위탁/제공/국외 이전 구분, DB/백업/CloudFront 증빙 필요 |
| 30일 탈퇴·복구·푸시 | PR #37 미배포. 제한 인증·명시 취소·30일 경계·삭제/일반 푸시 중단 인수 및 앱 전환 후 게시 |
| 회원 만 15세 이상 | 일반·소셜·웹·구버전 검증, 기존 회원 처리 및 실제 시행일 확인 후 게시 |
| 위치약관 | 위치사업 적용/신고, 비회원·아동 동의/철회, OS 권한 구분, 원시 좌표 DB/로그/큐 제거, 외부 처리 확인 후 게시 |
| 문의 완료+90일 / 추천 최대 2년 | 처리 근거·필요성·기산점 및 본문/첨부/연결키 정리·배치 검증 전. 현재 기술 TTL과 혼동 금지 |
| 기타 보관·삭제 | 신고·동의 증거·보안 로그·백업·CDN의 기간/예외/최종 파기 확인 필요 |
| 공개 식별자·직접 미디어 | 이메일 노출 방지·publicId·원본/썸네일/CDN 접근 보장 범위 실기 확인 |
| 제재 통지·이의신청 | 운영 창구 외 실제 통지/검토 절차 확인 |
| 전문 시행·변경 안내 | 문서별 시행일, 기존 이용자 안내 및 필요한 동의, 앱·웹·백엔드 적용 시점 합의 |

정정 안내는 정식 전문의 모든 고지사항을 충족했다는 판정이 아니다. 준비본을 통째로 공개하지 않고 검토·배포 증거가 갖춰진 항목별로 새 버전을 작성한다. 원문 확인 주석의 해소 근거는 이 문서 또는 해당 변경 PR에 남긴다.

## 검증 명령

```powershell
npm run test:legal
$env:CI='true'; npm test -- --watchAll=false --runInBand
npm run build
```

문서 전용 테스트는 초기 HTML·원문 보존·해시·이전 버전·준비본 미노출·위험한 Markdown·HTTP 404·CloudFront 경로를 검증한다. 앱 설치본과 운영 CDN까지 검증한 것으로 해석하지 않는다.

2026-09-15 로컬 결과: 문서 전용 7개, React 11개 스위트·52개 테스트 통과. 프로덕션 빌드 성공. Chrome headless의 320px·390px·1280px에서 공개 처리방침과 3개 전문 준비본 총 12개 화면을 확인했고 페이지 가로 넘침 없음·표의 독립 스크롤·스크립트 없는 HTML을 검증했다. 준비본의 조항 수는 이용약관 10개, 처리방침 9개, 위치약관 6개다. 공개 빌드에서 준비본 버전명·주소 공개안·30일 복구 문구가 검색되지 않음을 확인했다. 기존 CRA/Browserslist 경고는 남지만 빌드는 성공했다.

주요 변경 파일:

- `content/legal/catalog.json`, `public/`, `artifacts/`: 공개 정정 안내·기존 화면 보관본·버전/해시.
- `content/legal/review/`: 고정 커밋 원문과 출처, 전문 준비본.
- `src/legal/LegalPage.js`, `legal.css`: 문서 화면·모바일/인쇄 스타일.
- `src/pages/TermsOfService.js`, `PrivacyPolicy.js`, `src/config/routes.js`, `src/App.js`: 기존 진입 URL 및 문서 이력 라우팅.
- `scripts/legal/`: 정적 HTML 생성, 미리보기, 새 버전 고정, 문서 검증.
- `src/legal/LegalPage.test.js`, `package.json`, `package-lock.json`, `.gitattributes`, `.gitignore`: 화면 테스트·빌드 연결·Markdown 도구·바이트 보존/산출물 제외.

## 2026-09-24 앱 문서 열람 보완

공개 HTML이 운영에서 SPA 초기 화면으로 반환되는 문제를 확인했다. 기존 불변 HTML·Markdown·시행 상태는 변경하지 않고, `manifest.json`에 `mobileUrl`/`mobileSha256`을 추가했다. 콘텐츠 해시를 경로에 넣은 `/legal/mobile/v1/{id}/{version}.{sha256}.json`은 공개 원문에서 생성한 네이티브 표시용 문단·목차·표·링크와 원문 문자열을 담는다. JSON 전체 SHA-256 및 원문 SHA-256을 앱에서 검사한다. 이 목록과 전송 파일은 `DOCUMENT_DISPLAY_ONLY`이며 동의 API/동의 원장이 아니다. 정정 안내는 계속 `consentEligible=false`다.

앱은 로그인 토큰 없이 문서를 읽고 실패 시 HTML이나 구 API로 우회하지 않는다. 웹의 공개 원문과 JSON을 별도 수작업으로 관리하지 않는다. 공개 빌드에 검토본을 넣지 않는 기존 검사를 유지한다. `export-review.cjs`는 앱 개발 빌드의 검토 자료를 명시적으로 생성할 때만 사용하며 공개 빌드에서는 실행하지 않는다.

```sh
node scripts/legal/export-review.cjs /path/to/plateAppNew/docs/legal/drafts/2026-09-14 > /path/to/plateAppNew/src/dev/legalReview.generated.json
```

현재 HTML 경로가 빈 SPA로 응답하는 CDN 설정 문제는 JSON 경로 추가만으로 해결되었다고 볼 수 없다. 위 초기 HTML 배포 절차에 따라 경로와 캐시를 별도로 정비해야 한다. 생성된 CloudFront 함수는 이제 없는 `/legal/*` 정적 파일도 404로 반환한다. 함수 파일 생성은 AWS 설정 적용과 다르다.
