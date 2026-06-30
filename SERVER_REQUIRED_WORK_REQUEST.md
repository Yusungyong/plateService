# Plate Service 백엔드 구현 확인 및 요청서

- 작성일: 2026-06-30
- 기준 문서: `FRIENDLINESS_CONTEXT_REVIEW_REPORT.md`
- 목적: 프론트에서 즉시 개선한 고객지원/입점/관리 UX 이후, 백엔드 구현 여부를 먼저 확인하고 필요한 API/정책 작업을 정리한다.
- 전달 원칙: 이미 구현된 항목이 있을 수 있으므로 각 항목은 "구현 여부 확인"을 먼저 받고, 미구현/부분 구현일 때만 요청 범위를 확정한다.

## 0. 백엔드 회신 요청 방식

아래 형식으로 항목별 현재 상태를 먼저 알려 주세요.

| 항목 | 현재 상태 | 관련 API/파일 | 샘플 응답 제공 여부 | 프론트 추가 수정 필요 여부 | 메모 |
| --- | --- | --- | --- | --- | --- |
| 예: 1:1 비공개 문의 저장 | 완료/부분/미구현 | `POST /api/qna` | 가능/불가 | 있음/없음 | `isPublic=false` 저장 가능 |

상태 기준:

- 완료: API와 데이터가 운영 가능한 형태로 구현되어 있고 프론트 연동 계약을 공유할 수 있음
- 부분: 저장은 되지만 목록/권한/알림/이력 등 일부가 부족함
- 미구현: 신규 설계와 구현 필요
- 정책 결정 필요: 구현 전 기획/운영 정책 확정이 필요함

## 1. 프론트 현재 반영 상태

프론트에서는 다음 개선을 이미 반영했습니다.

- 공개 Q&A 목록: `/qna`
- 공개 질문 등록: `/qna/new`
- 1:1 비공개 문의 접수: `/qna/private`
- 1:1 문의 등록 payload: `POST /api/qna`에 `isPublic: false`, `guestEmail`, `guestName`, `category`, `question` 전달
- 공개 Q&A 목록 방어 로직: `isPublic === false` 또는 `statusCode === "hidden"` 항목은 프론트에서 노출하지 않음
- 입점 신청 상세: 상태별 다음 행동 안내와 프론트 계산형 미니 타임라인 제공
- 관리자 알림/전체 활동 보기: 실제 기능처럼 보이지 않도록 준비 중 상태 처리
- 매장 미디어: 기존 미디어 조회/표시는 가능하나 삭제, 대표 지정, 순서 변경 UI는 백엔드 계약 확인 전 보류

현재 프론트가 사용하는 주요 API:

- `GET /api/qna`
- `POST /api/qna`
- `PATCH /api/qna/{qnaId}`
- `GET /api/owner/store-applications`
- `GET /api/owner/store-applications/{applicationId}`
- `PUT /api/owner/store-applications/{applicationId}`
- `POST /api/owner/store-applications/{applicationId}/submit`
- `GET /api/admin/store-approvals`
- `GET /api/admin/store-approvals/{applicationId}`
- `POST /api/admin/store-approvals/{applicationId}/approve`
- `POST /api/admin/store-approvals/{applicationId}/hold`
- `POST /api/admin/store-approvals/{applicationId}/reject`
- `GET /api/owner/stores`
- `GET /api/owner/stores/{storeId}`
- `PUT /api/owner/stores/{storeId}`
- `POST /api/owner/files`

## 2. P0 확인 및 요청: Q&A 공개/비공개 계약

### 2.1 먼저 확인할 내용

백엔드에서 아래가 이미 가능한지 확인해 주세요.

1. `POST /api/qna`가 `isPublic: false`를 받아 비공개 문의로 저장하는가?
2. 비공개 문의의 `guestEmail`, `guestName`이 저장되는가?
3. `GET /api/qna` 공개 목록에서 `isPublic: false` 또는 `hidden` 문의가 서버 단계에서 제외되는가?
4. 관리자 Q&A 목록에서 공개/비공개 문의를 모두 조회할 수 있는 별도 관리자 API가 있는가?
5. 답변 저장 시 `guestEmail` 또는 회원 이메일로 답변 알림이 발송되는가?
6. 로그인 사용자가 본인이 남긴 문의만 조회할 수 있는 "내 문의" API가 있는가?
7. 공개 Q&A에 개인정보가 포함된 경우 관리자가 비공개로 전환할 수 있는가?

### 2.2 필요한 계약

비공개 문의 저장은 현재 프론트와 맞춰 아래 payload를 지원해 주세요.

