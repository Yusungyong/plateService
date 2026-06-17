# 식당 관리자 소유권 서버 작업 요청서

작성일: 2026-06-17  
대상: 접시 백엔드, DB 담당자  
프론트 기준 브랜치 상태: `/business/**` 화면은 owner API와 비즈니스 권한을 기대하도록 분리 시작

## 1. 목적

식당 관리자와 사이트 운영자 권한을 분리한다.

- 사이트 운영자: `/api/admin/**`, `ADMIN_ACCESS`와 세부 관리자 권한 사용
- 식당 관리자: `/api/owner/**`, 로그인 사용자와 `store_owners` 소유권 사용
- 식당 관리자는 `/api/admin/**`에 접근하지 않는다.
- 사이트 운영자는 기본적으로 `/api/owner/**`에 접근하지 않는다. 운영자 대리 작업이 필요하면 별도 impersonation 정책을 후속 설계한다.

## 2. 현재 프론트 변경 사항

프론트 비즈니스 화면은 다음 서버 API를 호출한다.

```http
GET    /api/owner/stores
GET    /api/owner/stores/{storeId}
POST   /api/owner/stores
PUT    /api/owner/stores/{storeId}
DELETE /api/owner/stores/{storeId}
POST   /api/owner/files
```

프론트는 JWT에서 아래 중 하나가 있으면 비즈니스 사용자로 판단한다.

```text
role: OWNER | STORE_OWNER | RESTAURANT_OWNER | BUSINESS_OWNER
permission: OWNER_ACCESS | STORE_OWNER_ACCESS | RESTAURANT_MANAGE
```

초기 호환을 위해 `RESTAURANT_MANAGE`도 허용하지만, 장기적으로는 owner 전용 권한명인 `OWNER_ACCESS` 또는 `STORE_OWNER_ACCESS`를 권장한다.

## 3. DB 작업

이미 관리자 P0 migration에 `store_owners` 테이블이 정의되어 있다.

```text
store_owners
- id
- store_id
- user_id
- owner_role
- created_at
- revoked_at
```

백엔드는 이 테이블을 실제 코드에 연결해야 한다.

필수 작업:

- `StoreOwner` 엔티티 추가
- `StoreOwnerRepository` 추가
- `exists active owner by storeId and userId` 조회 추가
- `revoked_at is null` 조건을 모든 소유권 검증에 적용
- `owner_role` 초기값은 `OWNER`

## 4. 승인 플로우 보강

관리자가 입점 신청을 승인할 때 현재는 운영 매장만 생성된다. 승인 트랜잭션 안에서 아래 작업을 추가해야 한다.

1. `restaurants`에 `draft` 매장 생성
2. 신청 카테고리, 메뉴 복사
3. `store_applications.store_id` 연결
4. `store_owners`에 신청자 소유권 생성
   - `store_id`: 생성된 운영 매장 ID
   - `user_id`: `store_applications.applicant_user_id`
   - `owner_role`: `OWNER`
5. 감사 로그와 outbox 저장

위 작업은 하나의 DB transaction으로 묶는다.

## 5. Owner API 권한 정책

모든 `/api/owner/**` API는 인증이 필요하다.

공통 규칙:

- JWT `sub`로 `fp_100.username` 조회
- `fp_100.user_id` 확인
- 대상 `storeId`가 있는 API는 `store_owners.store_id + user_id + revoked_at is null` 확인
- 소유권이 없으면 `403 AUTH_403`
- 미인증이면 `401 AUTH_401`

목록 API:

```http
GET /api/owner/stores?page=0&size=20&keyword=&category=&exposureStatus=
```

응답은 로그인 사용자가 소유한 매장만 포함한다.

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1,
        "title": "플레이팅 키친 강남점",
        "address": "서울 강남구 테헤란로 123",
        "categories": ["한식", "카페"],
        "exposureStatus": "draft",
        "representativeImageUrl": "https://cdn.example.com/store.jpg",
        "menuCount": 3,
        "updatedAt": "2026-06-17T02:00:00Z"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 1,
    "totalPages": 1,
    "hasNext": false
  }
}
```

상세, 생성, 수정, 삭제 payload는 기존 `SERVER_RESTAURANT_CRUD_GUIDE.md`의 식당 CRUD DTO와 동일하게 유지한다.

## 6. 파일 업로드

```http
POST /api/owner/files
Content-Type: multipart/form-data
```

응답:

```json
{
  "success": true,
  "data": {
    "fileUrl": "https://cdn.example.com/restaurants/2026/06/file.jpg",
    "originalName": "file.jpg",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 123456
  }
}
```

서버는 이미지/동영상 MIME type, 파일 크기, 확장자를 검증한다.

## 7. 테스트 완료 조건

- 입점 승인 시 `store_owners`가 생성된다.
- 식당 관리자는 본인 매장 목록만 조회한다.
- 식당 관리자는 본인 매장 상세/수정/삭제 가능하다.
- 식당 관리자가 다른 매장 접근 시 `403`이다.
- 일반 로그인 사용자가 `/api/owner/stores` 접근 시 소유 매장이 없으면 빈 목록 또는 `403` 중 정책을 정한다. 프론트는 빈 목록을 권장한다.
- 사이트 운영자 권한만 있는 사용자는 `/api/owner/stores/{storeId}` 수정이 불가하다.
- 식당 관리자 권한만 있는 사용자는 `/api/admin/**` 접근 시 `403`이다.

## 8. 프론트 연동 메모

서버 구현 전까지 `/business/**` 화면은 실제 데이터 조회에 실패할 수 있다. 이 실패는 의도된 상태이며, owner API가 준비되면 별도 프론트 라우트 변경 없이 연결된다.
