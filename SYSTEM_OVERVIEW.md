# Plate Service 시스템 전역 요약

작성일: 2026-05-20  
분석 범위: `src/`, `public/`, 환경 파일, 기존 프로젝트 문서, 패키지 설정

## 1. 시스템 개요

Plate Service는 React 기반의 고객지원 및 운영자 관리 프론트엔드입니다. Create React App으로 구성되어 있으며, FAQ, Q&A, 서비스 의견, 콘텐츠 검증, 약관/개인정보 문서, 회원 모니터링 화면을 제공합니다.

현재 구조는 단일 React 애플리케이션 안에서 라우팅, 인증 상태, API 호출, 페이지 UI를 관리합니다. 백엔드 API 기본 주소는 개발 환경에서 `http://localhost:8090`, 운영 환경에서 `https://foodplayserver.shop`로 설정되어 있습니다.

## 2. 기술 스택

- 런타임/프레임워크: React 19, React DOM 19
- 라우팅: `react-router-dom` 6.28.1
- 빌드 도구: `react-scripts` 5.0.1, Create React App
- 테스트: Testing Library, Jest 계열 CRA 기본 구성
- HTTP 통신: 브라우저 `fetch`를 감싼 자체 API 클라이언트

## 3. 주요 디렉터리

```text
src/
  App.js                    애플리케이션 라우팅 진입점
  App.css                   전역 스타일
  api/                      API 클라이언트와 도메인별 요청 래퍼
  auth/                     인증 컨텍스트와 보호 라우트
  components/               공통 레이아웃 컴포넌트
  config/routes.js          메뉴와 라우트 정의
  pages/                    화면 단위 컴포넌트
public/                     CRA 정적 리소스
```

## 4. 라우팅 구조

`src/App.js`에서 `AuthProvider`, `BrowserRouter`, `AppShell`, `Routes`를 조립합니다.

- `/`는 `/faq`로 리다이렉트됩니다.
- `/login`은 로그인 화면입니다.
- `/terms-of-service`, `/privacy-policy`는 인증 없이 접근 가능한 정책 문서입니다.
- `/qna`는 인증 없이 접근 가능한 공개 문의 화면입니다.
- `/faq`, `/feedback`, `/content-verification`은 로그인 후 접근하도록 `ProtectedRoute`로 묶여 있습니다.
- `/admin/faq`, `/admin/qna`, `/admin/member-monitoring`은 관리자 권한이 필요합니다.

관리자 여부는 JWT 클레임의 `roles` 또는 `permissions` 값을 기준으로 판단합니다. 현재 프론트는 `ADMIN`, `SUPER_ADMIN` 역할 또는 `ADMIN_ACCESS` 권한을 관리자 접근 조건으로 사용합니다. 관리자가 `/faq`에 접근하면 `/admin/faq`로 이동합니다.

## 5. 인증 흐름

인증 상태는 `src/auth/AuthContext.js`가 담당합니다.

- 로그인 API 응답의 `accessToken`, `refreshToken`을 `localStorage`의 `plate-service.auth` 키에 저장합니다.
- 앱 시작 시 저장된 토큰을 읽고 JWT payload를 파싱해 사용자 정보를 복원합니다.
- API 클라이언트에 토큰 세션을 전달해 `Authorization: Bearer ...` 헤더를 붙입니다.
- 401 응답에서 특정 인증 오류 코드가 오면 `/api/auth/refresh`로 토큰 갱신을 시도합니다.
- refresh 실패 시 인증 상태를 비우고 `/login`으로 이동합니다.

## 6. API 레이어

모든 API 호출은 `src/api/client.js`의 `apiClient`를 통하도록 설계되어 있습니다.

공통 클라이언트 책임:

- `REACT_APP_API_BASE_URL` 기반 URL 생성
- query string 생성
- JSON 요청 body 직렬화
- 응답 content type별 파싱
- `ApiError`로 오류 정규화
- access token 헤더 주입
- refresh token 기반 재시도

도메인별 API 모듈:

- `authApi.js`: 로그인, 토큰 refresh
- `faqApi.js`: FAQ 목록/상세/생성/수정/삭제
- `qnaApi.js`: Q&A 목록/상세/생성/답변 수정
- `memberMonitoringApi.js`: 관리자 회원 모니터링 요약 및 목록 조회

## 7. 주요 화면별 상태

### 로그인

`src/pages/Login.js`는 아이디/비밀번호로 `/api/auth/login`을 호출합니다. 성공 시 인증 컨텍스트에 토큰을 저장하고, 원래 접근하려던 경로 또는 `/faq`로 이동합니다.

### FAQ

`src/pages/FAQ.js`는 일반 사용자 모드와 관리자 모드를 함께 처리합니다.