```http
POST /api/qna
Content-Type: application/json
```

```json
{
  "category": "계정문의",
  "question": "사업자 정보 확인이 필요합니다.",
  "isPublic": false,
  "guestEmail": "reply@example.com",
  "guestName": "문의자"
}
```

권장 응답:

```json
{
  "data": {
    "qnaId": 123,
    "category": "계정문의",
    "statusCode": "received",
    "isPublic": false,
    "createdAt": "2026-06-30T10:00:00Z"
  }
}
```

공개 목록 권장 정책:

- `GET /api/qna`는 기본적으로 `isPublic=true`이고 `statusCode != hidden`인 항목만 반환
- 이메일, 내부 메모, 비공개 문의 내용은 공개 목록 응답에서 제외
- 프론트 방어 로직은 유지하지만, 최종 보호는 서버에서 처리

관리자 API 권장:

- `GET /api/admin/qna?visibility=all|public|private&statusCode=&category=&page=&size=`
- `GET /api/admin/qna/{qnaId}`
- `PATCH /api/admin/qna/{qnaId}` 또는 기존 `PATCH /api/qna/{qnaId}`의 관리자 권한 검증 강화

관리자 목록 필수 필드:

- `qnaId`
- `category`
- `question`
- `answer`
- `statusCode`
- `isPublic`
- `guestName`
- `guestEmail`
- `username`
- `createdAt`
- `updatedAt`
- `answeredAt`
- `answeredBy`

내 문의 API 권장:

- `GET /api/qna/my?page=&size=&statusCode=`
- `GET /api/qna/my/{qnaId}`

로그인 사용자가 문의를 작성할 때는 사용자 ID와 문의를 연결해 주세요. 비로그인 문의는 이메일 기반 답변 안내까지만 제공하고, 별도 조회가 필요하다면 이메일 인증 토큰 정책을 별도로 협의해야 합니다.

답변 알림:

- 답변 저장 시 이메일 발송 여부를 알려 주세요.
- 발송 실패 시 답변 저장 자체를 실패시킬지, 저장은 성공하고 발송 실패 이벤트를 남길지 정책이 필요합니다.
- 응답에 `notificationStatus: sent|pending|failed|skipped` 같은 값을 줄 수 있으면 프론트 안내가 쉬워집니다.

## 3. P0 확인 및 요청: 입점 신청 처리 이력과 보완 요청

### 3.1 먼저 확인할 내용

1. `GET /api/owner/store-applications/{applicationId}` 응답에 `reviews`, `latestReview`, `history`, `events` 중 하나가 포함되는가?
2. 보완 요청 항목별 정보가 있는가? 예: 담당자 연락처, 사업자 정보, 매장 주소, 메뉴 정보 등
3. 보완 요청 사유가 신청자에게 보이는 메시지와 내부 운영 메모로 분리되어 있는가?
4. 제출 버전 이력 또는 버전 비교 API가 있는가?
5. 반려 후 재신청 가능 여부와 재신청 가능한 상태값이 API로 표현되는가?

### 3.2 필요한 계약

신청 상세에 서버 기반 처리 이력을 포함하거나 별도 API로 제공해 주세요.

권장 API:

- `GET /api/owner/store-applications/{applicationId}/history`
- `GET /api/owner/store-applications/{applicationId}/versions`
- `GET /api/owner/store-applications/{applicationId}/versions/{version}`

처리 이력 이벤트 예시:

```json
{
  "eventId": 9001,
  "type": "CHANGES_REQUESTED",
  "fromStatus": "pending",
  "toStatus": "on_hold",
  "title": "보완 요청",
  "messageForApplicant": "담당자 연락처와 매장 주소를 확인해 주세요.",
  "reasonCode": "OWNER_CONTACT_INVALID",
  "createdAt": "2026-06-30T10:00:00Z",
  "createdByName": "운영팀",
  "version": 3
}
```

보완 항목 예시:

```json
{
  "changeRequestId": 501,
  "fieldPath": "ownerProfile.ownerPhone",
  "fieldLabel": "담당자 연락처",
  "step": "owner",
  "reasonCode": "INVALID_PHONE",
  "message": "연락 가능한 번호로 수정해 주세요.",
  "status": "open"
}
```

프론트에서 필요한 값:

- 상태 변경 일시
- 처리자 표시명
- 신청자에게 보이는 메시지
- 보완이 필요한 필드와 어느 신청 단계로 이동해야 하는지
- 재제출 가능 여부
- 낙관적 잠금용 `version`

