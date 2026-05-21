# 서버-프론트 권한 연동 가이드

작성일: 2026-05-20  
대상: Plate Service 프론트엔드와 인증/권한 서버 연동

## 1. 핵심 방향

프론트엔드는 더 이상 `993` 같은 내부 숫자 코드를 관리자 권한으로 해석하지 않습니다. 서버는 토큰 또는 사용자 조회 응답에 의미가 드러나는 `roles`와 `permissions`를 내려주고, 프론트는 그 값을 기준으로 메뉴와 라우트를 제어합니다.

프론트 권한 체크는 화면 노출과 사용자 경험을 위한 보조 장치입니다. 실제 보안은 서버 API에서 반드시 다시 검사해야 합니다.

## 2. 프론트가 기대하는 사용자 권한 형태

권장 JWT payload 예시:

```json
{
  "sub": "12345",
  "username": "admin01",
  "displayName": "운영자",
  "roles": ["ADMIN"],
  "permissions": [
    "ADMIN_ACCESS",
    "FAQ_MANAGE",
    "QNA_MANAGE",
    "MEMBER_MONITORING_READ"
  ]
}
```

최소 구성:

```json
{
  "username": "admin01",
  "roles": ["ADMIN"]
}
```

세분화 권한까지 쓰는 구성:

```json
{
  "username": "operator01",
  "roles": ["OPERATOR"],
  "permissions": ["FAQ_MANAGE", "QNA_MANAGE"]
}
```

## 3. 프론트 권한 판정 방식

현재 프론트의 관리자 판정은 다음 중 하나를 만족하면 true입니다.

- `roles`에 `ADMIN` 포함
- `roles`에 `SUPER_ADMIN` 포함
- `permissions`에 `ADMIN_ACCESS` 포함

`ROLE_ADMIN`처럼 `ROLE_` 접두사가 붙은 Spring Security 스타일 role은 프론트에서 `ADMIN`으로 정규화해 인식합니다.

프론트는 호환성을 위해 아래 claim도 읽을 수 있습니다.

- 사용자 식별: `username`, `preferred_username`, `user_name`, `sub`, `email`
- 표시 이름: `displayName`, `display_name`, `nickName`, `nickname`
- 역할: `roles`, `role`, `auth`, `authorities`
- 권한: `permissions`, `permission`, `scope`, `scopes`

다만 서버 신규 구현은 `roles: []`, `permissions: []` 배열 형태를 우선 사용하기를 권장합니다.

## 4. 로그인/토큰 API 계약

현재 프론트 로그인 요청:

```http
POST /api/auth/login
Content-Type: application/json
```

요청 body 예시:

```json
{
  "username": "admin01",
  "password": "password",
  "deviceId": "web-browser",
  "deviceModel": "Chrome",
  "os": "web",
  "osVersion": "Windows",
  "appVersion": "web-1.0.0"
}
```

응답 body 예시:

```json
{
  "data": {
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
}
```

`accessToken` 안에는 2번의 권장 JWT payload처럼 사용자 식별 정보와 권한 정보가 들어 있어야 합니다.

토큰 갱신 요청:

```http
POST /api/auth/refresh
Content-Type: application/json
```

요청 body:

```json
{
  "refreshToken": "jwt-refresh-token"
}
```

응답 body는 로그인과 동일한 형태를 권장합니다.

## 5. 서버에서 반드시 검증해야 하는 권한

프론트는 관리자 메뉴를 숨기거나 `/admin/...` 라우트 접근을 막을 수 있지만, 이것만으로는 보안이 되지 않습니다. 아래 API는 서버에서 토큰과 권한을 반드시 확인해야 합니다.

- `POST /api/faqs`: `FAQ_MANAGE` 또는 `ADMIN_ACCESS`
- `PATCH /api/faqs/{faqId}`: `FAQ_MANAGE` 또는 `ADMIN_ACCESS`
- `DELETE /api/faqs/{faqId}`: `FAQ_MANAGE` 또는 `ADMIN_ACCESS`
- `PATCH /api/qna/{qnaId}`: `QNA_MANAGE` 또는 `ADMIN_ACCESS`
- `GET /api/admin/member-monitoring/summary`: `MEMBER_MONITORING_READ` 또는 `ADMIN_ACCESS`
- `GET /api/admin/member-monitoring/login-risks`: `MEMBER_MONITORING_READ` 또는 `ADMIN_ACCESS`
- `GET /api/admin/member-monitoring/profile-changes`: `MEMBER_MONITORING_READ` 또는 `ADMIN_ACCESS`
- `GET /api/admin/member-monitoring/risk-users`: `MEMBER_MONITORING_READ` 또는 `ADMIN_ACCESS`

## 6. 기존 숫자 코드가 필요한 경우

DB나 기존 인증 서버에서 `993` 같은 숫자 코드가 계속 필요할 수 있습니다. 이 경우 숫자 코드는 서버 내부 매핑으로 유지하고, 프론트로는 의미 있는 role/permission을 내려주는 방식을 권장합니다.

예시:

```text
DB role_code 993 -> JWT roles ["ADMIN"]
DB role_code 992 -> JWT roles ["OPERATOR"]
```

프론트에 아래처럼 숫자만 내려주는 방식은 피하는 것이 좋습니다.

```json
{
  "role": "993"
}
```

## 7. 권장 권한 모델

작은 운영 도구라면 아래 정도로 시작하면 충분합니다.

```json
{
  "roles": ["ADMIN"],
  "permissions": ["ADMIN_ACCESS"]
}
```

기능별 운영자를 나눌 가능성이 있다면 아래처럼 세분화합니다.

```json
{
  "roles": ["OPERATOR"],
  "permissions": ["FAQ_MANAGE", "QNA_MANAGE"]
}
```

권한명은 프론트와 서버가 공유하는 계약이므로, 추가/변경 시 문서와 테스트를 함께 업데이트해야 합니다.