- 일반 모드: FAQ 목록과 상세 답변 조회
- 관리자 모드: FAQ 생성, 수정, 삭제
- 사용 API: `/api/faqs`, `/api/faqs/{faqId}`
- 목록은 현재 page 0, size 10 기준으로 조회합니다.

### Q&A

`src/pages/QnA.js`도 일반 모드와 관리자 모드를 함께 처리합니다.

- 일반 모드: 비로그인 사용자도 문의 작성 가능
- 관리자 모드: 문의 선택 후 답변, 상태, 공개 여부 수정
- Q&A 조회/작성은 `withAuth: false`로 호출합니다.
- API 장애 시 임시 fallback 데이터가 표시됩니다.

### 회원 모니터링

`src/pages/MemberMonitoring.js`는 관리자 전용 대시보드입니다.

- 요약 KPI
- 로그인 이상 징후
- 프로필/권한 변경 이력
- 위험 사용자 목록

초기 로딩 시 네 API를 `Promise.all`로 동시에 조회합니다.

### 서비스 의견 / 콘텐츠 검증

`Feedback.js`, `ContentVerification.js`는 현재 정적 목업 데이터 기반 화면입니다. API 연동 구조는 아직 없습니다.

### 약관 / 개인정보 처리방침

`TermsOfService.js`, `PrivacyPolicy.js`는 정적 정보 페이지입니다. 실제 법무/운영 최종 문구인지 여부는 별도 검증이 필요합니다.

## 8. 전역 UI 구조

`src/components/AppShell.js`가 헤더, 사용자 인증 영역, 공개 메뉴, 관리자 메뉴를 렌더링합니다. 실제 페이지 본문은 `main.app-main` 안에 들어갑니다.

`src/components/PageLayout.js`는 각 페이지의 제목, 설명, 본문 영역을 공통 형태로 감쌉니다. 전역 스타일은 대부분 `src/App.css`에 집중되어 있으며, 따뜻한 코랄/크림 계열 색상과 카드형 레이아웃을 사용합니다.

## 9. 환경 설정

- `.env.development`: `REACT_APP_API_BASE_URL=http://localhost:8090`
- `.env.production`: `REACT_APP_API_BASE_URL=https://foodplayserver.shop`

CRA 환경 변수 규칙상 `REACT_APP_` 접두사가 붙은 값만 클라이언트 번들에 주입됩니다.

## 10. 현재 확인된 리스크

1. 다수 파일의 한글 문자열이 깨져 있습니다. 메뉴, 버튼, 테스트 기대값, 기존 문서까지 영향이 있어 UI 표시와 테스트 안정성에 문제가 생길 수 있습니다.
2. 일부 페이지 파일에는 문자열 따옴표가 닫히지 않은 것처럼 보이는 구간이 있습니다. 이는 실제 빌드 실패로 이어질 가능성이 큽니다.
3. `node_modules`가 현재 워크스페이스에 없어 빌드와 테스트를 실행하지 못했습니다.
4. 서버가 토큰에 `roles` 또는 `permissions`를 내려주지 않으면 관리자 메뉴와 관리자 라우트가 열리지 않습니다. 서버 권한 응답 계약은 `SERVER_AUTH_CONTRACT.md`와 맞춰야 합니다.
5. `FAQ.js`에 생성 요청/응답 `console.log`가 남아 있습니다. 운영 빌드 전 제거하는 편이 좋습니다.
6. `Feedback`, `ContentVerification`은 아직 실제 API 연동이 없는 정적 목업 상태입니다.
7. 약관/개인정보 문서는 실제 운영 정책 문구로 확정되었는지 확인이 필요합니다.

## 11. 권장 개선 순서

1. 한글 인코딩 깨짐과 문자열 문법 오류를 먼저 복구합니다.
2. `npm install` 후 `npm test -- --watchAll=false`, `npm run build`로 현재 빌드 가능성을 확인합니다.
3. 화면별 실제 API 응답 스키마를 문서화하고 fallback/정적 목업 영역을 구분합니다.
4. FAQ, Q&A의 페이지네이션/검색/필터 조건을 UI와 API 양쪽에서 정리합니다.
5. 운영 전 `console.log`, 임시 문구, 법무성 문구를 정리합니다.
6. 권한명이 추가되면 프론트와 서버가 공유하는 권한 계약 문서를 함께 업데이트합니다.

## 12. 한 줄 요약

현재 Plate Service는 고객지원/운영자 관리를 위한 React 단일 페이지 앱의 뼈대와 핵심 API 레이어가 잡혀 있으며, FAQ/Q&A/회원 모니터링은 백엔드 연동 흐름이 들어가 있습니다. 다만 한글 인코딩 손상과 빌드 가능성 검증이 가장 먼저 해결해야 할 전역 리스크입니다.
