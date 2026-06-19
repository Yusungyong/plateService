# 입점 신청 계정 중복 확인 서버 작업 요청

작성일: 2026-06-19  
대상: 접시 백엔드 인증/입점 신청 담당자  
관련 프론트 문서: `BUSINESS_SIGNUP_FRONTEND_SPEC.md`  
관련 서버 문서: `BUSINESS_SIGNUP_SERVER_REQUIREMENTS.md`

## 1. 목적

식당 입점 신청 화면의 계정 단계에서 회원 ID, 이메일, 닉네임 중복 여부를 사용자가 입력칸을 벗어날 때마다 확인한다.

버튼형 중복 확인이 아니라 field blur 기반 자동 확인이다.

## 2. 신규 API

```http
POST /api/owner/signup-account-validations
Content-Type: application/json
```

인증:

- 비로그인 공개 API
- 계정 생성 전 호출되므로 `Authorization` 없이 허용
- 공개 API이므로 rate limit 적용 필요

요청:

```json
{
  "field": "username",
  "value": "owner01"
}
```

허용 field:

```txt
username
email
nickname
```

사용 가능 응답:

```json
{
  "success": true,
  "data": {
    "field": "username",
    "value": "owner01",
    "available": true,
    "message": "사용 가능한 회원 ID입니다."
  }
}
```

중복 응답:

```json
{
  "success": true,
  "data": {
    "field": "username",
    "value": "owner01",
    "available": false,
    "message": "이미 사용 중인 회원 ID입니다."
  }
}
```

## 3. 검증 정책

| field | 형식 검증 | 중복 기준 |
|---|---|---|
| `username` | trim, 영문/숫자 4~30자 | 로그인 회원 ID unique |
| `email` | trim, 이메일 형식, lower-case 정규화 | 정규화 이메일 unique |
| `nickname` | trim, 빈 값 불가 | 닉네임 unique |

권장 중복 메시지:

| field | message |
|---|---|
| `username` | 이미 사용 중인 회원 ID입니다. |
| `email` | 이미 가입된 이메일입니다. |
| `nickname` | 이미 사용 중인 닉네임입니다. |

형식 오류는 400 또는 `available=false` 중 하나로 통일해야 한다. 프론트는 기본 형식 오류를 먼저 검사하므로 정상 흐름에서는 중복 확인 API에 형식 오류 값이 거의 들어오지 않는다.

## 4. 최종 가입 처리 필수 사항

이 API는 UX 보조용이다. 다음 API는 반드시 서버 트랜잭션 안에서 중복 검사를 다시 수행해야 한다.

```http
POST /api/auth/signup
POST /api/owner/signup-applications
```

이유:

- blur 확인 후 실제 제출 전까지 다른 사용자가 같은 값을 선점할 수 있다.
- 프론트 검증은 우회 가능하다.
- 최종 보장은 DB unique constraint 또는 unique index가 해야 한다.

필수 DB 정책:

- `username` unique
- 정규화된 `email` unique
- `nickname` unique

## 5. 완료 조건

- `POST /api/owner/signup-account-validations`가 비로그인 상태에서 호출 가능하다.
- `username`, `email`, `nickname` 각각 `available=true/false`를 반환한다.
- 중복 값은 지정 메시지로 응답한다.
- `POST /api/owner/signup-applications`에서 중복 재검사를 수행하고, 중복이면 409와 fieldErrors를 반환한다.
- 공개 API rate limit이 적용된다.
