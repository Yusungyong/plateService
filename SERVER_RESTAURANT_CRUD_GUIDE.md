# 식당 등록 관리자 CRUD 서버 구현 가이드

작성일: 2026-05-21  
전제 SQL: `db/restaurant_registration_schema.sql`

## 1. 대상 테이블

관리자 식당 등록 화면은 아래 4개 테이블을 사용합니다.

```text
restaurants
restaurant_categories
restaurant_menus
restaurant_media
```

관계는 다음과 같습니다.

```text
restaurants 1 : N restaurant_categories
restaurants 1 : N restaurant_menus
restaurants 1 : N restaurant_media
restaurant_menus 1 : N restaurant_media
```

`restaurant_media.menu_id`가 `NULL`이면 식당 대표 이미지/동영상이고, 값이 있으면 특정 메뉴의 이미지/동영상입니다.

## 2. 권장 API 목록

관리자 페이지 기준으로 최소 필요한 API는 아래입니다.

```http
GET    /api/admin/restaurants
GET    /api/admin/restaurants/{restaurantId}
POST   /api/admin/restaurants
PUT    /api/admin/restaurants/{restaurantId}
DELETE /api/admin/restaurants/{restaurantId}
POST   /api/admin/files
```

파일을 식당 저장 API와 함께 `multipart/form-data`로 받을 수도 있지만, 구현과 장애 처리가 단순한 방식은 `POST /api/admin/files`로 먼저 파일을 업로드하고, 식당 저장 API에는 `fileUrl` 또는 `fileId`만 넘기는 방식입니다.

## 3. 파일 업로드 API

### 요청

```http
POST /api/admin/files
Content-Type: multipart/form-data
```

필드:

```text
file: 이미지 또는 동영상 파일
```

### 응답

```json
{
  "data": {
    "fileUrl": "https://cdn.example.com/restaurants/2026/05/file.jpg",
    "originalName": "file.jpg",
    "mimeType": "image/jpeg",
    "fileSizeBytes": 123456
  }
}
```

서버는 이미지/동영상 MIME type, 파일 크기 제한, 확장자 제한을 검증해야 합니다.

## 4. 식당 생성 API

### 요청

```http
POST /api/admin/restaurants
Content-Type: application/json
```

```json
{
  "title": "플레이팅 키친 강남점",
  "address": "서울 강남구 테헤란로 123",
  "phone": "02-1234-5678",
  "businessHours": "매일 11:00 - 22:00",
  "introduction": "식당 소개 문구",
  "exposureStatus": "draft",
  "categories": ["한식", "카페"],
  "media": [
    {
      "mediaType": "image",
      "usageType": "representative",
      "fileUrl": "https://cdn.example.com/restaurant-main.jpg",
      "originalName": "restaurant-main.jpg",
      "mimeType": "image/jpeg",
      "fileSizeBytes": 123456,
      "displayOrder": 0
    },
    {
      "mediaType": "video",
      "usageType": "representative",
      "fileUrl": "https://cdn.example.com/restaurant-main.mp4",
      "originalName": "restaurant-main.mp4",
      "mimeType": "video/mp4",
      "fileSizeBytes": 4567890,
      "displayOrder": 1
    }
  ],
  "menus": [
    {
      "name": "시그니처 파스타",
      "price": 18000,
      "description": "대표 메뉴 설명",
      "displayOrder": 0,
      "media": [
        {
          "mediaType": "image",
          "usageType": "menu",
          "fileUrl": "https://cdn.example.com/menu.jpg",
          "originalName": "menu.jpg",
          "mimeType": "image/jpeg",
          "fileSizeBytes": 123456,
          "displayOrder": 0
        }
      ]
    }
  ]
}
```

### 처리 순서

하나의 DB transaction 안에서 처리합니다.

1. `restaurants` insert
2. `restaurant_categories` bulk insert
3. 대표 이미지/동영상은 `restaurant_media`에 `menu_id = NULL`, `usage_type = 'representative'`로 insert
4. `restaurant_menus` insert
5. 메뉴별 이미지/동영상은 `restaurant_media`에 `menu_id = 생성된 메뉴 id`, `usage_type = 'menu'`로 insert
6. commit

중간에 실패하면 rollback합니다.

### 응답

```json
{
  "data": {
    "restaurantId": 1
  }
}
```

## 5. 식당 상세 조회 API

### 요청

```http
GET /api/admin/restaurants/{restaurantId}
```

### 응답

