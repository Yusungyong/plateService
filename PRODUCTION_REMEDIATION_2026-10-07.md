# 운영 페이지 전역 개선 작업 기록

기준 점검: [PRODUCTION_DEEP_AUDIT_2026-10-07.md](PRODUCTION_DEEP_AUDIT_2026-10-07.md).
프론트 이슈: https://github.com/Yusungyong/plateService/issues/20
백엔드 이슈: https://github.com/Yusungyong/plateAppServer/issues/92
프론트 PR: https://github.com/Yusungyong/plateService/pull/21
백엔드 PR: https://github.com/Yusungyong/plateAppServer/pull/95

이 기록의 **구현**은 작업 브랜치와 로컬 검증을 의미한다. 운영 배포 완료를 뜻하지 않는다. AWS 설정과 미확정 정책은 이전 요청에 따라 실행/확정하지 않았다.

## 점검 항목별 조치

| 항목 | 조치 | 상태/남은 범위 |
|---|---|---|
| A01 계정 전환 후 저장 | 인증 응답과 파일 업로드 후 저장에 세션 동일성 검사 | 구현·회귀 검증 |
| A02 조회 실패 후 빈 저장 | 최초 상세 조회 성공 전 편집/저장 차단, 재시도 | 구현·회귀 검증 |
| A03 음수 가격 변환 | 입력을 숫자로 임의 정제하지 않고 정수 범위 검증, 오류 필드 이동 | 구현·회귀 검증 |
| A04 로그아웃 | 서버 토큰 폐기 요청과 즉시 로컬 종료, 서버 실패 안내 | 구현·합성 API 검증; 운영 세션 폐기 확인 별도 |
| A05 전문 HTML 불일치 | 전문 파일과 전용 CloudFront 라우터 산출물 준비 | 로컬 해시 검증; AWS 적용 필요 |
| A06 공통 deviceId | 브라우저 저장소의 지속 식별자, 탭 공유 | 구현; 실제 다중 기기 세션 검증 별도 |
| A07 권한 불일치 | FAQ_MANAGE, MEMBER_MONITORING_READ에 라우트/메뉴 통일 | 구현 |
| A08 작성 내용 유실 | 매장·Q&A·FAQ 이탈/항목 변경 확인, 저장 중 보호 | 구현·회귀 검증 |
| A09 검색 초기화 | 입점 검색 query 동기화 수정 | 구현·브라우저 검증 |
| A10 닫힌 상세 재등장 | 상세/목록 요청 세대 검사와 닫기 시 무효화 | 구현·브라우저 검증 |
| A11 처리 성공 후 재조회 실패 | 처리 완료와 조회 실패 구분, 중복 처리 유도 제거 | 구현 |
| A12 실패 시 사유 유실 | 처리 성공 시에만 사유 창 닫기, 중복 클릭 방지 | 구현·회귀 검증 |
| A13 장애를 0으로 표시 | 부분 성공 보존, 알 수 없는 값 —, 영역별 실패·재시도 | 구현·회귀 검증 |
| A14 기존 미디어 편집 | 삭제·저장 전 삭제 취소·위아래 순서 변경 | 구현; 실제 파일 삭제는 서버 저장 시 수행 |
| A15 업로드 검사 | 이미지 JPEG/PNG/WebP 10MB, 영상 MP4/WebM/MOV 50MB 사전 검사 | 구현; 보수적인 웹 제한이며 서버 검사를 대체하지 않음 |
| A16 동시 수정 덮어쓰기 | 서버 행 잠금·editToken·expectedUpdatedAt·409 충돌, 프론트 초안 보존 | 양쪽 구현; 서버 선배포 필요, 토큰 없는 구 클라이언트는 보호 제외 |
| A17 영어 오류/스택 노출 | 라우터 오류 화면과 목록 응답 형태 검사 | 구현·브라우저 검증 |
| A18 이동 후 스크롤 | 경로 이동 시 스크롤 복원과 본문 제목 포커스 | 구현 |
| A19 명도 대비 | 공통 버튼·본문·관리자 메뉴·선택 월 색상 보정 | 구현·자동 접근성 검사 |
| A20 모달 포커스 | 진입/가두기/Esc/닫기 후 복귀, 중첩 대화상자 처리 | 구현·브라우저 검증 |
| A21 제목/ARIA | 제목 단계, 잘못된 모바일 표 역할, 이미지 대체 안내 수정 | 구현·자동 접근성 검사 |
| A22 이미지 응답/용량 | 홈은 최적화 PNG 400/800px 사용, 원본 유지 | 구현; 최초 3개 400px 합계 약 344KB, 기존 원본 약 9MB |
| A23 sitemap/404 | 실제 XML과 한국어 404·미게시 문서 복구 화면 생성 | 로컬 검증; CloudFront 적용 필요 |
| A24 보안 헤더 | 응답 헤더 정책 파일, CSP report-only 준비 | AWS 적용/실제 도메인 확인 필요 |
| A25 HTML 장기 캐시 | 정적 해시 파일/HTML의 배포 캐시 정책 분리 문서화 | 기존 CI·AWS 정책 적용 필요 |
| A26 동의 버전 기록 | catalog 기반 문서·해시·결정·멱등키 전송 기능, 오류 시 가입 차단 | 기본 비활성; 정책·앱·서버 적용 시 함께 활성화 |
| A27 모바일 메뉴 과밀 | 공개 메뉴 기본 접힘, 이동 시 닫힘 | 구현 |
| A28 분류/링크 | 카테고리 줄바꿈·보조 링크 스타일 보정 | 구현 |
| A29 초기 메타/대표 도메인 | 주요 공개 경로별 초기 메타·canonical, www redirect 준비 | 생성물 검증; 실제 경로 제공은 CloudFront 적용 필요 |
| A30 초기 번들 | 페이지 lazy 분리, Vite 전환 | 초기 엔트리 약 344KB, 기존 약 907KB(압축 전); 총 다운로드/성능 동일 지표 아님 |
| A31 빈 도움말/테스트 게시물 | 공개 FAQ가 비어 있을 때 기본 도움말 4개 | 테스트 게시물은 실제 문의 여부 확인 후 운영자가 정리; 임의 삭제 안 함 |
| A32 의존성 | CRA 제거, Router/Babel/Jest/Markdown 도구 업데이트 | 런타임 audit 0; 개발 도구 19 moderate 영향 패키지 남음 |

