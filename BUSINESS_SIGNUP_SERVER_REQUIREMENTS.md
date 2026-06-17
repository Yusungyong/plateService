# 비즈니스 회원가입 및 입점 신청 서버 설계서

작성일: 2026-06-17  
대상: 접시 백엔드, DB 담당자, 프론트엔드 담당자  
관련 문서: `BUSINESS_SIGNUP_FRONTEND_SPEC.md`, `SERVER_OWNER_STORE_REQUIREMENTS.md`, `SERVER_ADMIN_REQUIREMENTS.md`

## 1. 목적

일반 회원가입과 식당 관리자 입점 신청을 분리하되 로그인 계정은 하나의 공통 사용자 테이블을 사용한다.

핵심 원칙:

- 로그인 계정은 기존 `fp_100`을 사용한다.
- 식당 관리자 권한은 가입 즉시 부여하지 않는다.
- 입점 신청이 승인되면 `restaurants`와 `store_owners`를 생성한다.
- 내부 운영자 가입은 공개 API로 제공하지 않는다.

## 2. 계정과 도메인 분리

권장 테이블 구조:

```txt
fp_100
- 공통 로그인 계정

business_profiles
- 식당 관리자 신청자 프로필

store_applications
- 입점 신청

store_application_categories
store_application_menus
store_application_documents
store_application_reviews
- 신청 하위 데이터와 심사 기록

store_owners
- 승인된 운영 매장 소유권

admin_user_permissions
- 내부 운영자 권한
```

별도 로그인 테이블을 만들지 않는 이유:

- 한 사용자가 일반 고객이면서 식당 신청자가 될 수 있다.
- 소셜 로그인, 비밀번호 정책, refresh token, token_version을 중복 구현하지 않는다.
- 권한과 업무 데이터만 분리하면 된다.

## 3. 신규 또는 보강 테이블

### 3.1 business_profiles

```txt
id bigserial primary key
user_id integer not null
owner_name varchar(100) not null
owner_phone varchar(40)
owner_email varchar(320)
created_at timestamptz not null
updated_at timestamptz not null
```

인덱스:

```txt
unique active user_id
```

초기에는 profile 삭제를 제공하지 않는다.

### 3.2 store_applications 보강

기존 관리자 P0 스키마를 사용하되 owner 제출 API를 위해 아래 정책을 확정한다.

필수 필드:

```txt
applicant_user_id
store_name
region_code
address
owner_name
business_number_encrypted
business_number_hash
business_representative_name
business_opening_date
business_verification_provider
business_verification_status
business_verified_at
approval_status
verification_status
applied_at
updated_at
version
```

권장 상태:

```txt
draft
pending
on_hold
approved
rejected
```

현재 P0 migration에는 `draft`가 없다. 서버가 다중 기기 이어쓰기를 지원하려면 `approval_status` check constraint에 `draft`를 추가한다. draft를 추가하지 않는다면 프론트는 제출 전 임시 저장을 서버에 하지 않는다.

### 3.3 store_application_documents

문서 원본은 private S3에 저장하고 DB에는 object key만 저장한다.

필수 문서:

```txt
business_registration
```

후속 선택 문서:

```txt
sales_permit
identity_verification
other
```

통장 사본은 P0 수집 대상에서 제외한다.

## 4. 인증 API

### 4.1 일반 회원가입

기존 API를 유지한다.

```http
POST /api/auth/signup
Content-Type: application/json
```

요청:

```json
{
  "username": "owner01",
  "email": "owner@example.com",
  "password": "password123",
  "nickname": "김사장"
}
```

응답:

```json
{
  "success": true,
  "data": null,
  "message": "회원가입 완료"
}
```

정책:

- `username`은 로그인용 회원 ID로 저장한다.
- `email`은 연락 및 알림용 이메일로 별도 저장한다.
- 성공 후 토큰을 발급하지 않는다.
- 프론트는 가입 후 로그인하도록 안내한다.

### 4.2 비즈니스 가입 통합 API

프론트 편의를 위해 계정 생성과 신청 제출을 한 번에 처리하는 API를 제공할 수 있다.

```http
POST /api/owner/signup-applications
Content-Type: application/json
```

요청:

```json
{
  "account": {
    "username": "owner01",
    "email": "owner@example.com",
    "password": "password123",
    "nickname": "김사장"
  },
  "ownerProfile": {
    "ownerName": "김사장",
    "ownerPhone": "010-1234-5678",
    "ownerEmail": "owner@example.com"
  },
  "business": {
    "businessNumber": "123-45-67890",
    "businessName": "플레이팅컴퍼니",
    "representativeName": "김대표",
    "openingDate": "2024-01-15",
    "verificationProvider": "NTS",
    "verificationStatus": "verified",
    "verificationVerifiedAt": "2026-06-17T12:00:00Z"
  },
  "store": {
    "storeName": "플레이팅 키친 강남점",
    "regionCode": "SEOUL",
    "address": "서울 강남구 테헤란로 123",
    "phone": "02-1234-5678",
    "email": "store@example.com",
    "description": "매장 소개"
  },
  "categories": [
    {
      "categoryCode": "KOREAN",
      "displayOrder": 0
    }
  ],
  "menus": [
    {
      "name": "시그니처 메뉴",
      "price": 12000,
      "description": "대표 메뉴",
      "displayOrder": 0
    }
  ]
}
```

