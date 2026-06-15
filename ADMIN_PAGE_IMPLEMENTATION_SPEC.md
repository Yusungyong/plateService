# 접시 내부 운영자 관리자 페이지 보완 설계서

작성일: 2026-06-15  
대상 프로젝트: `plateService`  
문서 상태: 프론트 MVP 실행 명세 / 서버 연동 계약 확정

## 구현 진행 현황

2026-06-15 기준:

- 완료: 사장님 화면 `/business/*` 경로 분리
- 완료: 기존 `/admin/restaurants*` 경로 호환 리다이렉트
- 완료: 내부 운영자 `AdminShell`, 사이드바, 상단 검색 및 프로필 영역
- 완료: 관리자·비즈니스 진입 맥락을 구분하는 독립형 로그인 화면
- 완료: 역할 및 세부 권한 기반 메뉴/라우트/액션 제어
- 완료: mock 기반 관리자 대시보드
- 완료: 매장 승인 목록, 검색/필터, 상세 drawer
- 완료: 승인, 보류, 반려 mock action과 사유 입력
- 완료: 서버 확정 사양 별도 문서 `SERVER_ADMIN_REQUIREMENTS.md`
- 진행 예정: 내부 운영자 매장 관리
- 진행 예정: 피드 관리
- 진행 예정: 제철 큐레이션

## 1. 문서 목적

이 문서는 기존 관리자 페이지 요청서를 현재 프로젝트 구조와 실제 구현 가능 범위에 맞게 보완한 실행 명세다.

이번 1차 작업의 목표는 **내부 운영자가 사용하는 관리자 프론트엔드 MVP를 mock data 기반으로 구현하는 것**이다. 서버 API, DB 마이그레이션, 실제 데이터 저장, 서버 권한 로직 변경은 이번 범위에서 제외한다.

화면은 실제 API로 교체할 수 있는 구조로 설계하되, mock 환경에서 다음 핵심 업무 흐름을 시연할 수 있어야 한다.

- 서비스 현황 확인
- 신규 매장 신청 검토와 승인/보류/반려
- 승인된 매장 조회와 운영 상태 확인
- 피드 콘텐츠 검수와 추천 처리
- 제철 식재료, 메뉴, 매장 큐레이션 편성

### 서버 연동 확정 계약

실제 API 연동은 `SERVER_ADMIN_REQUIREMENTS.md`를 단일 기준으로 사용한다.

- API 응답은 `success`, `data`, `message`, `errorCode`, `requestId`, `timestamp` 형식을 사용한다.
- JWT의 `sub`와 `username`은 현재 서버 호환을 위해 로그인 `username`으로 동일하게 유지한다.
- 관리자 진입에는 `ADMIN_ACCESS`, 각 화면과 액션에는 세부 권한이 추가로 필요하다.
- `SUPER_ADMIN`만 세부 권한 검사를 우회할 수 있다.
- 승인 신청 식별자는 `applicationId`, 승인 후 생성된 운영 매장 식별자는 `storeId`로 구분한다.
- 승인, 반려는 종결 상태이며 승인 시 운영 매장은 `draft`로 자동 생성된다.
- 문서 URL은 상세 응답에 포함하지 않고 60초 접근 URL을 별도 발급받는다.
- 상태 변경 요청에는 상세 응답의 `version`을 포함하며 409 충돌 시 상세를 다시 조회한다.

## 2. 현재 프로젝트 기준 판단

현재 프로젝트에는 다음 기반이 이미 존재한다.

- React 19
- React Router 6
- JavaScript 기반 Create React App
- 공통 인증 컨텍스트
- 보호 라우트
- 공통 API client
- 매장 등록, 목록, 상세, 수정, 삭제 화면
- 파일 업로드 API wrapper
- 관리자 여부 판정
- 테스트 및 운영 빌드 환경

따라서 새로운 애플리케이션을 만들지 않고 기존 프로젝트 안에 내부 운영자 영역을 확장한다.

다만 현재 `/admin/restaurants`는 사장님 관점의 "내 가게 관리" 기능으로 사용되고 있으므로, 내부 운영자 매장 관리와 경로 및 레이아웃을 분리해야 한다.

## 3. 사용자 영역 분리