## 검증

- Jest: **21개 묶음, 119개 테스트 통과**.
- 법률 원문/manifest/생성물: **11개 테스트 통과**.
- 백엔드: RestaurantAdminServiceTest 5개 + RestaurantAdminFileServiceTest 1개 통과. 실제 DB 동시 실행 검증은 미실행.
- Vite production build 성공. CloudFront 함수 8,863 bytes로 10KB 이내.
- 보호 화면 11개 × 모바일/데스크톱, 공개 경로 56개 조합을 로컬 빌드에서 합성 API로 점검. 데이터 쓰기는 합성 응답으로만 검증했다.
- 최종 56개 공개 조합과 22개 보호 화면 조합에서 검사한 axe 규칙 위반, 수평 넘침, JS 실행 오류 0건. 이는 수동 접근성 인증이나 모든 사용자 환경의 무결점 보장은 아니다. 별도로 비정상 API 응답 복구도 확인했다.
- 계정 전환, 음수 가격, 최초 조회 실패, 검색 유지, 늦은 상세 응답, Q&A/FAQ 초안 보존, 서버 로그아웃의 브라우저 회귀 시나리오 점검.
- `verify:deployment`로 로컬 전문 HTML/Markdown/앱 JSON 해시, sitemap, 404 확인.
- `npm audit --omit=dev`: 0. 전체 audit의 잔여 19 moderate는 미패치 sprintf-js를 포함한 테스트 도구 의존 관계 집계이며 19개 별도 운영 취약점이라는 뜻은 아니다. 현재 공개된 상위 패키지의 안전한 수정 경로가 없어 강제 다운그레이드하지 않았다.
- 운영 데이터 수정, 실제 회원가입·입점·승인·문의 제출, AWS 변경은 하지 않았다.

## 변경 파일과 미리보기

- 인증/API: `src/api/`, `src/auth/AuthContext.js`.
- 업무 화면: `src/admin/pages/`, `src/pages/RestaurantDetail.js`, `FAQ.js`, `QnA.js`, `MemberMonitoring.js` 등.
- UI 공통: `src/components/`, `src/styles/readiness.css`, `src/config/routes.js`, `src/App.js`.
- 빌드/이미지: `vite.config.mjs`, `index.html`, `package*.json`, `scripts/optimize-home.cjs`, `src/assets/home/`.
- 배포: `scripts/prepare-site.cjs`, `scripts/legal/generate.cjs`, `deploy/`.
- `npm ci --include=dev` 후 `npm start`: 기본 http://127.0.0.1:3001. 기존 PORT 환경변수는 유지한다.
- 운영 산출물 확인: `npm run build`, `npm run preview:legal:public` (출력 URL 사용). CloudFront 전체 라우팅은 생성 함수와 함께 별도 검증한다.
- 공개 URL은 기존 https://plate-service.com/ 및 하위 경로 유지. 위치약관 `/location-terms`는 미게시 상태를 유지한다.

## 배포 전 남은 항목

1. [deploy/README.md](deploy/README.md)의 CI Node 버전·명령·캐시·CloudFront·헤더 설정 적용. 사용자 요청에 따라 AWS 직접 작업은 보류했다.
2. 백엔드 #92 선배포 후 실제 두 편집 세션의 409 충돌 확인.
3. 미확정 개인정보 항목, 동의 catalog/웹 플래그 활성화, 앱 적용 시점은 별도 결정. 공개 전문에 준비 정책을 섞지 않았다.
4. 공개 테스트 게시물 운영자 검토, 실제 문의 회신 절차/시간, 스토어 링크 확정. 임의 약속/링크 생성 안 함.
5. 병합·CI 배포 후 운영 URL에서 전문 해시·로그인·파일 응답·보안 헤더를 다시 확인해야 한다. 로컬 통과만으로 운영 문제 해결을 선언하지 않는다.
