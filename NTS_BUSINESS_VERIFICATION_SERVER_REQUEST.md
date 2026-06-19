# 국세청 사업자등록정보 검증 서버 요청서

작성일: 2026-06-17
대상: 접시 백엔드 담당자
관련 프론트: `src/pages/BusinessSignup.js`, `src/api/businessApplicationApi.js`

## 1. 목적

식당 입점 신청 중 사업자등록증 파일을 받지 않고, 국세청 사업자등록정보 진위확인 API로 사업자 정보를 검증한다.

프론트는 국세청 API를 직접 호출하지 않고 접시 서버 API만 호출한다.

```txt
plateService -> plateAppServer -> 국세청 사업자등록정보 API
```

## 2. 서버 환경 설정

`application.yaml`

```yaml
external:
  nts-business:
    base-url: https://api.odcloud.kr/api/nts-businessman/v1
    service-key: ${NTS_BUSINESS_SERVICE_KEY:}
    timeout-ms: 5000
    enabled: ${NTS_BUSINESS_VERIFICATION_ENABLED:true}
```

로컬 예시 파일에는 키 값을 비워 둔다.

```yaml
external:
  nts-business:
    service-key:
```

운영/개발 서버에는 환경변수 또는 secret manager로 주입한다.

```bash
NTS_BUSINESS_SERVICE_KEY=공공데이터포털_서비스키
```

서비스키는 프론트 번들, Git, 로그에 노출하지 않는다.

## 3. 신규 API

### 3.1 사업자 진위확인

```http
POST /api/owner/business-verifications
Content-Type: application/json
```

로그인 전 입점 신청에서도 사용하므로 공개 API로 허용한다. 단, rate limit 적용을 권장한다.

요청:

```json
{
  "businessNumber": "123-45-67890",
  "representativeName": "김대표",
  "openingDate": "2024-01-15",
  "businessName": "플레이트컴퍼니"
}
```

서버 처리:

1. `businessNumber`는 숫자만 추출해 10자리 검증
2. `openingDate`는 국세청 API 요청 형식에 맞게 `yyyyMMdd`로 변환
3. 국세청 진위확인 API 호출
4. 결과를 접시 표준 응답으로 변환

성공 응답:

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

불일치 응답:

```json
{
  "success": true,
  "data": {
    "verified": false,
    "verificationStatus": "rejected",
    "message": "사업자등록번호, 대표자명 또는 개업일자가 일치하지 않습니다.",
    "provider": "NTS",
    "verifiedAt": "2026-06-17T12:00:00Z"
  }
}
```

API 장애 또는 서비스키 미설정:

```json
{
  "success": false,
  "errorCode": "BUSINESS_VERIFICATION_UNAVAILABLE",
  "message": "사업자 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요."
}
```

## 4. 입점 신청 요청 보강

프론트는 신청 생성 API의 `business` 객체에 아래 필드를 함께 보낸다.

```json
{
  "business": {
    "businessNumber": "123-45-67890",
    "businessName": "플레이트컴퍼니",
    "representativeName": "김대표",
    "openingDate": "2024-01-15",
    "verificationProvider": "NTS",
    "verificationStatus": "verified",
    "verificationVerifiedAt": "2026-06-17T12:00:00Z"
  }
}
```

서버는 신청 생성 시 위 값을 검증 이력으로 저장하거나 최소한 신청 row의 검증 상태에 반영한다.

권장 컬럼:

```txt
store_applications.business_representative_name varchar(100)
store_applications.business_opening_date date
store_applications.business_verification_provider varchar(30)
store_applications.business_verification_status varchar(30)
store_applications.business_verified_at timestamptz
store_applications.business_verification_message varchar(300)
```

## 5. 제출 조건

입점 신청 제출 조건:

```txt
국세청 검증 성공
```

즉, 아래 조건을 만족해야 제출 가능하다.

- `business_verification_status = verified`

사업자등록증 업로드는 기본 입점 신청 플로우에서 사용하지 않는다. 예외적인 수동심사 증빙 수집이 필요하면 별도 운영자 요청 플로우로 분리한다.

## 6. 보안과 운영 정책

- 국세청 서비스키는 서버 secret으로만 관리한다.
- 사업자등록번호 원문은 로그에 남기지 않는다.
- 국세청 API 원문 응답 전체를 로그에 남기지 않는다.
- 실패 응답에는 입력한 대표자명/사업자번호를 되돌려주지 않는다.
- 공개 API이므로 IP/user-agent 기반 rate limit을 둔다.
- 신규 사업자 또는 국세청 API 장애 시 재시도 안내 또는 별도 수동심사 경로를 제공한다.

## 7. 프론트 의존성

프론트는 이미 아래 API를 호출하도록 준비한다.

```js
verifyBusinessRegistration({
  businessNumber,
  representativeName,
  openingDate,
  businessName,
})
```

검증 성공 전에는 사업자 단계에서 다음 단계로 이동할 수 없다.

검증 성공 시 첨부파일 없이 다음 단계로 진행한다.