서비스 내 관리 화면은 다음 세 영역으로 구분한다.

| 영역 | 사용자 | 목적 |
|---|---|---|
| 고객지원 | 일반 사용자 및 운영자 | FAQ, Q&A, 의견, 정책 확인 |
| 비즈니스 관리 | 사장님 | 본인의 매장, 메뉴, 사진 관리 |
| 내부 운영자 관리 | 접시 운영팀 | 매장 승인, 콘텐츠 검수, 큐레이션, 통계 운영 |

### 권장 경로

```txt
/                         기존 공개/고객지원 영역
/business                 사장님 관리 영역
/business/stores
/business/stores/new
/business/stores/:storeId

/admin                    내부 운영자 영역
/admin/dashboard
/admin/store-approvals
/admin/stores
/admin/stores/:storeId
/admin/feeds
/admin/seasonal-curations
/admin/reports
/admin/banners
/admin/notices
/admin/settings
```

현재 사장님용 경로는 즉시 제거하지 않고 새 `/business/*` 경로로 이전한 뒤 일정 기간 리다이렉트를 제공한다.

```txt
/admin/restaurant-registration -> /business/stores/new
/admin/restaurants             -> /business/stores
/admin/restaurants/:id         -> /business/stores/:id
```

## 4. 정보 구조

### MVP 1차 메뉴

1. 대시보드
2. 승인 관리
3. 매장 관리
4. 피드 관리
5. 제철 큐레이션

### MVP 2차 메뉴

6. 통계 / 리포트
7. 배너 / 공지
8. 설정

사이드바에서는 제철 큐레이션을 일반 하위 메뉴가 아니라 핵심 운영 메뉴로 강조한다.

## 5. 공통 관리자 레이아웃

내부 운영자 화면에는 기존 `AppShell`과 별도의 `AdminShell`을 사용한다.

### 구성

- 좌측 고정 사이드바
- 접시 관리자 로고 및 서비스명
- 메뉴별 아이콘과 한국어 라벨
- 상단 전역 검색
- 알림 버튼
- 로그인한 운영자 이름과 역할
- 페이지 제목과 설명
- breadcrumb
- 본문 콘텐츠 영역

### 화면 기준

- desktop-first
- 권장 최소 너비: 1280px
- 1024px 이하에서는 사이드바 축소
- 모바일에서는 핵심 조회와 승인 업무만 가능하도록 단순화
- 테이블은 가로 스크롤 또는 카드형 전환 허용

### 디자인 토큰 초안

```txt
primary:       #D96532
primary-soft:  #FFF0E8
background:    #F7F5F2
surface:       #FFFFFF
border:        #E8E2DC
text:          #24211F
text-muted:    #746E69
success:       #2F855A
warning:       #C47A16
danger:        #C2413A
```

## 6. 공통 UI 컴포넌트

MVP에서는 다음 컴포넌트를 공통으로 구성한다.

```txt
AdminShell
AdminSidebar
AdminTopbar
PageHeader
Breadcrumb
KpiCard
StatusBadge
FilterBar
SearchField
DataTable
Pagination
DetailDrawer
ConfirmDialog
ReasonDialog
EmptyState
ErrorState
LoadingSkeleton
PermissionGuard
```

페이지마다 테이블, 상태 배지, 버튼 스타일을 새로 만들지 않는다.

## 7. 화면별 구현 범위

### 7.1 대시보드

#### MVP 제공 항목

- 신규 매장 신청 수
- 승인 대기 수
- 이번 주 활성 매장 수
- 사용자 제보 수
- 오늘 등록된 제철 메뉴 수
- 지역별 게시물 수
- 주간 활성 추이
- 지역별 게시물 막대그래프
- 최근 운영 활동
- 승인 대기 화면 바로가기

지도 시각화는 MVP에서 제외하고 지역별 막대그래프로 대체한다.

#### 통계 용어 정의

- 활성 매장: 선택 기간에 매장 정보 수정, 메뉴 등록 또는 콘텐츠 발행 이력이 한 번 이상 있는 매장
- 사용자 제보: 일반 사용자가 신규 매장 또는 정보 수정을 제안한 건
- 콘텐츠 반응: 좋아요, 댓글, 저장의 합계
- 지역별 게시물 수: 연결 매장의 행정 지역을 기준으로 집계한 게시물 수

