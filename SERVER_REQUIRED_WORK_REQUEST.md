# Plate Service 서버 작업 요청서

- 작성일: 2026-06-22
- 기준 문서: `FUNCTIONAL_REVIEW_REPORT.md`
- 목적: 프론트엔드만으로 완성할 수 없는 API, 권한, 인증, 인프라 작업을 서버 개발 범위로 분리한다.

## 1. 우선순위 요약

| 우선순위 | 작업 | 완료 기준 |
| --- | --- | --- |
| P0 | 인증 갱신 계약 확정 | 갱신 성공 시 access/refresh token을 일관된 DTO로 반환하고, 만료·폐기 오류 코드를 문서화한다. |
| P0 | CORS 허용 출처 구성 | 개발·검증·운영 프론트 출처의 preflight와 실제 요청이 정상 통과한다. |
| P0 | 관리자 세부 권한 발급 | JWT 또는 사용자 조회 응답에서 화면별 권한을 구분해 제공한다. |
| P1 | 서비스 의견 API | 의견 등록, 목록, 상태 변경, 통계 조회가 가능하다. |
| P1 | 콘텐츠 검증 API | 검수 목록, 담당자 배정, 승인·반려·수정 요청과 이력 조회가 가능하다. |
| P1 | 관리자 매장 운영 API | 승인 이후 매장의 운영 상태와 노출 상태를 관리할 수 있다. |
| P1 | 피드 검수 API | 신고 조회, 숨김·복구·추천 노출 처리와 감사 이력을 제공한다. |
| P1 | 시즌 큐레이션 API | 큐레이션 CRUD, 순서 변경, 게시 예약을 제공한다. |
| P1 | 통합 테스트 환경 | 역할별 테스트 계정과 쓰기 후 정리 가능한 검증 데이터를 제공한다. |

## 2. 인증 및 공통 계약

### 2.1 토큰 갱신