응답:

```json
{
  "success": true,
  "data": {
    "applicationId": 100,
    "approvalStatus": "pending"
  }
}
```

이 API는 문서 업로드를 별도 단계로 둘 경우 `draft` 상태를 생성하고 문서 제출 후 `submit`을 호출하는 방식이 더 안전하다.

## 5. Owner 신청 API

### 5.0 사업자 진위확인

```http
POST /api/owner/business-verifications
Content-Type: application/json
```

로그인 전 입점 신청에서도 사용하므로 공개 허용한다. 단, rate limit을 적용한다.

요청:

```json
{
  "businessNumber": "123-45-67890",
  "representativeName": "김대표",
  "openingDate": "2024-01-15",
  "businessName": "플레이팅컴퍼니"
}
```

응답:

```json
{
  "success": true,
  "data": {
    "verified": true,
    "verificationStatus": "verified",
    "message": "사업자 정보가 확인되었습니다.",
    "provider": "NTS",
    "verifiedAt": "2026-06-17T12:00:00Z"
  }
}
```

구현 상세는 `NTS_BUSINESS_VERIFICATION_SERVER_REQUEST.md`를 따른다.

### 5.1 신청 생성

로그인 사용자 기준 신청 생성:

```http
POST /api/owner/store-applications
```

인증 필요.

요청 body는 4.2에서 `account`를 제외한 구조를 사용한다.

처리:

1. `fp_100`에서 로그인 사용자 조회
2. `business_profiles` upsert
3. 사업자등록번호 정규화
4. 사업자 검증 결과 확인
5. 사업자등록번호 암호화 저장
6. 검색용 hash 저장
7. `store_applications` 생성
8. categories, menus 저장

초기 상태:

- 문서까지 함께 제출하면 `approval_status = pending`
- draft 지원 시 `approval_status = draft`
- `verification_status = reviewing` 또는 `not_requested`

### 5.2 내 신청 목록

```http
GET /api/owner/store-applications?page=0&size=20
```

로그인 사용자의 `applicant_user_id`와 일치하는 신청만 반환한다.

### 5.3 신청 상세

```http
GET /api/owner/store-applications/{applicationId}
```

본인 신청만 허용한다. 다른 사용자의 신청은 404 또는 403 중 하나를 선택한다. 정보 노출 최소화를 위해 404를 권장한다.

### 5.4 신청 수정

```http
PUT /api/owner/store-applications/{applicationId}
```

허용 상태:

```txt
draft
on_hold
```

`pending`, `approved`, `rejected`는 수정할 수 없다. 반려 후 재신청은 새 신청을 생성하고 `parent_application_id`로 연결한다.

### 5.5 문서 업로드

```http
POST /api/owner/store-applications/{applicationId}/documents
Content-Type: multipart/form-data
```

필드:

```txt
file
documentType
```

응답:

```json
{
  "success": true,
  "data": {
    "documentId": 10,
    "documentType": "business_registration",
    "originalName": "사업자등록증.pdf",
    "verificationStatus": "submitted"
  }
}
```

문서는 private object로 저장한다. 프론트에 공개 URL을 반환하지 않는다.

### 5.6 제출

```http
POST /api/owner/store-applications/{applicationId}/submit
```

요청:

```json
{
  "version": 3
}
```

처리:

- 국세청 검증 성공 또는 필수 문서 존재 확인
- 필수 매장/사업자 정보 확인
- `approval_status = pending`
- `verification_status = reviewing`
- `updated_at`, `version` 갱신

## 6. 관리자 승인 연계

관리자 승인 API는 기존 P0 계약을 유지하되 승인 트랜잭션에서 owner 관계를 반드시 생성한다.

```txt
store_owners.store_id = created restaurant id
store_owners.user_id = store_applications.applicant_user_id
store_owners.owner_role = OWNER
revoked_at = null
```

승인 후 사용자가 다시 로그인하거나 토큰을 갱신하면 프론트가 비즈니스 매장 관리 진입을 허용할 수 있도록 권장 claim을 내려준다.

권장 JWT claim:

```json
{
  "roles": ["USER", "STORE_OWNER"],
  "permissions": ["OWNER_ACCESS"]
}
```

단, 이 claim은 UX 보조다. `/api/owner/stores/{storeId}`는 반드시 `store_owners` DB 조회로 최종 검증한다.

## 7. 사업자등록번호 처리

정규화:

```txt
숫자만 추출
10자리 확인
```

국세청 검증:

- `businessNumber`, `representativeName`, `openingDate`로 진위확인
- `businessName`은 보조 정보로 사용
- 서비스키는 서버 환경변수로만 관리
- 프론트는 국세청 API를 직접 호출하지 않음

저장:

- `business_number_encrypted`: AES-GCM 등 복호화 가능한 암호화
- `business_number_hash`: 정규화 번호의 단방향 hash