mock 단계와 실제 운영 지표 모두 `SERVER_ADMIN_REQUIREMENTS.md`의 Asia/Seoul 집계 기준을 사용한다.

### 7.2 매장 승인 관리

#### 목록

- 지역, 업종, 상태, 인증 여부, 신청일, 검색어 필터
- 서버 페이지네이션을 가정한 페이지 UI
- 행 선택
- 상태 배지
- 우측 상세 drawer

#### 상세

- 신청 매장 정보
- 대표자 및 사업자 정보
- 대표 메뉴
- 제출 서류 목록
- 현재 심사 상태
- 신청 및 최근 처리 일시

#### 액션

- 승인
- 보류
- 반려
- 상세 화면 이동

보류와 반려는 사유 입력 전 실행할 수 없다. 승인, 보류, 반려 후에는 mock 상태를 즉시 갱신하고 성공 메시지를 표시한다.

반려 사유는 코드와 설명을 모두 입력한다. 보류와 반려 설명은 공백 제외 10자 이상 1000자 이하로 검증한다.

실제 API에서 409가 반환되면 현재 drawer의 입력값을 유지하고 최신 상세를 다시 조회한 뒤 "다른 운영자가 먼저 처리했습니다" 안내를 표시한다.

일괄 승인은 오처리 위험이 있으므로 MVP에서 제외한다. 체크박스는 추후 일괄 담당자 배정이나 내보내기를 위한 구조만 준비한다.

### 7.3 매장 관리

내부 운영자용 매장 목록은 기존 사장님용 목록 컴포넌트를 그대로 사용하지 않는다. API 변환 로직과 미디어 컴포넌트는 재사용할 수 있다.

#### 목록

- 지역
- 업종
- 운영 상태
- 사장님 인증 상태
- 제철 메뉴 등록 여부
- 활성도
- 매장명과 주소 검색
- 페이지네이션

#### 상세 탭

1. 기본 정보
2. 운영 관리
3. 메뉴 / 사진
4. 소식 / 공지
5. 데이터

MVP에서는 각 탭의 조회 화면과 mock 수정 흐름을 제공한다. 실제 파일 저장, 지도 좌표 수정, 서버 데이터 변경은 하지 않는다.

삭제는 MVP 주요 액션으로 제공하지 않는다. 운영자 화면에서는 `폐점`, `확인 필요`, `숨김` 같은 상태 변경을 우선한다.

### 7.4 피드 관리

#### 목록

- 전체
- 사장님 작성
- 유저 작성
- 신고됨
- 숨김
- 추천 노출 중

카드에는 작성자, 연결 매장, 본문 일부, 썸네일, 반응 수, 신고 수, 상태를 표시한다.

#### 액션

- 승인
- 숨김
- 복구
- 추천
- 추천 해제
- 신고 검토

콘텐츠를 물리적으로 삭제하는 기능은 MVP에서 제외한다. 숨김과 복구를 사용하고 모든 변경은 mock 활동 이력에 남긴다.

### 7.5 제철 큐레이션

#### MVP 제공 항목

- 월 선택
- 지역 선택
- 제철 식재료 카드
- 피크 여부와 제철 점수
- 식재료별 연결 매장 및 메뉴
- 연결하기
- 연결 해제
- 노출 여부 변경
- 우선순위 숫자 변경
- 제철 배지 상태 변경
- 캠페인 배너 미리보기

드래그 앤 드롭과 실제 이미지 업로드는 MVP 2차로 미룬다. MVP 1차에서는 위/아래 이동 버튼 또는 순서 숫자 변경으로 대체한다.

## 8. 권한 구조

### 역할

```txt
SUPER_ADMIN
ADMIN
OPERATOR
CONTENT_MANAGER
VIEWER
```

### 확정 권한

```txt
ADMIN_ACCESS
DASHBOARD_READ
STORE_READ
STORE_APPROVE
STORE_UPDATE
FEED_READ
FEED_MODERATE
FEED_FEATURE
SEASONAL_READ
SEASONAL_MANAGE
REPORT_READ
BANNER_MANAGE
NOTICE_MANAGE
SUPPORT_MANAGE
ADMIN_ACCOUNT_MANAGE
SETTING_MANAGE
AUDIT_LOG_READ
```

