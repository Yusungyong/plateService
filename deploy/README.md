# 운영 배포 적용 안내 — 2026-10-07

관련: plateService #20, plateAppServer #92. AWS 변경은 사용자 요청에 따라 실행하지 않았다.

## CI 호환성

- Node.js 20.12 이상, `npm ci --include=dev`, `npm run build`를 사용한다.
- CRA를 Vite로 변경했지만 산출물 디렉터리는 `build/`로 유지했다. `react-scripts` 직접 실행이나 `public/index.html` 복사를 하는 기존 CI는 수정해야 한다.
- 공개 환경 변수 이름은 기존 `REACT_APP_*`를 유지한다. 비밀 값은 이 접두사로 설정하지 않는다.
- 정적 파일에 해시가 붙는다. HTML이 참조하는 이전 해시 파일은 캐시 전환 기간 동안 남겨 둔다.

## AWS에서 적용할 항목

1. `build/`의 사이트 파일을 게시한다. `build/deployment/`는 인프라 설정 참고 파일이며 공개 업로드 대상에서 제외한다.
2. `build/deployment/cloudfront-viewer-request.js`를 검토 후 viewer-request에 연결한다. 기존 SPA rewrite를 중복 연결하지 않는다. 정적 약관 전문과 원문을 먼저 처리하고, 존재하는 앱 경로만 SPA로 보낸다.
3. 모든 403/404를 index.html의 200으로 바꾸는 오류 응답 설정을 제거한다. 존재하지 않는 경로는 실제 404를 반환해야 한다.
4. S3 Content-Type을 확인한다: HTML `text/html`, JSON `application/json`, XML `application/xml`, Markdown `text/markdown`, PNG `image/png`, WebP `image/webp`.
5. 해시가 붙은 `static/` 파일만 `public,max-age=31536000,immutable`로 캐시한다. HTML·manifest·robots·sitemap은 `no-cache`로 재검증한다. CloudFront의 Minimum TTL은 0으로 설정한다. HTML에 장기 s-maxage를 적용하지 않는다.
6. `response-headers-policy.json`을 기존 정책과 병합한다. CSP는 report-only부터 검증한다. 실제 API·이미지 도메인과 기존 보안 정책을 확인한 후 강제 정책으로 전환한다.
7. 변경한 HTML·문서·manifest·sitemap·robots 경로를 무효화하고 `npm run verify:deployment -- https://plate-service.com`으로 검사한다. www는 루트 도메인으로 이동하고 query가 보존되는지 확인한다.

배포 전 `npm run test:legal`과 `npm run build` 순서로 실행한다. 법률 테스트는 로컬 생성물을 다시 만들기 때문에 마지막에 build를 실행해야 전체 사이트 라우팅 산출물이 완성된다.

## 약관 동의 기능의 별도 활성화

`REACT_APP_LEGAL_CONSENT_WEB`은 기본 비활성이다. 실제 정책 적용 승인, 서버 consent-catalog 활성화, 앱 적용 상태를 확인한 후에만 `true`로 빌드한다. 활성화 시 catalog의 버전·해시·필수 여부·연령을 표시하고 `/api/auth/signup/with-consent`로 전송한다. catalog 오류는 가입을 차단하고 재시도를 제공한다. 과거 가입자의 동의를 추정하거나 소급 기록하지 않는다.

## 매장 동시 수정

백엔드 #92를 먼저 배포한다. 상세 응답에 editToken이 있을 때만 프론트가 expectedUpdatedAt을 전송한다. 충돌 시 409로 거절하며 작성 내용은 유지한다. 구 서버/구 클라이언트에는 동시 수정 보호를 보장하지 않는다.