응답:

- 관리자/신청자 상세에는 마스킹 값만 반환
- 예: `123-**-*****`

로그 금지:

- 원문 사업자등록번호
- 암호화 전 값
- 문서 signed URL

## 8. 중복 정책

초기 중복 차단:

- 동일 `business_number_hash`로 `pending`, `on_hold`, `approved` 상태 신청이 있으면 신규 제출 제한
- `rejected`는 재신청 가능하되 `parent_application_id`로 연결

오승인 대응:

- 승인 취소 API는 제공하지 않는다.
- 운영 매장을 `suspended` 또는 `hidden` 상태로 변경하고 감사 로그를 남긴다.

## 9. 오류 코드

| 상황 | HTTP | errorCode |
|---|---:|---|
| 회원 ID 중복 | 409 | `COMMON_CONFLICT` |
| 이메일 중복 | 409 | `COMMON_CONFLICT` |
| 사업자번호 형식 오류 | 400 | `BUSINESS_NUMBER_INVALID` |
| 중복 신청 | 409 | `STORE_APPLICATION_DUPLICATE_BUSINESS` |
| 신청 없음 | 404 | `STORE_APPROVAL_NOT_FOUND` |
| 본인 신청 아님 | 404 또는 403 | `STORE_APPROVAL_NOT_FOUND` 또는 `AUTH_403` |
| 수정 불가 상태 | 409 | `STORE_APPROVAL_INVALID_TRANSITION` |
| 필수 문서 누락 | 409 | `STORE_APPROVAL_DOCUMENT_INCOMPLETE` |
| 버전 충돌 | 409 | `STORE_APPROVAL_VERSION_CONFLICT` |
| 파일 타입 불가 | 400 | `COMMON_400` |

기존 오류 코드와 충돌하지 않는 범위에서 신규 코드를 추가한다.

## 10. 권한 정책

공개 허용:

```http
POST /api/auth/signup
POST /api/owner/business-verifications
POST /api/owner/signup-applications
```

단, 통합 가입 API는 rate limit과 CAPTCHA 또는 이메일 인증을 후속 검토한다.

로그인 필요:

```http
GET  /api/owner/store-applications
GET  /api/owner/store-applications/{applicationId}
PUT  /api/owner/store-applications/{applicationId}
POST /api/owner/store-applications/{applicationId}/documents
POST /api/owner/store-applications/{applicationId}/submit
GET  /api/owner/stores
GET  /api/owner/stores/{storeId}
PUT  /api/owner/stores/{storeId}
```

관리자 전용:

```http
/api/admin/**
```

식당 관리자 권한만으로 `/api/admin/**`에 접근할 수 없다.

## 11. 알림

신청자에게 알림을 보낸다.

트리거:

- 신청 제출 완료
- 보류
- 반려
- 승인

채널:

- P0: 인앱 알림, FCM
- 이메일은 후속 작업

## 12. 보존 정책

기존 관리자 P0 정책을 따른다.

- 반려된 신청 문서: 반려 후 90일 뒤 삭제
- 승인된 신청 문서: 사장님-매장 관계 종료 후 1년 뒤 삭제
- 신청 기본 정보와 상태 이력: 5년
- 감사 로그: 5년

## 13. 구현 순서

1. `business_profiles` migration 추가
2. `store_applications`에 `draft` 상태를 추가할지 결정
3. owner 신청 API 구현
4. 국세청 사업자 검증 API 구현
5. 문서 업로드 API 구현
6. 승인 트랜잭션에서 `store_owners` 생성
7. JWT 권장 claim 보강
8. `/api/owner/stores` 소유권 API 구현
9. 프론트 실제 adapter 전환
10. 통합 테스트

## 14. 테스트 완료 조건

- 일반 회원가입은 기존대로 계정만 생성한다.
- 비즈니스 신청 생성 시 `fp_100`과 신청 데이터가 분리 저장된다.
- 국세청 사업자 검증 성공 전에는 검증 완료 상태로 저장하지 않는다.
- 국세청 사업자 검증 성공 시 사업자등록증 없이 제출할 수 있다.
- 로그인 사용자는 본인 신청만 조회한다.
- 보류 상태 신청은 수정 후 재제출할 수 있다.
- 반려 후 재신청은 새 신청을 만든다.
- 승인 시 `restaurants`와 `store_owners`가 생성된다.
- 승인된 식당 관리자만 본인 매장을 수정할 수 있다.
- 식당 관리자 권한만으로 관리자 API에 접근할 수 없다.
- 내부 운영자 권한만으로 owner 매장 수정은 불가하다.

## 15. 프론트 영향

프론트는 다음 문서를 기준으로 구현한다.

- `BUSINESS_SIGNUP_FRONTEND_SPEC.md`
- `SERVER_OWNER_STORE_REQUIREMENTS.md`

서버가 `draft`를 지원하지 않는 기간에는 프론트가 `sessionStorage` 임시 저장을 사용한다. 서버 `draft`가 준비되면 다중 기기 이어쓰기를 위해 draft API로 전환한다.