### 처리 원칙

- 관리자 영역 진입은 `ADMIN_ACCESS`로 결정한다.
- 메뉴 노출과 조회는 각 read 권한으로 결정한다.
- 변경 버튼은 `PermissionGuard`로 제어한다.
- `VIEWER`는 조회 기능만 사용할 수 있다.
- `ADMIN_ACCESS`만으로 조회 또는 변경 버튼을 노출하지 않는다.
- `SUPER_ADMIN`만 모든 세부 권한을 가진 것으로 처리할 수 있다.
- 프론트 권한 제어는 UX 보조 수단이며 실제 보안은 서버에서 다시 검증해야 한다.
- 권한이 없는 액션은 숨기거나 disabled 처리하되 일관된 정책을 사용한다.

## 9. 프론트 데이터 모델

현재 프로젝트가 JavaScript 기반이므로 MVP 1차는 JavaScript와 JSDoc type을 사용한다. TypeScript 전환은 별도 작업으로 분리한다.

핵심 모델은 다음 단위로 관리한다.

```txt
AdminUser
Store
StoreApproval
StoreDocument
StoreMenu
FeedPost
FeedReport
SeasonalIngredient
SeasonalCuration
AdminBanner
AdminNotice
AdminActivity
DashboardMetric
PagedResponse
```

상태값은 화면 내부 문자열로 흩어놓지 않고 도메인별 상수와 라벨 맵으로 관리한다.

```js
export const STORE_APPROVAL_STATUS = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
  ON_HOLD: "on_hold",
};
```

## 10. Mock API 구조

페이지가 mock 배열을 직접 import하지 않도록 실제 API와 같은 비동기 함수 인터페이스를 제공한다.

```txt
src/admin/api/adminDashboardApi.js
src/admin/api/storeApprovalApi.js
src/admin/api/adminStoreApi.js
src/admin/api/feedModerationApi.js
src/admin/api/seasonalCurationApi.js
```

예시 함수:

```js
getDashboardSummary(params)
getStoreApprovals(params)
getStoreApprovalDetail(applicationId)
approveStore(applicationId, { version, comment })
holdStore(applicationId, { version, reason })
rejectStore(applicationId, { version, reasonCode, reason })
getStoreDocumentAccessUrl(applicationId, documentId, purpose)
getAdminStores(params)
getAdminStoreDetail(storeId)
hideFeedPost(postId, reason)
restoreFeedPost(postId)
featureFeedPost(postId, placement)
connectSeasonalMenu(params)
disconnectSeasonalMenu(curationId)
updateSeasonalOrder(curationId, displayOrder)
```

mock action은 `Promise`를 반환하고 200~500ms의 지연을 적용한다. 성공, 빈 결과, 오류 상태를 개발자가 재현할 수 있어야 한다.

새로고침 후 데이터 유지는 MVP 완료 조건에 포함하지 않는다. 필요할 경우 개발 편의를 위해 `sessionStorage` 기반 persistence를 선택적으로 추가할 수 있다.

## 11. 확정 서버 API 계약

### 대시보드

```http
GET /api/admin/dashboard/summary
GET /api/admin/dashboard/activity-trends
GET /api/admin/dashboard/region-distribution
GET /api/admin/activities
```

### 매장 승인

```http
GET   /api/admin/store-approvals
GET   /api/admin/store-approvals/{applicationId}
POST  /api/admin/store-approvals/{applicationId}/approve
POST  /api/admin/store-approvals/{applicationId}/hold
POST  /api/admin/store-approvals/{applicationId}/reject
POST  /api/admin/store-approvals/{applicationId}/documents/{documentId}/access-url
```

### 매장 관리

```http
GET   /api/admin/stores
GET   /api/admin/stores/{storeId}
PATCH /api/admin/stores/{storeId}/operation-status
PATCH /api/admin/stores/{storeId}/verification-status
PATCH /api/admin/stores/{storeId}
```

### 피드 관리

```http
GET  /api/admin/feeds
GET  /api/admin/feeds/{postId}
POST /api/admin/feeds/{postId}/hide
POST /api/admin/feeds/{postId}/restore
POST /api/admin/feeds/{postId}/feature
POST /api/admin/feeds/{postId}/unfeature
```

