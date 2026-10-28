# 접시 공개 홈페이지

## 2026-10-28 개편

`/`는 접시 앱의 공개 홍보 홈입니다. 발견 → 기록 → 친구와 공유 → 앱 다운로드 흐름으로 구성했습니다. `feature/61-public-home-redesign`, Issue #61에서 관리합니다.

- 첫 화면: 코랄색 배경의 실제 앱 화면과 App Store·Google Play 바로가기.
- 주요 기능: 맛집 발견·내 주변 지도·나만의 기록을 선택하면 해당 앱 화면과 설명이 전환됩니다. 방향키·Home·End로도 탐색할 수 있습니다.
- 친구와 공유: 콘텐츠를 대화에 보내고 만날 약속으로 이어지는 흐름을 예시 대화로 설명합니다. 실제 대화 캡처가 아니라는 안내를 함께 표시합니다.
- 사용 상황: 주변 탐색, 음식 기록, 친구 공유를 소개합니다.
- 하단: 앱 다운로드, 고객지원, 식당 비즈니스, 로그인·회원가입, 약관·개인정보처리방침, 관리자 진입.

지원·비즈니스·관리자 경로와 인증 동작은 기존 구현을 사용합니다. API·DB 변경은 없습니다. 폐지한 마케팅 운영 기능·추적·자동 게시를 재활성화하지 않습니다.

## 구성과 이미지

- `src/pages/Home.js`, `Home.css`: 공개 홈의 화면 구성과 반응형 스타일. 홈 클래스로 스타일을 제한합니다. `src/styles/readiness.css`의 이전 홈 덮어쓰기는 제거하고 지원·계정 화면 스타일은 유지합니다.
- `src/components/home/HomeExplorer.js`, `HomeExplorer.css`: 접근 가능한 탭과 실제 앱 미리보기.
- `PhonePreview.js`: 첫 화면의 반응형 앱 이미지. `imageFallback.js`는 모든 미리보기에서 원본 대체 처리를 공유합니다.
- `StoreButtons.js`: 스토어 다운로드 링크와 아이콘.
- `HomeIcon.js`: 작은 SVG 아이콘. 외부 아이콘·모션·폰트 라이브러리를 추가하지 않습니다.
- `src/assets/home/app-{home,map,profile}-{400,800}.jpg`: 기존 공개 홈의 실제 원본 PNG에서 생성한 JPEG입니다. 현재 Amplify SPA 재작성 규칙이 WebP 요청을 HTML로 응답하므로 허용된 jpg 형식을 사용합니다. 화면 너비에 맞춰 `srcset`으로 선택합니다. 첫 휴대폰 이미지에만 높은 로딩 우선순위를 부여하고 나머지는 지연 로딩합니다. 기능 탭은 선택한 이미지 한 장만 렌더링합니다.
- 원본 대체 이미지: `public/images/home/KakaoTalk_20260915_211008421_02.png`(홈), `_01.png`(지도), 접미사 없는 `.png`(프로필). 사용자가 제공한 1206×2622 화면입니다. 앱이 업데이트되면 공개 가능한 최신 화면으로 교체합니다.
- `public/images/home/plate-mascot.png`: 기존 접시 캐릭터. `plateApp2/play-console-assets/app-icon-512.png`에서 가져온 자산입니다.
- 공유 예시의 사진은 기존 홈 이미지에 포함된 음식 사진 일부를 CSS로 표시합니다. 새로운 이용자 사진·후기·이용 수치를 만들지 않습니다.
- 기존 AI 음식 이미지 `food-scenes-v1.png`와 이전 `app-home.png`, `app-map.png`는 이 홈에서 사용하지 않습니다.

## 공식 다운로드 링크

`src/config/appDownloads.js`의 기본값을 사용합니다.

- App Store: https://apps.apple.com/kr/app/id6759185760
- Google Play: https://play.google.com/store/apps/details?id=com.plateappnew

배포 환경에서 `REACT_APP_APP_STORE_URL`, `REACT_APP_GOOGLE_PLAY_URL`로 재정의할 수 있습니다. 링크는 새 창으로 열리고 접근성 이름에 이를 안내합니다.

## 반응형·접근성

320px부터 데스크톱까지 대응합니다. 작은 화면에서는 메뉴를 접고, 이미지와 설명을 세로로 배치합니다. 메뉴는 항목 선택·바깥 클릭·Escape로 닫히며 Escape 시 토글 버튼으로 포커스를 돌려줍니다. 본문 건너뛰기와 고정 헤더 아래 섹션 이동을 지원합니다. `prefers-reduced-motion`에서는 등장 애니메이션·전환·부드러운 스크롤을 끕니다. 기능 미리보기는 원본 화면의 비율을 보존합니다.

## 로컬 확인

```sh
npm ci
CI=true npm test -- --watch=false --watchman=false --runInBand src/pages/Home.test.js src/components/HomeNavigation.test.js
npm run test:legal
npm run build
PORT=4196 BROWSER=none npm start
```

브라우저 검증 도구는 로컬 주소만 허용하고 외부 요청·API 변경 요청을 차단합니다. Playwright는 검증 도구로 별도 설치하며 앱 의존성에 추가하지 않습니다.

```sh
PLATE_PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
PLATE_BROWSER_CHANNEL=chrome \
node scripts/home-browser.mjs --base-url http://127.0.0.1:4196 --output /tmp/plate-home-proof
```

검증 대상은 320·390·768·1440px 화면, 이미지 로딩, 가로 넘침, 다운로드 주소, 탭 키보드 조작, 모바일 메뉴, 모션 줄이기, 지원·약관·비즈니스·관리자 경로입니다. 실제 기기의 Safari/Chrome 및 로그인한 관리자 화면은 운영 반영 후 별도로 확인합니다.

## 적용 상태

로컬 구현과 검증을 진행한 변경입니다. 운영 배포 여부는 연결 PR과 Amplify의 `main` 배포 기록으로 확인합니다. 루트 앱 작업 공간 `output/home-redesign-2026-10-28`에 화면·검증 로그·패치를 보관합니다.