현재 프론트 호출:

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}
```

성공 응답은 다음 형태를 유지해 주세요.

```json
{
  "data": {
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

요구 사항:

- Refresh token rotation 여부와 이전 토큰 폐기 시점을 명시한다.
- 만료, 위조, 폐기, 계정 정지 상황을 구분하는 안정적인 `code`를 반환한다.
- 동시에 여러 API가 401을 받아도 동일 refresh token으로 한 번의 갱신 요청이 완료될 수 있도록 정책을 정한다.
- 갱신 실패는 HTTP 401과 `{ "code": "...", "message": "..." }` 형태로 반환한다.

### 2.2 공통 오류 및 목록 응답

오류 응답 권장 계약:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "요청한 항목을 찾을 수 없습니다.",
  "fieldErrors": []
}
```

목록 응답은 기존 관리자 승인 API와 맞춰 `content`, `page`, `size`, `totalElements`, `totalPages`, `hasNext`를 사용해 주세요. 쓰기 API에는 중복 처리 방지와 감사 로그를 적용하고, 충돌 시 HTTP 409를 반환해 주세요.

## 3. CORS 및 배포 환경

현재 운영 서버의 `http://localhost:3001` preflight가 403으로 확인되었습니다.

요구 사항:

- 허용 출처를 환경 변수로 관리한다.
- 최소 개발 출처 `http://localhost:3000`, `http://localhost:3001`과 실제 검증·운영 프론트 도메인을 등록한다.
- `Authorization`, `Content-Type` 헤더와 `GET, POST, PUT, PATCH, DELETE, OPTIONS` 메서드를 허용한다.
- 자격 증명 사용 여부를 프론트 방식(Bearer token)과 맞춰 명시한다.
- OPTIONS와 실제 인증 요청을 CI 또는 배포 후 smoke test로 검증한다.

## 4. 관리자 권한 분리

프론트에 정의되어 있으나 현재 화면 라우팅은 `SUPPORT_MANAGE`에 묶여 있습니다. 서버가 다음 권한을 JWT `permissions` 또는 사용자 권한 조회 응답으로 제공해 주세요.

- `ADMIN_ACCESS`
- `DASHBOARD_READ`
- `STORE_READ`, `STORE_APPROVE`
- `FEED_READ`, `FEED_MODERATE`
- `SEASONAL_READ`, `SEASONAL_MANAGE`
- `FAQ_MANAGE`
- `QNA_MANAGE`
- `MEMBER_MONITORING_READ`

각 API에서도 동일 권한을 서버 측에서 검증해야 하며, 부족한 권한은 HTTP 403으로 응답해야 합니다. 최고 관리자 역할에만 전체 권한을 암묵적으로 부여할지 여부도 계약에 포함해 주세요.

## 5. 신규 기능 API

아래 경로는 프론트 연동을 위한 제안입니다. 서버 명명 규칙에 맞춘 변경은 가능하지만 구현 전 최종 계약을 공유해 주세요.

### 5.1 서비스 의견

- `POST /api/feedback` — 로그인/비로그인 의견 접수
- `GET /api/admin/feedback` — 검색, 유형, 상태, 기간별 페이지 조회
- `GET /api/admin/feedback/summary` — 접수·처리·개선 후보 통계
- `PATCH /api/admin/feedback/{feedbackId}` — 상태, 담당자, 내부 메모 변경

필수 필드: `type`, `content`, `status`, `createdAt`. 비로그인 접수 시 연락처는 선택값으로 처리하고 개인정보 보관·파기 기준을 적용해 주세요.

### 5.2 콘텐츠 검증

- `GET /api/admin/content-verifications`
- `GET /api/admin/content-verifications/{verificationId}`
- `PATCH /api/admin/content-verifications/{verificationId}/assignee`
- `POST /api/admin/content-verifications/{verificationId}/approve`
- `POST /api/admin/content-verifications/{verificationId}/reject`
- `POST /api/admin/content-verifications/{verificationId}/request-changes`
- `GET /api/admin/content-verifications/{verificationId}/history`

필수 정보: 대상 종류/ID, 현재 상태, 요청자, 담당자, 검수 사유, 생성·수정 시간, 낙관적 잠금용 `version`.

### 5.3 승인 완료 매장 운영

소유자 API `/api/owner/stores`와 분리된 전체 관리자 API가 필요합니다.

- `GET /api/admin/stores`
- `GET /api/admin/stores/{storeId}`
- `PATCH /api/admin/stores/{storeId}/operation-status`
- `PATCH /api/admin/stores/{storeId}/visibility`
- `GET /api/admin/stores/{storeId}/history`

상태 변경에는 사유와 `version`을 필수로 받고, 소유자 데이터 변경과 관리자 강제 변경을 감사 로그에서 구분해 주세요.

### 5.4 피드 검수

- `GET /api/admin/feeds`
- `GET /api/admin/feeds/{feedId}`
- `GET /api/admin/feeds/{feedId}/reports`
- `POST /api/admin/feeds/{feedId}/hide`
- `POST /api/admin/feeds/{feedId}/restore`
- `PATCH /api/admin/feeds/{feedId}/recommendation`

처리 사유, 처리자, 처리 시간, 신고 건수, 현재 노출 상태를 반환하고 모든 변경 이력을 보존해 주세요.

### 5.5 시즌 큐레이션

- `GET /api/admin/seasonal-curations`
- `POST /api/admin/seasonal-curations`
- `GET /api/admin/seasonal-curations/{curationId}`
- `PUT /api/admin/seasonal-curations/{curationId}`
- `DELETE /api/admin/seasonal-curations/{curationId}`
- `PATCH /api/admin/seasonal-curations/order`
- `POST /api/admin/seasonal-curations/{curationId}/publish`

게시 상태는 최소 `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`를 지원하고, 게시 기간과 연결된 매장·메뉴 유효성을 서버에서 검증해 주세요.

### 5.6 매장 승인 상태 직접 변경

운영자가 신청을 재검토 대기 상태로 되돌리지 않고 승인과 반려 사이에서 직접 변경할 수 있어야 합니다.

```http
POST /api/admin/store-approvals/{applicationId}/approve
Content-Type: application/json

{
  "version": 4,
  "comment": ""
}
```

```http
POST /api/admin/store-approvals/{applicationId}/reject
Content-Type: application/json

{
  "version": 5,
  "reasonCode": "BUSINESS_INFO_MISMATCH",
  "reason": "신청 정보와 실제 운영 정보가 일치하지 않습니다."
}
```

- 필요 권한은 최소 `STORE_APPROVE`입니다.
- `pending`, `on_hold`, `rejected` 상태에서 `approve`를 허용하고 성공 시 `approved`로 변경합니다.
- `pending`, `on_hold`, `approved` 상태에서 `reject`를 허용하고 성공 시 `rejected`로 변경합니다. 반려 사유 코드와 상세 사유는 필수입니다.
- `rejected → approved`, `approved → rejected` 전환은 중간 `pending` 상태를 거치지 않습니다.
- 사업자 인증 상태는 입점 신청 시 별도 API로 이미 검증된 값이므로 승인 상태 변경과 함께 임의로 변경하지 않습니다.
- 기존 승인·반려 이력을 덮어쓰거나 삭제하지 않고 처리자, 이전 상태, 다음 상태, 사유, 처리 시각을 감사 이력에 추가합니다.
- `approved → rejected`에서는 연결된 운영 매장과 `store_owners`를 hard delete하지 않습니다. 운영 매장을 비활성화하고 소유권 상태를 하나의 트랜잭션에서 조정해야 합니다.
- `rejected → approved`에서는 기존 운영 매장이 있으면 중복 생성하지 않고 재활성화하며, 없을 때만 새로 생성합니다.
- 버전 충돌은 `409 STORE_APPROVAL_VERSION_CONFLICT`, 안전하게 전환할 수 없는 상태는 `409 STORE_APPROVAL_INVALID_TRANSITION`으로 반환합니다.
- 성공 후 `GET /api/admin/store-approvals/{applicationId}`에서 갱신된 `approvalStatus`, `version`, 최신 처리 이력을 조회할 수 있어야 합니다.

## 6. 통합 검증 지원

서버 완료 후 다음 자료가 필요합니다.

- 역할별 테스트 계정: 최고 관리자, 승인 담당자, 콘텐츠 담당자, 조회 전용, 사업자, 일반 회원
- 테스트 환경 API base URL과 CORS 허용 프론트 URL
- 데이터 생성 및 정리 방법
- OpenAPI 문서 또는 요청/응답 예시
- 인증 만료, 권한 부족, 낙관적 잠금 충돌을 재현하는 방법

## 7. 서버 완료 판정

- OpenAPI 계약과 실제 응답이 일치한다.
- 각 기능의 정상·검증 실패·401·403·404·409 시나리오가 자동 테스트로 검증된다.
- 역할별 접근 제어와 변경 감사 로그가 확인된다.
- 허용된 프론트 출처에서 preflight와 실제 요청이 모두 성공한다.
- 프론트가 샘플 데이터 없이 목록 조회, 빈 상태, 오류, 재시도, 쓰기 완료를 표현할 수 있다.
