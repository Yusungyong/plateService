# 접시 내부 운영자 관리자 서버 확정 사양

작성일: 2026-06-15  
최종 갱신일: 2026-06-15  
대상: 접시 백엔드, 데이터, 관리자 프론트엔드 담당자  
문서 상태: P0 서버 배포 및 프론트 연동 반영

## 1. 문서 목적

이 문서는 내부 운영자 관리자 프론트엔드를 실제 서버와 연결하기 위한 API, 데이터 모델, 권한, 감사 로그의 구현 기준을 확정한다.

별도 변경 승인 없이 P0 구현은 이 문서를 따른다. 법률 검토나 외부 사업자 인증 업체 계약으로 변경이 필요한 값은 설정으로 분리하되, 최초 구현은 이 문서의 기본값을 사용한다.

### 2026-06-15 연동 확인

- 서버 저장소의 관리자 대시보드, 매장 승인, JWT 권한 구현과 DTO를 확인했다.
- 배포 서버 `https://foodplayserver.shop`에서 P0 관리자 API가 미인증 요청에 `401`을 반환해 엔드포인트 배포를 확인했다.
- `http://localhost:3000` 기준 CORS preflight가 `200`이며 관리자 API의 `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `OPTIONS`를 허용한다.
- 프론트는 대시보드 4개 조회 API와 매장 승인 목록·상세·상태 변경·문서 접근 URL API를 실제 adapter로 연결했다.
- 프론트 자동화 테스트는 외부 서버 의존성을 제거하기 위해 test 환경에서 mock adapter를 사용한다.
- 관리자 모바일 카드 목록, 축약 필터, 전체 화면 상세 UI는 기존 API 계약을 그대로 사용하며 서버 추가 작업은 필요하지 않다.
- 관리자 테스트 계정 정보가 없어 인증 후 운영 데이터 조회와 실제 승인 변경 E2E는 이번 확인에서 실행하지 않았다.

## 2. 확정 결정 요약

| 항목 | 확정 결정 |
|---|---|
| API 응답 | 현재 서버의 `common.api.ApiResponse` 형식을 관리자 API 표준으로 사용 |
| JWT 식별자 | `sub`와 `username`은 현재와 같이 로그인 `username`으로 동일하게 유지 |
| 운영자 actor | JWT 문자열을 직접 저장하지 않고 `sub`로 조회한 사용자의 불변 `user_id`를 저장 |
| 권한 검증 | `SUPER_ADMIN`을 제외하면 `ADMIN_ACCESS`와 API별 세부 권한을 모두 요구 |
| 사장님 API | 신규 API를 `/api/owner/stores`로 분리하고 본인 소유 매장만 허용 |
| 관리자 매장 API | `/api/admin/stores`로 별도 제공 |
| 승인 결과 | 승인 트랜잭션에서 운영 매장을 `draft` 상태로 자동 생성하고 신청과 연결 |
| 사업자 인증 | P0는 운영자 수동 검수, 외부 인증 연동은 후속 작업 |
| 반려 후 재신청 | 기존 신청은 불변으로 보존하고 새 신청을 생성하여 이전 신청과 연결 |
| 승인 되돌리기 | 승인/반려는 종결 상태이며 직접 되돌리기 API를 제공하지 않음 |
| 문서 URL | 상세 응답에 URL을 포함하지 않고 60초 만료 접근 URL 발급 API를 사용 |
| 동시 수정 | JPA `@Version` 또는 동등한 조건부 갱신을 사용하고 충돌 시 409 반환 |
| 알림 | 인앱 알림과 FCM 푸시를 발행하고 실패는 승인 트랜잭션을 롤백하지 않음 |
| 통계 기준 | Asia/Seoul 날짜를 기준으로 집계하고 원본 시각은 UTC 저장 |
| DB 배포 | Hibernate 자동 생성 없이 PostgreSQL 마이그레이션 SQL을 먼저 배포 |

## 3. 구현 우선순위

| 영역 | 프론트 상태 | 서버 상태 | 우선순위 |
|---|---|---|---|
| 관리자 인증/권한 | 서버 JWT 계약 반영 | 구현·배포 확인 | P0 완료 |
| 관리자 대시보드 | 실제 API adapter 연결 | 구현·배포 확인 | P0 완료 |
| 매장 승인 목록/상세 | 실제 API adapter 연결 | 구현·배포 확인 | P0 완료 |
| 승인/보류/반려 | 실제 API, 충돌 처리 연결 | 구현·배포 확인 | P0 완료 |
| 내부 운영자 매장 관리 | 화면 준비 중 | API 분리 필요 | P1 |
| 피드 검수 | 화면 준비 중 | API 및 상태 모델 필요 | P1 |
| 제철 큐레이션 | 화면 준비 중 | API 및 테이블 필요 | P1 |
| 통계/리포트 | 미구현 | 집계 테이블 검토 | P2 |
| 배너/공지 | 미구현 | API 및 테이블 필요 | P2 |

## 4. 공통 API 계약

### 4.1 성공 응답

현재 백엔드의 `com.plateapp.plate_main.common.api.ApiResponse`를 그대로 사용한다. 새로운 `data/meta` envelope는 추가하지 않는다.

```json
{
  "success": true,
  "data": {},
  "requestId": "request-id",
  "timestamp": "2026-06-15T01:42:00Z"
}
```

목록의 페이지 정보는 `data` 내부에 둔다.

```json
{
  "success": true,
  "data": {
    "content": [],
    "page": 0,
    "size": 20,
    "totalElements": 0,
    "totalPages": 0,
    "hasNext": false
  },
  "requestId": "request-id",
  "timestamp": "2026-06-15T01:42:00Z"
}
```

### 4.2 오류 응답

```json
{
  "success": false,
  "message": "매장 신청 정보를 찾을 수 없습니다.",
  "errorCode": "STORE_APPROVAL_NOT_FOUND",
  "requestId": "request-id",
  "timestamp": "2026-06-15T01:42:00Z"
}
```

검증 오류의 필드별 정보는 `data.fieldErrors`에 둔다.

```json
{
  "success": false,
  "data": {
    "fieldErrors": {
      "reason": "공백 제외 10자 이상 입력해야 합니다."
    }
  },
  "message": "요청 값이 올바르지 않습니다.",
  "errorCode": "COMMON_400",
  "requestId": "request-id",
  "timestamp": "2026-06-15T01:42:00Z"
}
```

### 4.3 날짜와 기간

- DB 시각은 UTC로 저장한다.
- API 시각은 ISO 8601 UTC 형식으로 반환한다.
- 프론트는 Asia/Seoul로 변환해 표시한다.
- `from`, `to`는 Asia/Seoul 기준 날짜이며 양 끝 날짜를 모두 포함한다.
- 서버 쿼리는 `[from 00:00:00 KST, to 다음 날 00:00:00 KST)` 범위로 변환한다.
- `from`이 `to`보다 늦으면 400을 반환한다.

### 4.4 페이지네이션과 정렬

- 페이지는 0부터 시작한다.
- 기본 크기는 20, 최대 크기는 100이다.
- 음수 `page` 또는 범위를 벗어난 `size`는 400을 반환한다.
- 요청한 페이지가 전체 페이지보다 크면 빈 `content`를 반환하며 페이지를 임의로 변경하지 않는다.
- 정렬은 API별 허용 필드만 받으며 기본값은 `appliedAt,desc`이다.
- 지원하지 않는 정렬 필드나 방향은 400을 반환한다.

## 5. 인증과 권한

### 5.1 역할

```txt
SUPER_ADMIN
ADMIN
OPERATOR
CONTENT_MANAGER
VIEWER
USER
```

- `ADMIN`은 기존 계정 호환을 위한 관리자 기본 역할이다.
- 신규 운영자 계정은 업무에 따라 `OPERATOR`, `CONTENT_MANAGER`, `VIEWER`를 사용한다.
- `SUPER_ADMIN`만 세부 권한 검사를 우회할 수 있다.

### 5.2 권한

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

기본 역할 프리셋:

| 역할 | 기본 권한 |
|---|---|
| `SUPER_ADMIN` | 전체 권한 |
| `ADMIN` | 전체 업무 권한, `ADMIN_ACCOUNT_MANAGE`와 `SETTING_MANAGE` 포함 |
| `OPERATOR` | `ADMIN_ACCESS`, `DASHBOARD_READ`, `STORE_READ`, `STORE_APPROVE`, `STORE_UPDATE`, `SUPPORT_MANAGE` |
| `CONTENT_MANAGER` | `ADMIN_ACCESS`, `DASHBOARD_READ`, `FEED_READ`, `FEED_MODERATE`, `FEED_FEATURE`, `SEASONAL_READ`, `SEASONAL_MANAGE` |
| `VIEWER` | `ADMIN_ACCESS`, `DASHBOARD_READ`, `STORE_READ`, `FEED_READ`, `SEASONAL_READ`, `REPORT_READ` |

역할 프리셋은 계정 생성 시 권한을 초기화하는 값이다. 실제 인가는 사용자에게 저장된 권한 목록을 기준으로 하며 추후 개별 조정할 수 있다.

### 5.3 권한 저장

기존 `fp_100.role`은 대표 역할로 유지하고 다음 테이블을 추가한다.

```txt
admin_user_permissions
- user_id
- permission
- granted_by
- granted_at
- revoked_at nullable
```

P0에서는 사용자별 권한 테이블을 사용한다. 역할-권한 관리 UI와 별도 `admin_roles` 테이블은 P2로 둔다.

### 5.4 JWT 계약

현재 서버 호환성을 위해 `sub`는 로그인 `username`을 유지한다.

```json
{
  "sub": "operator01",
  "username": "operator01",
  "displayName": "김운영",
  "roles": ["OPERATOR"],
  "permissions": [
    "ADMIN_ACCESS",
    "DASHBOARD_READ",
    "STORE_READ",
    "STORE_APPROVE",
    "STORE_UPDATE"
  ]
}
```

- 서버는 `sub`로 사용자를 다시 조회한다.
- 감사 로그의 `actor_user_id`는 조회한 `fp_100.user_id`를 사용한다.
- `displayName`, 역할, 권한은 로그인과 토큰 갱신 시 DB에서 다시 읽는다.
- P0에서 `fp_100.token_version integer not null default 0`을 추가한다.
- Access Token에 `tokenVersion` claim을 넣고 요청마다 DB 값과 비교한다.
- 역할 또는 권한이 변경되면 `token_version`을 증가시켜 기존 Access Token을 즉시 무효화한다.

### 5.5 인가 규칙

- 일반 관리자 API는 `ADMIN_ACCESS AND 세부 권한`을 요구한다.
- `SUPER_ADMIN`은 예외적으로 전체 API에 접근할 수 있다.
- `ADMIN_ACCESS`만으로 조회·변경 API를 호출할 수 없다.
- `VIEWER`가 변경 API를 호출하면 403을 반환한다.
- 프론트의 메뉴 및 버튼 숨김은 UX 보조 수단일 뿐 서버 검사를 대체하지 않는다.

## 6. 사장님과 내부 운영자 API 분리

### 6.1 신규 경로

사장님용:

```http
GET    /api/owner/stores
GET    /api/owner/stores/{storeId}
POST   /api/owner/stores
PUT    /api/owner/stores/{storeId}
POST   /api/owner/files