## 4. P0 확인 및 요청: 관리자 승인/검증 상태 정책

### 4.1 먼저 확인할 내용

이전 확인 결과, 사업자 자동 검증 상태와 관리자 승인 화면의 검증 상태가 별도 값으로 동작했습니다. 현재 정책과 구현이 정리되었는지 다시 확인해 주세요.

1. 사업자번호 자동 검증 결과(`businessVerificationStatus`)가 관리자 API 응답에 노출되는가?
2. 관리자 화면의 `verificationStatus`는 "사업자 인증"인가, "서류/입점 심사"인가?
3. 최종 승인 API가 승인 조건을 충족할 수 있도록 `verificationStatus`를 함께 변경하는가?
4. 별도 서류 심사 완료 API가 있다면 경로와 요청/응답은 무엇인가?
5. `/approve`가 `verificationStatus == verified`를 선행 조건으로 요구한다면, 그 상태로 전환하는 API가 실제로 존재하는가?

### 4.2 필요한 계약

관리자 승인 상세 응답에는 두 상태를 분리해 내려주는 것을 권장합니다.

```json
{
  "applicationId": 100,
  "approvalStatus": "pending",
  "reviewStatus": "reviewing",
  "businessVerificationStatus": "verified",
  "businessVerificationProvider": "nts",
  "businessVerifiedAt": "2026-06-30T09:00:00Z",
  "businessVerificationMessage": "사업자등록번호 확인 완료",
  "version": 4
}
```

정책 선택이 필요합니다.

- 정책 A: `/approve`가 최종 승인 자체로 서류 심사 완료를 의미하며, 승인 시 review/verification 상태도 완료 처리
- 정책 B: 승인 전 별도 `POST /api/admin/store-approvals/{applicationId}/verify-documents` 같은 검토 완료 API를 호출해야 함

어느 정책이든 프론트가 버튼 비활성 사유를 정확히 보여줄 수 있도록 `canApprove`, `approveBlockedReasons`를 응답에 포함하는 방식을 권장합니다.

```json
{
  "canApprove": false,
  "approveBlockedReasons": [
    {
      "code": "DOCUMENT_REVIEW_REQUIRED",
      "message": "필수 서류 검수가 완료되지 않았습니다."
    }
  ]
}
```

## 5. P1 확인 및 요청: 관리자 알림 센터와 작업 큐

### 5.1 먼저 확인할 내용

1. 관리자 대시보드의 최근 활동 외에 알림 목록 API가 있는가?
2. 승인 대기, 보완 재제출, 미답변 Q&A, 위험 회원 같은 작업 항목을 서버에서 집계하는가?
3. 읽음 처리, 담당자 배정, 처리 완료 같은 상태 변경 API가 있는가?

### 5.2 필요한 계약

권장 API:

- `GET /api/admin/notifications?page=&size=&read=`
- `PATCH /api/admin/notifications/{notificationId}/read`
- `PATCH /api/admin/notifications/read-all`
- `GET /api/admin/tasks?type=&priority=&page=&size=`
- `PATCH /api/admin/tasks/{taskId}`

작업 큐 항목 예시:

```json
{
  "taskId": 7001,
  "type": "STORE_APPROVAL_WAITING",
  "priority": "high",
  "title": "입점 승인 대기 12건",
  "targetPath": "/admin/store-approvals?status=pending",
  "count": 12,
  "createdAt": "2026-06-30T10:00:00Z"
}
```

## 6. P1 확인 및 요청: 매장 미디어 관리

### 6.1 먼저 확인할 내용

1. `PUT /api/owner/stores/{storeId}`에서 기존 media 배열을 어떻게 처리하는가?
2. 기존 media ID를 제외해서 보내면 삭제로 간주되는가, 아니면 기존 미디어가 유지되는가?
3. `usageType`, `displayOrder` 변경으로 대표 이미지 지정과 순서 변경이 가능한가?
4. 미디어 삭제 전 권한 검증과 파일 스토리지 삭제 또는 orphan 정리 정책이 있는가?
5. 업로드 파일 크기, MIME type, 동영상 제한, 이미지 개수 제한이 서버에서 검증되는가?

### 6.2 필요한 계약

현재 `PUT /api/owner/stores/{storeId}`의 media 배열 교체 정책이 명확하다면 그 계약을 문서화해 주세요. 명확하지 않다면 아래 명시적 API를 권장합니다.

