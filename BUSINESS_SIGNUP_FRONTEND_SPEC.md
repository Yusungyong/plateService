# 비즈니스 회원가입 및 입점 신청 프론트 설계서

작성일: 2026-06-17  
대상 프로젝트: `plateService`  
관련 서버 문서: `BUSINESS_SIGNUP_SERVER_REQUIREMENTS.md`, `SERVER_OWNER_STORE_REQUIREMENTS.md`, `SERVER_ADMIN_REQUIREMENTS.md`

## 1. 목적

식당 관리자 사용자가 일반 로그인 화면에서 헤매지 않고 계정 생성, 입점 신청, 보완, 승인 후 매장 관리까지 이어지도록 별도 프론트 흐름을 만든다.

내부 운영자 가입은 이 문서의 범위가 아니다. 내부 운영자는 공개 가입이 아니라 관리자 초대 또는 직접 생성 방식으로 별도 설계한다.

## 2. 사용자 유형

| 사용자 | 설명 | 최초 접근 |
|---|---|---|
| 일반 회원 | 앱 또는 고객지원 사용 목적 | `/signup` |
| 식당 관리자 신청자 | 입점 신청을 제출하려는 사용자 | `/business/signup` |
| 승인된 식당 관리자 | 하나 이상의 매장을 소유한 사용자 | `/business/stores` |
| 내부 운영자 | 접시 운영팀 | `/admin/*` |

공통 계정은 서버의 `fp_100`을 사용한다. 식당 관리자 여부는 가입 직후 권한이 아니라 입점 신청과 `store_owners` 소유권으로 판단한다.

## 3. 라우트

```txt
/login
/signup

/business/signup
/business/applications
/business/applications/:applicationId
/business/applications/:applicationId/edit
/business/stores
/business/stores/:storeId
```

권장 리다이렉트:

- 로그인하지 않은 사용자가 `/business/signup` 접근: 허용. 첫 단계에서 계정 생성 또는 로그인 선택.
- 로그인하지 않은 사용자가 `/business/applications` 접근: `/login`으로 이동.
- 로그인하지 않은 사용자가 `/business/stores` 접근: `/login`으로 이동.
- 로그인했지만 소유 매장이 없는 사용자: `/business/applications`로 이동하거나 빈 상태에서 "입점 신청하기" CTA 표시.
- 내부 운영자가 `/business/stores` 접근: 기본적으로 차단. 운영자 대리 작업은 후속 설계.

## 4. 화면 구조

### 4.1 일반 회원가입 `/signup`

목적은 일반 계정 생성이다.

필드:

```txt
username
email
password
passwordConfirm
nickname
termsAccepted
privacyAccepted
```

동작:

1. 클라이언트 검증
2. `POST /api/auth/signup`
3. 성공 시 `/login` 이동
4. 로그인 페이지에 "가입이 완료되었습니다. 로그인해 주세요." 안내

주의:

- 일반 회원가입 성공 후 토큰은 발급되지 않는다.
- 식당 관리자 권한을 자동 부여하지 않는다.

### 4.2 비즈니스 회원가입 시작 `/business/signup`

목적은 계정 생성과 입점 신청을 하나의 온보딩 흐름으로 제공하는 것이다.

단계:

```txt
1. 계정 정보
2. 담당자 정보
3. 사업자 정보
4. 매장 기본 정보
5. 대표 메뉴 및 이미지
6. 제출 서류
7. 검토 및 제출
```

이미 로그인한 사용자는 1단계를 건너뛰고 기존 계정으로 신청을 생성한다.

### 4.3 신청 목록 `/business/applications`

로그인 사용자의 입점 신청 목록을 보여준다.

표시 항목:

```txt
applicationId
storeName
approvalStatus
verificationStatus
appliedAt
updatedAt
reviewReason
storeId nullable
```

상태별 CTA:

| 상태 | CTA |
|---|---|
| `draft` | 이어서 작성 |
| `pending` | 상세 보기 |
| `on_hold` | 보완하기 |
| `approved` | 매장 관리로 이동 |
| `rejected` | 재신청 |

### 4.4 신청 상세 `/business/applications/:applicationId`

상세 정보, 제출 서류, 최근 검토 사유를 보여준다.

보류 상태(`on_hold`)에서는 "보완 제출" 버튼을 노출한다. 승인 또는 반려 상태에서는 수정하지 않는다.

## 5. 프론트 상태 모델

```js
export const BUSINESS_APPLICATION_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  ON_HOLD: "on_hold",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const BUSINESS_VERIFICATION_STATUS = {
  NOT_REQUESTED: "not_requested",
  REVIEWING: "reviewing",
  VERIFIED: "verified",
  REJECTED: "rejected",
};
```

초기 서버 P0의 `store_applications.approval_status`에는 `draft`가 없으므로, 프론트 draft는 서버 저장 전 local/session draft로만 유지하거나 서버가 `draft` 상태를 추가해야 한다. 권장안은 서버에 `draft` 상태를 추가해 다중 기기 이어쓰기를 지원하는 것이다.

## 6. API Adapter

신규 파일:

```txt
src/api/signupApi.js
src/api/businessApplicationApi.js
```

권장 함수:

```js
signup({ username, email, password, nickname })
verifyBusinessRegistration({ businessNumber, representativeName, openingDate, businessName })
createBusinessSignupDraft(payload)
submitBusinessApplication(payload)
getMyBusinessApplications(params)
getBusinessApplicationDetail(applicationId)
updateBusinessApplication(applicationId, payload)
uploadBusinessApplicationDocument(applicationId, file, metadata)
resubmitBusinessApplication(applicationId, payload)
```

기존 `restaurantApi.js`는 승인된 매장 관리 전용으로 유지하며 `/api/owner/stores`만 호출한다.