```json
{
  "data": {
    "id": 1,
    "title": "플레이팅 키친 강남점",
    "address": "서울 강남구 테헤란로 123",
    "phone": "02-1234-5678",
    "businessHours": "매일 11:00 - 22:00",
    "introduction": "식당 소개 문구",
    "exposureStatus": "draft",
    "categories": ["한식", "카페"],
    "media": [
      {
        "id": 10,
        "mediaType": "image",
        "usageType": "representative",
        "fileUrl": "https://cdn.example.com/restaurant-main.jpg",
        "originalName": "restaurant-main.jpg",
        "mimeType": "image/jpeg",
        "fileSizeBytes": 123456,
        "displayOrder": 0
      }
    ],
    "menus": [
      {
        "id": 100,
        "name": "시그니처 파스타",
        "price": 18000,
        "description": "대표 메뉴 설명",
        "displayOrder": 0,
        "media": [
          {
            "id": 20,
            "mediaType": "image",
            "usageType": "menu",
            "fileUrl": "https://cdn.example.com/menu.jpg",
            "originalName": "menu.jpg",
            "mimeType": "image/jpeg",
            "fileSizeBytes": 123456,
            "displayOrder": 0
          }
        ]
      }
    ],
    "createdAt": "2026-05-21T10:00:00Z",
    "updatedAt": "2026-05-21T10:00:00Z"
  }
}
```

## 6. 식당 목록 조회 API

### 요청

```http
GET /api/admin/restaurants?page=0&size=20&keyword=강남&category=한식&exposureStatus=draft
```

### 응답

```json
{
  "content": [
    {
      "id": 1,
      "title": "플레이팅 키친 강남점",
      "address": "서울 강남구 테헤란로 123",
      "categories": ["한식", "카페"],
      "exposureStatus": "draft",
      "representativeImageUrl": "https://cdn.example.com/restaurant-main.jpg",
      "menuCount": 3,
      "updatedAt": "2026-05-21T10:00:00Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1,
  "totalPages": 1,
  "hasNext": false
}
```

목록 조회에서는 모든 메뉴/미디어를 다 내려주지 말고, 대표 이미지와 메뉴 개수 정도만 내려주는 편이 좋습니다.

## 7. 식당 수정 API

### 요청

```http
PUT /api/admin/restaurants/{restaurantId}
Content-Type: application/json
```

요청 body는 생성 API와 동일한 형태를 사용합니다.

### 처리 방식

가장 단순한 방식은 transaction 안에서 하위 데이터를 재구성하는 것입니다.

1. `restaurants` update
2. 기존 `restaurant_categories` delete 후 재insert
3. 기존 `restaurant_media` 중 대표 미디어 delete 후 재insert
4. 기존 `restaurant_menus`와 메뉴 미디어를 요청 body 기준으로 upsert 또는 delete/reinsert

초기 구현에서는 메뉴 전체 delete/reinsert도 가능하지만, 메뉴 ID를 유지해야 하거나 변경 이력이 필요하면 upsert 방식을 권장합니다.

### 응답

```json
{
  "data": {
    "restaurantId": 1
  }
}
```

## 8. 식당 삭제 API

### 요청

```http
DELETE /api/admin/restaurants/{restaurantId}
```

`restaurant_categories`, `restaurant_menus`, `restaurant_media`는 FK `ON DELETE CASCADE`로 삭제됩니다.

파일 저장소의 실제 파일은 DB transaction과 별도로 정리해야 합니다. 실무에서는 즉시 삭제보다 삭제 대상 파일을 큐에 넣고 비동기로 삭제하는 방식이 안전합니다.

### 응답

```json
{
  "data": {
    "deleted": true
  }
}
```

## 9. 검증 규칙

서버에서 최소한 아래 검증을 수행합니다.

- `title`: 필수, 150자 이하
- `address`: 필수, 300자 이하
- `categories`: 1개 이상, 4개 이하
- `exposureStatus`: `draft`, `review`, `published` 중 하나
- `menus[].name`: 메뉴가 전달된 경우 필수
- `menus[].price`: 숫자, 0 이상
- `media[].mediaType`: `image`, `video` 중 하나
- 대표 미디어: `usageType = representative`, `menuId = null`
- 메뉴 미디어: `usageType = menu`, `menuId` 필요

## 10. 권한

이 API는 관리자 또는 식당 등록 권한이 있는 사용자만 호출할 수 있어야 합니다.

권장 permission:

```text
RESTAURANT_MANAGE
```

관리자 전체 권한을 이미 쓰고 있다면 아래 둘 중 하나를 허용하면 됩니다.

```text
ADMIN_ACCESS
RESTAURANT_MANAGE
```

프론트 메뉴가 비로그인에도 보이더라도, 실제 등록/수정/삭제 API는 서버에서 반드시 권한을 확인해야 합니다.

## 11. SQL 실행

서버 DB에 테이블을 만들 때 아래 파일을 실행합니다.

```bash
psql -h <host> -U <user> -d <database> -f db/restaurant_registration_schema.sql
```

마이그레이션 도구를 쓴다면 해당 SQL을 Flyway 또는 Liquibase migration 파일로 옮겨 적용하면 됩니다.