### 제철 큐레이션

```http
GET    /api/admin/seasonal-ingredients
GET    /api/admin/seasonal-curations
POST   /api/admin/seasonal-curations
PATCH  /api/admin/seasonal-curations/{curationId}
DELETE /api/admin/seasonal-curations/{curationId}
PATCH  /api/admin/seasonal-curations/{curationId}/order
```

모든 변경 API에는 운영자 식별 정보와 변경 이력을 서버에 기록하는 감사 로그가 필요하다.

### 사장님 매장 관리

신규 연동은 다음 경로를 사용한다.

```http
GET    /api/owner/stores
GET    /api/owner/stores/{storeId}
POST   /api/owner/stores
PUT    /api/owner/stores/{storeId}
POST   /api/owner/files
```

기존 `/api/admin/restaurants`와 `/api/admin/files`는 2026-09-30까지만 호환하며 신규 코드에서는 사용하지 않는다.

## 12. 상태 처리 기준

모든 데이터 화면은 다음 상태를 제공한다.

- loading: skeleton 또는 로딩 행
- empty: 조건에 맞는 데이터가 없음을 안내
- error: 재시도 버튼과 오류 메시지
- success: 변경 결과 toast 또는 inline message
- permission denied: 권한 부족 안내
- conflict: 입력을 유지하고 최신 상세를 재조회한 뒤 충돌 안내

필터 변경 시 기존 데이터가 갑자기 사라지는 느낌을 줄이기 위해 로딩 중에도 이전 결과를 유지하고 로딩 표시를 겹쳐 보여주는 방식을 우선 고려한다.

## 13. MVP 구현 순서

### 1단계: 기반 정리

- 운영자와 사장님 영역 경로 분리
- `AdminShell`과 운영자 route 추가
- 디자인 토큰과 공통 상태 배지 추가
- 권한 상수와 `PermissionGuard` 추가
- mock API 공통 지연 및 오류 유틸리티 추가

### 2단계: 핵심 업무 세로 단위

- 매장 승인 목록
- 상세 drawer
- 반려 사유 dialog
- 승인, 보류, 반려 mock action
- 관련 테스트

### 3단계: 대시보드

- KPI
- 간단한 CSS/SVG 차트
- 최근 활동
- 승인 관리 바로가기

### 4단계: 매장 관리

- 운영자용 목록
- 상세 탭
- 상태 변경 mock action

### 5단계: 피드 관리

- 콘텐츠 카드
- 신고 및 숨김 필터
- 숨김, 복구, 추천 action

### 6단계: 제철 큐레이션

- 월과 지역 필터
- 식재료 카드
- 매장 및 메뉴 연결
- 노출과 순서 관리

### 7단계: 품질 검증

- 접근 권한 테스트
- loading, empty, error 테스트
- 주요 action 테스트
- 1280px 및 1440px 레이아웃 확인
- 운영 빌드 확인

## 14. 예상 파일 구조

```txt
src/
  admin/
    api/
      adminDashboardApi.js
      adminStoreApi.js
      feedModerationApi.js
      mockApiUtils.js
      seasonalCurationApi.js
      storeApprovalApi.js
    components/
      AdminShell.js
      AdminSidebar.js
      AdminTopbar.js
      DataTable.js
      DetailDrawer.js
      FilterBar.js
      KpiCard.js
      PermissionGuard.js
      ReasonDialog.js
      StatusBadge.js
    constants/
      adminPermissions.js
      adminStatuses.js
    mocks/
      activities.js
      dashboard.js
      feeds.js
      seasonalCurations.js
      storeApprovals.js
      stores.js
    pages/
      AdminDashboard.js
      AdminFeeds.js
      AdminStoreApprovals.js
      AdminStoreDetail.js
      AdminStores.js
      SeasonalCurations.js
    styles/
      admin.css
  business/
    pages/
      기존 사장님용 페이지
```

기존 `src/api/client.js`, 인증 컨텍스트, 파일 업로드 컴포넌트는 필요한 범위에서 재사용한다.

## 15. MVP 1차 완료 기준

다음 조건을 모두 충족하면 프론트엔드 MVP 1차 완료로 본다.