POST   /api/owner/store-applications
GET    /api/owner/store-applications/{applicationId}
PUT    /api/owner/store-applications/{applicationId}
POST   /api/owner/store-applications/{applicationId}/documents
```

내부 운영자용:

```http
GET    /api/admin/stores
GET    /api/admin/stores/{storeId}
PATCH  /api/admin/stores/{storeId}
PATCH  /api/admin/stores/{storeId}/operation-status
PATCH  /api/admin/stores/{storeId}/verification-status
```

### 6.2 소유권과 삭제 정책

- `store_owners(store_id, user_id, owner_role, created_at, revoked_at)` 관계를 추가한다.
- 사장님 API는 로그인 사용자가 활성 `store_owners` 관계를 가진 매장만 허용한다.
- 다른 사용자의 매장 ID를 요청하면 정보 노출을 줄이기 위해 404를 반환한다.
- 신청 API는 `applicant_user_id`가 로그인 사용자와 일치하는 신청만 허용한다.
- 사장님과 운영자 모두 매장을 물리 삭제하지 않는다.
- 폐점, 숨김, 운영 중지 등 상태 변경만 제공한다.
- S3 미디어도 매장 상태 변경과 동시에 삭제하지 않고 별도 보존 정책에 따라 정리한다.

### 6.3 기존 경로 호환

기존 `/api/admin/restaurants`와 `/api/admin/files`는 2026-09-30까지 유지한다.

- 기존 관리자 토큰 동작만 호환하며 이를 사장님 소유권 API로 간주하지 않는다.
- 응답 헤더에 `Deprecation: true`와 `Sunset: Wed, 30 Sep 2026 00:00:00 GMT`를 추가한다.
- 신규 프론트 개발은 기존 경로를 사용하지 않는다.
- 기존 `DELETE /api/admin/restaurants/{id}`는 즉시 deprecated 처리하고 신규 호출을 추가하지 않는다.

## 7. 관리자 대시보드

필요 권한은 모두 `DASHBOARD_READ`이다.

```http
GET /api/admin/dashboard/summary?from=2026-06-09&to=2026-06-15
GET /api/admin/dashboard/activity-trends?from=2026-06-09&to=2026-06-15&interval=day
GET /api/admin/dashboard/region-distribution?from=2026-06-09&to=2026-06-15
GET /api/admin/activities?page=0&size=20&sort=occurredAt,desc
```

필수 metric key:

```txt
newStoreApplications
pendingApprovals
activeStores
userReports
seasonalMenus
regionalPosts
```

집계 기준:

- `newStoreApplications`: 기간 내 `applied_at`이 있는 신청 수
- `pendingApprovals`: 종료일 23:59:59 KST 시점의 `pending` 수
- `activeStores`: 기간 내 매장 수정, 메뉴 등록, 연결 콘텐츠 발행 중 하나 이상이 발생한 고유 매장 수
- `userReports`: 기간 내 생성된 신고 수
- `seasonalMenus`: 기간 내 공개 상태가 된 제철 메뉴 연결 수
- `regionalPosts`: 기간 내 생성된 공개 또는 검수 대기 게시물 중 매장 지역을 확인할 수 있는 수
- 매장 연결이 없거나 지역을 확인할 수 없는 게시물은 `UNKNOWN`으로 별도 집계한다.
- 일별 마감 기준은 Asia/Seoul 00:00이며 원천 이벤트는 UTC로 저장한다.

## 8. 매장 승인 데이터 모델

### 8.1 테이블

```txt
store_applications
store_application_categories
store_application_menus
store_application_documents
store_application_reviews
admin_audit_logs
admin_outbox_events
```

`store_applications`:

```txt
id
parent_application_id nullable
store_id nullable
applicant_user_id
store_name
region_code
address
phone
email
owner_name
business_number_encrypted
business_number_hash
approval_status
verification_status
main_image_object_key nullable
description nullable
applied_at
updated_at
reviewed_at nullable
reviewed_by nullable
version
```

`store_application_categories`:

```txt
id
application_id
category_code
display_order
```

`store_application_menus`:

```txt
id
application_id
name
price nullable
description nullable
display_order
```

`store_application_documents`:

```txt
id
application_id
document_type
object_key
original_name
mime_type
file_size_bytes
verification_status
created_at
purge_at nullable
```

`store_application_reviews`:

```txt
id
application_id
previous_status
next_status
reason_code nullable
reason nullable
comment nullable
reviewed_by
reviewed_at
request_id
```

### 8.2 상태

승인 상태:

```txt
pending
on_hold
approved
rejected
```

사업자 인증 상태:

```txt
not_requested
reviewing
verified
rejected
```

상태 전이:

| 현재 | 가능한 다음 상태 |
|---|---|
| `pending` | `on_hold`, `approved`, `rejected` |
| `on_hold` | `pending`, `approved`, `rejected` |
| `approved` | 없음 |
| `rejected` | 없음 |

- `approved`와 `rejected`는 종결 상태다.
- 승인 취소 API는 제공하지 않는다.
- 오승인 시 생성된 매장의 운영 상태를 `suspended`로 변경하고 별도 감사 로그를 남긴다.
- 반려 후 재신청은 새 신청을 만들고 `parent_application_id`로 이전 신청을 연결한다.
- 승인 상태와 운영 매장의 노출·운영 상태는 별도 필드로 유지한다.

## 9. 매장 승인 조회 API

### 9.1 목록

```http
GET /api/admin/store-approvals
```

필요 권한: `STORE_READ`

query:

```txt
page
size
keyword
region
category
status
verificationStatus
appliedFrom
appliedTo
sort
```

검색 대상은 매장명, 대표자명, 연락처, 주소, 사업자등록번호다. 사업자등록번호 검색은 정규화한 값의 hash 비교를 사용하며 응답에는 마스킹된 값만 반환한다.

### 9.2 상세

```http
GET /api/admin/store-approvals/{applicationId}
```

필요 권한: `STORE_READ`

```json
{
  "id": "store-approval-101",
  "name": "오후의 식탁",
  "categories": [
    {
      "code": "KOREAN",
      "name": "한식"
    }
  ],
  "region": {
    "code": "SEOUL",
    "name": "서울"
  },
  "address": "서울 성동구 서울숲길 24",
  "phone": "02-555-1024",
  "email": "owner@example.com",
  "ownerName": "김서연",
  "businessNumber": "123-**-*****",
  "approvalStatus": "pending",
  "verificationStatus": "reviewing",
  "mainImageUrl": "https://cdn.example.com/store.jpg",
  "description": "매장 소개",
  "representativeMenus": [
    {
      "id": "menu-1",
      "name": "봄나물 솥밥"
    }
  ],
  "documents": [
    {
      "id": "document-1",
      "type": "business_registration",
      "name": "사업자등록증.pdf",
      "status": "submitted"
    }
  ],
  "appliedAt": "2026-06-15T00:42:00Z",
  "updatedAt": "2026-06-15T00:42:00Z",
  "reviewReason": null,
  "version": 3
}
```

상세 조회는 `STORE_APPROVAL_VIEWED` 감사 로그를 남긴다. 문서의 공개 URL이나 signed URL은 상세 응답에 포함하지 않는다.

### 9.3 문서 접근 URL

```http
POST /api/admin/store-approvals/{applicationId}/documents/{documentId}/access-url
Content-Type: application/json
```

```json
{
  "purpose": "preview"
}
```

`purpose`는 `preview` 또는 `download`다.

- 필요 권한은 `STORE_READ`이다.
- URL 만료 시간은 60초다.
- URL 발급 시 `STORE_DOCUMENT_ACCESS_URL_ISSUED` 로그를 남긴다.
- signed URL 방식에서는 실제 다운로드 완료를 서버가 보장해 알 수 없으므로 로그 명칭을 `DOWNLOADED`로 기록하지 않는다.
- 감사상 실제 다운로드 완료가 반드시 필요해지면 후속 단계에서 서버 프록시 다운로드를 도입한다.

## 10. 승인 상태 변경 API

### 10.1 승인

```http
POST /api/admin/store-approvals/{applicationId}/approve
```

필요 권한: `STORE_APPROVE`

```json
{
  "version": 3,
  "comment": "제출 서류 확인 완료"
}
```

승인 조건:

- 현재 상태가 `pending` 또는 `on_hold`
- `verification_status=verified`
- 필수 문서가 모두 제출되고 검수 완료
- 같은 사업자등록번호의 활성 매장이 중복되지 않음

처리:

1. 신청 상태를 `approved`로 변경한다.
2. 운영 `restaurants` 레코드를 `draft` 노출 상태로 자동 생성한다.
3. 신청의 카테고리, 메뉴, 기본 정보를 운영 매장에 복사한다.
4. `store_id`, 처리자, 처리 시각을 기록한다.
5. 리뷰와 감사 로그를 저장한다.
6. 알림 outbox 이벤트를 저장한다.

위 작업은 하나의 DB 트랜잭션으로 처리한다. 알림 전송 자체는 트랜잭션 커밋 후 비동기로 실행한다.

### 10.2 보류

```http
POST /api/admin/store-approvals/{applicationId}/hold
```

필요 권한: `STORE_APPROVE`

```json
{
  "version": 3,
  "reason": "영업신고증 원본 재제출이 필요합니다."
}
```

- `reason`은 공백 제외 10자 이상 1000자 이하로 필수다.
- 상태가 `pending`인 신청만 보류할 수 있다.

### 10.3 보류 해제

신청자가 `PUT /api/owner/store-applications/{applicationId}`로 서류와 정보를 보완하면 서버가 새 버전으로 갱신하고 상태를 `pending`으로 되돌린다. 운영자 프론트에는 임의 보류 해제 버튼을 제공하지 않는다.

### 10.4 반려

```http
POST /api/admin/store-approvals/{applicationId}/reject
```

필요 권한: `STORE_APPROVE`

```json
{
  "version": 3,
  "reasonCode": "BUSINESS_INFO_MISMATCH",
  "reason": "사업자 정보와 신청자 정보가 일치하지 않습니다."
}
```

- `reasonCode`와 `reason` 모두 필수다.
- `reason`은 공백 제외 10자 이상 1000자 이하로 검증한다.
- 초기 사유 코드는 `MISSING_DOCUMENT`, `INVALID_DOCUMENT`, `BUSINESS_INFO_MISMATCH`, `DUPLICATE_STORE`, `UNSUPPORTED_BUSINESS`, `OTHER`로 확정한다.

### 10.5 동시 수정과 오류 코드

`store_applications.version`은 JPA `@Version` 또는 동등한 조건부 갱신으로 관리한다.

| 상황 | HTTP | 오류 코드 |
|---|---:|---|
| 신청 없음 | 404 | `STORE_APPROVAL_NOT_FOUND` |
| 버전 충돌 | 409 | `STORE_APPROVAL_VERSION_CONFLICT` |
| 허용되지 않은 상태 전이 | 409 | `STORE_APPROVAL_INVALID_TRANSITION` |
| 필수 문서 미완료 | 409 | `STORE_APPROVAL_DOCUMENT_INCOMPLETE` |
| 사업자 인증 미완료 | 409 | `STORE_APPROVAL_VERIFICATION_INCOMPLETE` |
| 중복 매장 | 409 | `STORE_APPROVAL_DUPLICATE_STORE` |

프론트는 409를 받으면 상세를 다시 조회하고 사용자의 입력을 유지한 채 충돌 안내를 표시한다.

## 11. 감사 로그

필수 액션:

```txt
STORE_APPROVAL_VIEWED
STORE_DOCUMENT_ACCESS_URL_ISSUED
STORE_APPROVED
STORE_HELD
STORE_REJECTED
STORE_OPERATION_STATUS_CHANGED
FEED_HIDDEN
FEED_RESTORED
FEED_FEATURED
FEED_UNFEATURED
SEASONAL_CURATION_CREATED
SEASONAL_CURATION_UPDATED
SEASONAL_CURATION_DELETED
```

`admin_audit_logs`:

```txt
id
occurred_at
actor_user_id
actor_role
action
resource_type
resource_id
previous_value JSONB
next_value JSONB
reason_code nullable
reason nullable
ip_address
user_agent
request_id
```

- 변경 감사 로그는 업무 트랜잭션과 함께 저장한다.
- 단순 조회 로그 저장 실패는 조회를 실패시키지 않되 별도 오류 로그와 모니터링 알림을 남긴다.
- 문서 원문, signed URL, JWT, 계좌번호, 암호화 전 사업자등록번호는 저장하지 않는다.
- 감사 로그 조회에는 `AUDIT_LOG_READ`가 필요하며 기본적으로 `SUPER_ADMIN`과 `ADMIN`에만 부여한다.
- 감사 로그 보존 기간은 5년이다.

## 12. 문서와 개인정보 보존

구현 기본값:

- 반려된 신청의 원본 서류: 반려 후 90일 뒤 자동 삭제
- 승인된 신청의 원본 서류: 사장님-매장 관계 종료 후 1년 뒤 자동 삭제
- 신청 기본 정보, 리뷰, 상태 이력: 5년 보존
- 감사 로그: 5년 보존
- 통장 사본은 P0 수집 대상에서 제외
- 사업자등록번호는 암호화 저장하고 검색용 단방향 hash를 별도로 저장

삭제 작업은 매일 03:00 KST에 실행하고 결과를 운영 로그에 남긴다. 운영 전 개인정보 처리방침과 법률 검토에서 더 짧은 기간을 요구하면 설정값을 줄일 수 있으며, 코드 변경 없이 조정 가능해야 한다.

## 13. 알림

- 승인, 보류, 반려 시 인앱 알림을 생성한다.
- 활성 FCM 토큰이 있으면 푸시도 발송한다.
- 이메일은 P0 필수 채널에서 제외한다.
- 알림 이벤트는 `admin_outbox_events`에 저장한다.
- 승인 트랜잭션 커밋 후 비동기로 처리하며 발송 실패가 승인 결과를 롤백하지 않는다.
- 지수 백오프로 최대 5회 재시도하고 이후 실패 상태와 원인을 기록한다.

## 14. DB 마이그레이션과 배포

현재 운영 설정은 `spring.jpa.hibernate.ddl-auto=validate`이므로 엔티티 추가 전에 PostgreSQL DDL을 배포해야 한다.

배포 순서:

1. 신규 테이블과 인덱스를 추가한다.
2. 기존 관리자 계정의 역할과 기본 권한을 backfill한다.
3. 신규 서버 코드를 배포한다.
4. 권한별 API 통합 테스트를 실행한다.
5. 프론트 mock API를 실제 API adapter로 전환한다. 완료

P0에서 Flyway를 도입하고 마이그레이션을 `src/main/resources/db/migration`에 버전 순서로 관리한다. 마이그레이션은 운영 데이터 삭제를 포함하지 않으며 rollback은 별도 검증 SQL과 복구 절차 문서로 제공한다.

## 15. 프론트 연동 계약

현재 함수명은 유지하되 승인 대상 식별자는 모두 `applicationId`로 통일한다.

```js
getDashboardSummary(params)
getStoreApprovals(params)
getStoreApprovalDetail(applicationId)
approveStore(applicationId, { version, comment })
holdStore(applicationId, { version, reason })
rejectStore(applicationId, { version, reasonCode, reason })
getStoreDocumentAccessUrl(applicationId, documentId, purpose)
```

- adapter는 `response.data`를 화면 모델로 변환한다.
- `success=false` 또는 비-2xx 응답은 `errorCode`, `message`, `data.fieldErrors`를 사용한다.
- 401은 로그인 갱신, 403은 권한 부족, 409는 상세 재조회 흐름으로 처리한다.
- 시간은 프론트에서 Asia/Seoul로 표시한다.

## 16. 완료 기준

P0 서버 완료 조건:

- 역할과 사용자별 권한이 DB 및 JWT에 반영된다.
- `ADMIN_ACCESS`만으로 세부 API에 접근할 수 없다.
- 대시보드와 매장 승인 조회 API가 확정 응답 형식으로 동작한다.
- 승인, 보류, 반려가 상태 전이와 낙관적 잠금을 검증한다.
- 승인 시 운영 매장이 `draft`로 자동 생성된다.
- 감사 로그와 알림 outbox가 트랜잭션에 기록된다.
- 문서가 비공개 저장되고 60초 접근 URL만 발급된다.
- PostgreSQL 마이그레이션과 rollback 문서가 제공된다.
- `VIEWER` 변경 요청 403, 버전 충돌 409, 미인증 401 테스트가 존재한다.

프론트 적용 완료 항목:

- 대시보드 summary, activity trends, region distribution, activities 응답을 기존 화면 모델로 변환한다.
- 매장 승인 목록의 중첩 `categories`, `region` 값을 필터와 테이블 표시 모델로 변환한다.
- 승인, 보류, 반려 요청에 상세 응답의 `version`을 전달한다.
- 반려 요청에 서버 확정 `reasonCode`를 전달하고 사유 길이를 10~1000자로 제한한다.
- 409 응답 시 최신 상세와 목록을 다시 조회하고 입력 중인 다이얼로그를 유지한다.
- 승인·반려 종결 상태에서는 추가 상태 변경 액션을 노출하지 않는다.
- 문서 확인 시 60초 접근 URL을 발급받아 새 창에서 연다.
- `SUPER_ADMIN` 외에는 `ADMIN_ACCESS`와 세부 권한을 모두 만족할 때만 메뉴와 액션을 노출한다.

## 17. 변경 이력

### 2026-06-15

- 요청 문서를 P0 구현 확정 사양으로 전환
- 기존 서버 호환 API 응답 형식과 JWT `sub` 정책 확정
- `ADMIN_ACCESS AND 세부 권한` 인가 원칙 확정
- 사장님 `/api/owner/stores`와 운영자 `/api/admin/stores` 분리 확정
- 승인 시 `draft` 운영 매장 자동 생성 결정
- 수동 사업자 검수, 종결 상태, 재신청, 보존 기간 결정
- 문서 접근 URL 발급 방식과 60초 만료 확정
- 감사 로그, outbox 알림, 통계 마감 기준 확정
- 배포된 P0 관리자 API와 CORS 존재 확인
- 프론트 실제 API adapter, 권한, 409 충돌, 문서 접근 URL 연동 완료