## 7. 입력 검증

프론트 1차 검증:

- `username`: 필수, 로그인용 회원 ID, 영문/숫자 4~30자
- `email`: 필수, 연락 및 알림용 이메일, 이메일 형식
- `password`: 8~64자
- `passwordConfirm`: password와 일치
- `nickname`: 필수
- `ownerName`: 필수
- `ownerPhone`: 필수
- `businessNumber`: 필수, 숫자 10자리 또는 하이픈 허용
- `representativeName`: 필수, 국세청 사업자 진위확인용 대표자명
- `openingDate`: 필수, 국세청 사업자 진위확인용 개업일자
- `businessVerification`: 필수, `POST /api/owner/business-verifications` 성공 필요
- `businessName`: 필수
- `storeName`: 필수, 150자 이하
- `regionCode`: 필수
- `address`: 필수
- `categories`: 1개 이상, 4개 이하
- `documents.business_registration`: 국세청 검증 성공 시 선택, 검증 미완료 또는 수동심사 시 필수
- 파일: 서버 허용 MIME type과 크기를 프론트에서도 1차 제한

서버 검증이 최종 기준이다.

## 8. 에러 처리

| 상황 | 프론트 처리 |
|---|---|
| 400 fieldErrors | 필드 하단 오류 표시 |
| 401 | 로그인 화면으로 이동 |
| 403 | 권한 안내 후 `/faq` 또는 `/business/applications` 이동 |
| 409 중복 회원 ID | 계정 단계에 "이미 사용 중인 회원 ID입니다" 표시 |
| 409 중복 이메일 | 계정 단계에 "이미 등록된 이메일입니다" 표시 |
| 409 중복 사업자번호 | 사업자 정보 단계에 안내 |
| 사업자 검증 실패 | 사업자 정보 단계에 불일치 사유 표시 |
| 사업자 검증 API 장애 | 재시도 안내 또는 사업자등록증 수동심사 안내 |
| 409 버전 충돌 | 최신 상세 재조회 후 입력 유지 |
| 파일 업로드 실패 | 해당 파일 카드에 재시도 버튼 |

## 9. UX 원칙

- 제출 전까지 사용자가 입력한 값은 단계 이동 시 보존한다.
- 서버 draft가 구현되기 전에는 `sessionStorage` 임시 저장을 사용한다.
- 사업자등록번호 원문은 화면 상태에만 보관하고 로그에 남기지 않는다.
- 국세청 서비스키는 프론트에 두지 않으며 프론트는 접시 서버 검증 API만 호출한다.
- 문서 미리보기는 서버가 허용하는 signed URL 또는 local object URL만 사용한다.
- 반려 후 재신청은 기존 신청을 수정하지 않고 새 신청을 생성한다.

## 10. 권한과 토큰

비즈니스 회원가입 직후 JWT에 반드시 owner 권한이 들어갈 필요는 없다. 권장 정책은 다음과 같다.

- 계정만 생성된 사용자는 일반 `USER`.
- 입점 신청이 존재하지만 승인 전인 사용자는 `/business/applications` 접근 가능.
- 승인 후 `store_owners` 관계가 생성되면 `/business/stores` 접근 가능.
- 프론트 권한 판정은 UX 보조 수단이며 서버의 owner API 소유권 검증이 최종 보안이다.

서버가 신청자 접근용 claim을 제공한다면 아래 중 하나를 사용할 수 있다.

```txt
permission: BUSINESS_APPLICATION_ACCESS
role: BUSINESS_APPLICANT
```

단, 이 권한은 매장 관리 권한이 아니다.

## 11. 테스트 시나리오

- 일반 회원가입 성공 후 로그인 화면으로 이동한다.
- 중복 회원 ID 또는 이메일 오류를 표시한다.
- 비로그인 사용자가 비즈니스 가입을 시작할 수 있다.
- 로그인 사용자는 계정 단계를 건너뛴다.
- 필수 문서 누락 시 제출이 막힌다.
- 신청 제출 성공 후 `/business/applications/:applicationId`로 이동한다.
- 보류 신청은 보완 제출이 가능하다.
- 승인 신청은 매장 관리로 이동한다.
- 내부 운영자 메뉴와 비즈니스 메뉴가 섞이지 않는다.
- 사업자등록번호, 대표자명, 개업일자를 입력하면 서버 검증 API를 호출한다.
- 사업자 검증 성공 전에는 다음 단계 이동이 막힌다.
- 사업자 검증 성공 시 사업자등록증 업로드는 선택으로 표시된다.

## 12. 구현 순서

1. 일반 `/signup` 페이지와 `signupApi.js` 추가
2. 로그인 화면에 회원가입 링크 추가
3. 비즈니스 가입 라우트와 단계형 폼 추가
4. `businessApplicationApi.js` mock adapter 작성
5. 서버 API 준비 후 실제 adapter 전환
6. 신청 목록과 상세 화면 추가
7. owner API 준비 후 `/business/stores`와 연결

## 13. 서버 의존성

이 프론트 설계는 아래 서버 작업을 필요로 한다.

- `POST /api/auth/signup` 유지 또는 응답 보강
- `POST /api/owner/business-verifications`
- `POST /api/owner/store-applications`
- `GET /api/owner/store-applications`
- `GET /api/owner/store-applications/{applicationId}`
- `PUT /api/owner/store-applications/{applicationId}`
- `POST /api/owner/store-applications/{applicationId}/documents`
- `POST /api/owner/store-applications/{applicationId}/submit`
- 승인 시 `store_owners` 생성

상세 서버 계약은 `BUSINESS_SIGNUP_SERVER_REQUIREMENTS.md`를 따른다.