- 내부 운영자 전용 레이아웃과 route가 존재한다.
- 사장님용 관리 화면과 내부 운영자 화면이 구분된다.
- 대시보드, 승인 관리, 매장 관리, 피드 관리, 제철 큐레이션에 접근할 수 있다.
- 모든 화면이 mock API를 통해 데이터를 조회한다.
- 승인, 보류, 반려, 숨김, 복구, 추천, 큐레이션 연결 흐름이 동작한다.
- 반려와 숨김처럼 사유가 필요한 액션은 사유 입력을 강제한다.
- 역할과 권한에 따라 메뉴 및 액션이 달라진다.
- loading, empty, error 상태를 확인할 수 있다.
- 검색, 필터, 페이지네이션 UI가 존재한다.
- 핵심 사용자 흐름에 대한 테스트가 추가된다.
- `npm test -- --watchAll=false`와 `npm run build`가 통과한다.

실제 서버 저장, 실제 통계 집계, 파일 영구 저장, 감사 로그 저장은 MVP 1차 완료 기준에 포함하지 않는다.

## 16. MVP 2차 범위

- 통계 및 리포트
- CSV 다운로드
- 배너와 공지 관리
- 관리자 계정 및 역할 관리
- 필터 저장과 고도화
- 드래그 앤 드롭 노출 순서
- 실제 차트 라이브러리 도입
- 서버 API 연동
- 접근성 및 키보드 탐색 고도화

## 17. 일정 추정

1인 프론트엔드 개발자 기준의 대략적인 추정이다.

| 작업 | 예상 기간 |
|---|---:|
| 기반 구조와 관리자 레이아웃 | 3~5일 |
| 매장 승인 관리 | 4~6일 |
| 대시보드 | 3~5일 |
| 매장 관리 | 5~7일 |
| 피드 관리 | 4~6일 |
| 제철 큐레이션 | 5~7일 |
| 테스트와 마감 | 3~5일 |
| 합계 | 약 4~6주 |

디자인 수정 반복, 요구사항 변경, 실제 API 연동은 위 기간에 포함하지 않는다.

## 18. 주요 리스크와 대응

### 기존 `/admin` 경로 충돌

사장님 영역을 `/business`로 분리하고 기존 URL에는 리다이렉트를 둔다.

### 서버 데이터 모델 연동

MVP에서는 mock type을 독립적으로 유지하되 실제 API adapter는 `SERVER_ADMIN_REQUIREMENTS.md`의 확정 DTO와 상태 전이를 따른다.

### 상태값 불일치

기존 `draft/review/published`와 신규 승인 및 운영 상태를 억지로 합치지 않고 서로 다른 도메인 상태로 관리한다.

### 전역 CSS 비대화

현재 `App.css`에 관리자 스타일을 계속 추가하지 않고 `src/admin/styles/admin.css`로 분리한다.

### JavaScript와 TypeScript 혼합

MVP에서는 JavaScript를 유지한다. TypeScript 도입은 프로젝트 전체의 빌드 설정과 마이그레이션 전략을 정한 뒤 진행한다.

### 운영 액션 오처리

승인, 반려, 숨김 같은 주요 변경 전 확인 dialog를 사용하고 반려 및 숨김 사유를 남긴다. 실제 서버 연동 시 감사 로그를 필수로 한다.

## 19. 최종 승인 제안

현재 프로젝트에서 본 문서의 MVP 1차 범위는 현실적으로 구현 가능하다.

구현 승인은 다음 조건을 전제로 한다.

1. 이번 결과물은 mock 기반 내부 운영자 프론트엔드다.
2. 사장님용 화면과 내부 운영자 화면을 분리한다.
3. 통계, 배너, 공지, 고급 권한 관리는 MVP 2차로 둔다.
4. 지도, 드래그 앤 드롭, AI 추천은 1차 범위에서 제외한다.
5. 실제 운영 전 `SERVER_ADMIN_REQUIREMENTS.md`의 API, DB 모델, 권한, 감사 로그를 구현한다.

이 조건을 유지하면 시각적 완성도와 핵심 운영 흐름을 모두 갖춘 MVP를 과도한 재작업 없이 단계적으로 구현할 수 있다.
