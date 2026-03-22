# Plate Service Project Structure

이 문서는 현재 프런트엔드 구조를 빠르게 파악하고, 다음 작업자가 안전하게 수정할 수 있도록 남기는 루트 문서다.

## 1. 현재 프로젝트 성격

- 작은 규모의 React 기반 고객지원/정책 페이지 프로젝트
- `create-react-app` 기반
- 정적 페이지 중심 구조
- 현재 개발 서버 실행 가능
- 구조 정리는 2026-03-22 기준 1차 완료

## 2. 실행 방법

```bash
npm install
npm start
```

검증 명령:

```bash
npm test -- --watchAll=false
npm run build
```

## 3. 핵심 디렉터리 구조

```text
src/
  App.js                      # 라우터 진입점
  App.css                     # 전역 앱 스타일
  components/
    AppShell.js               # 공통 헤더/네비게이션 셸
    PageLayout.js             # 공통 페이지 레이아웃
  config/
    routes.js                 # 메뉴/라우트 단일 정의 지점
  pages/
    StaticInfoPage.js         # 단순 안내 페이지용 공통 템플릿
    FAQ.js
    QnA.js
    Feedback.js
    ContentVerification.js
    TermsOfService.js
    PrivacyPolicy.js
```

## 4. 파일별 역할

### `src/App.js`

- 앱 진입점
- `BrowserRouter` 설정
- `/` 접근 시 `/faq`로 리다이렉트
- 실제 라우트 등록은 `appRoutes` 배열을 순회해서 처리

### `src/config/routes.js`

- 메뉴 순서와 라우트 정의를 같이 관리하는 파일
- 새 고객지원 페이지를 추가할 때 가장 먼저 수정해야 하는 곳
- 현재 구조에서 가장 중요한 파일

작업 규칙:

1. 새 페이지 컴포넌트를 `src/pages`에 만든다.
2. `routes.js`에 import를 추가한다.
3. `navigationItems`에 메뉴를 추가한다.
4. `appRoutes`에 라우트를 추가한다.

### `src/components/AppShell.js`

- 공통 상단 헤더
- 공통 네비게이션
- 페이지 본문을 감싸는 레이아웃 셸

주의:

- 활성 메뉴는 별도 state가 아니라 `NavLink`의 현재 경로 기준으로 결정된다.
- 이전 구조의 `activeTab` 방식은 제거했다.

### `src/components/PageLayout.js`

- 페이지 제목, 설명, 본문 영역의 공통 레이아웃
- 정적 문서/안내형 페이지는 이 컴포넌트를 우선 사용하면 된다

### `src/pages/StaticInfoPage.js`

- FAQ, QnA, Feedback, ContentVerification 같이 비슷한 구조의 안내 페이지를 공통 처리
- `title`, `description`, `notices`만 넘기면 기본 페이지를 만들 수 있다

## 5. 현재 페이지 상태

### FAQ / QnA / Feedback / ContentVerification

- 아직 실제 데이터 연결 없음
- 현재는 구조 안내용 정적 문구만 표시
- 추후 목록형 UI나 폼 UI로 교체 가능

### TermsOfService

- 임시 안내 문구 상태
- 정식 약관이 들어오면 조항별 섹션 구조로 교체 권장

### PrivacyPolicy

- 읽기 쉬운 구조의 초안으로 재정리됨
- 실제 법률 검토본은 아님
- 운영 전 최종 문구와 시행일 확정 필요

## 6. 이번 구조정리에서 바뀐 점

- `App.js`에 몰려 있던 라우팅/네비게이션/스타일 책임 분리
- 메뉴 정의를 단일 파일로 통합
- 공통 레이아웃 컴포넌트 도입
- 반복되는 정적 페이지 패턴 공통화
- 인라인 스타일 제거 후 CSS 중심으로 정리
- 기본 CRA 테스트를 현재 구조 기준 테스트로 교체
- 테스트 실행에 필요한 Testing Library 패키지 명시 추가
- `react-router-dom`을 CRA 테스트 환경과 안정적으로 맞는 `6.28.1`로 조정

## 7. 다음 작업자가 바로 보면 좋은 포인트

### 새 페이지 추가

- `src/pages`에 페이지 생성
- 공통형이면 `StaticInfoPage`
- 문서형이면 `PageLayout`
- 그리고 `src/config/routes.js` 수정

### 메뉴 이름 변경

- `src/config/routes.js`만 수정하면 된다

### 공통 헤더/브랜딩 수정

- `src/components/AppShell.js`
- `src/App.css`

### 전반 스타일 수정

- `src/App.css` 중심으로 수정
- 지금은 전역 앱 스타일이 한 파일에 모여 있다

## 8. 현재 알려진 주의사항

### 1. 콘솔 경고

- 테스트 시 React Router future flag 경고가 출력될 수 있다
- 기능상 오류는 아니지만 추후 라우터 업그레이드 때 정리 필요

### 2. CRA 기반 한계

- `react-scripts` 기반이라 최신 생태계 기준으로는 다소 오래된 편
- 이후 프로젝트가 커지면 Vite 전환을 검토할 가치가 있다

### 3. Browserslist 경고

- `caniuse-lite` 데이터가 오래됐다는 경고가 있다
- 필요하면 추후 업데이트

## 9. 권장 작업 순서

1. 실제 들어갈 페이지 콘텐츠 확정
2. 정적 페이지를 데이터 구조 기반으로 바꿀지 결정
3. 폼이 필요한 페이지는 제출 상태/유효성 구조 설계
4. 정책 문서는 최종 원문 확보 후 반영
5. 프로젝트가 커지면 `components`, `pages`, `styles` 세분화 검토

## 10. 빠른 요약

- 지금 구조는 "작은 고객지원 사이트" 기준으로는 충분히 정리된 상태다.
- 다음 작업은 `routes.js`를 중심으로 페이지를 추가하거나 내용을 실제 데이터로 바꾸면 된다.
- 공통 구조를 이미 만들어 둬서, 같은 패턴의 페이지를 늘리는 비용은 낮다.