- `DELETE /api/owner/stores/{storeId}/media/{mediaId}`
- `PATCH /api/owner/stores/{storeId}/media/{mediaId}/representative`
- `PATCH /api/owner/stores/{storeId}/media/order`
- `PATCH /api/owner/stores/{storeId}/menus/{menuId}/media/order`

순서 변경 요청 예시:

```json
{
  "items": [
    { "mediaId": 10, "displayOrder": 1 },
    { "mediaId": 11, "displayOrder": 2 }
  ],
  "version": 7
}
```

미디어 응답 필수 필드:

- `id` 또는 `mediaId`
- `mediaType`
- `usageType`
- `fileUrl`
- `originalName`
- `mimeType`
- `fileSizeBytes`
- `displayOrder`
- `createdAt`

## 7. P1 확인 및 요청: 답변 예상 시간과 운영 정책값

프론트에 답변 예상 시간과 운영 기준을 하드코딩하지 않으려면 정책값 API가 있으면 좋습니다.

먼저 확인할 내용:

1. 고객지원 답변 예상 시간, 운영 시간, 휴무일 안내를 내려주는 API가 있는가?
2. Q&A 카테고리, 상태 코드, 반려 사유 코드, 보완 사유 코드가 서버 코드 테이블로 관리되는가?

권장 API:

- `GET /api/support/policies`
- `GET /api/common/codes?groups=qnaCategory,qnaStatus,reviewReason,changeRequestReason`

응답 예시:

```json
{
  "supportHours": "평일 10:00-18:00",
  "qnaExpectedResponse": "보통 1-2영업일 안에 답변합니다.",
  "privateInquiryExpectedResponse": "개인 확인이 필요한 문의는 최대 3영업일이 걸릴 수 있습니다."
}
```

## 8. 공통 응답과 오류 계약

목록 응답은 프론트와 맞춰 아래 형식을 유지해 주세요.

```json
{
  "content": [],
  "page": 0,
  "size": 20,
  "totalElements": 0,
  "totalPages": 0,
  "hasNext": false
}
```

또는 기존 래핑 정책이 있다면 `data.content` 형태를 명확히 공유해 주세요.

오류 응답 권장:

```json
{
  "code": "RESOURCE_NOT_FOUND",
  "message": "요청한 항목을 찾을 수 없습니다.",
  "fieldErrors": []
}
```

필요 오류 코드:

- `AUTH_REQUIRED`
- `FORBIDDEN`
- `RESOURCE_NOT_FOUND`
- `VALIDATION_ERROR`
- `VERSION_CONFLICT`
- `INVALID_STATUS_TRANSITION`
- `QNA_PRIVATE_ACCESS_DENIED`
- `STORE_APPROVAL_BLOCKED`
- `MEDIA_LIMIT_EXCEEDED`
- `UNSUPPORTED_MEDIA_TYPE`

## 9. 프론트 연동 완료 기준

백엔드 완료 후 프론트에서 다음을 확인할 수 있으면 완료로 보겠습니다.

- 공개 Q&A 목록에 비공개 문의가 서버 단계에서 내려오지 않는다.
- 1:1 비공개 문의가 저장되고 관리자 화면에서만 확인된다.
- 답변 저장 후 답변 알림 발송 상태를 확인할 수 있다.
- 로그인 사용자는 본인의 문의 목록과 처리 상태를 조회할 수 있다.
- 입점 신청 상세에서 실제 서버 처리 이력과 보완 요청 항목을 볼 수 있다.
- 승인 버튼 비활성 사유가 서버 응답 기준으로 표시된다.
- 매장 미디어 삭제, 대표 지정, 순서 변경이 낙관적 잠금과 권한 검증을 포함해 동작한다.
- 관리자 알림/작업 큐가 실제 서버 데이터로 표시된다.

## 10. 백엔드에 바로 전달할 요약 문장

현재 프론트에서는 공개 Q&A, 공개 질문 등록, 1:1 비공개 문의 접수 화면을 분리했고, 공개 목록에서 비공개/hidden 문의가 보이지 않도록 방어 로직을 넣었습니다. 다만 실제 운영 완성도를 위해서는 서버에서 공개/비공개 Q&A 필터링, 관리자 전용 Q&A 조회, 내 문의 목록, 답변 알림, 입점 신청 처리 이력/보완 항목, 승인 가능 여부 사유, 미디어 관리 API, 관리자 알림/작업 큐 구현 여부를 먼저 확인해야 합니다. 이미 구현된 항목이 있다면 API 경로와 샘플 응답을 공유해 주시고, 미구현 또는 부분 구현 항목은 이 문서의 우선순위 기준으로 계약을 확정하면 됩니다.
