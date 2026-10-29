# 접시 공개 홈페이지

## 2026-10-28 개편

`/`는 접시 앱의 공개 홍보 홈입니다. 발견 → 기록 → 친구와 공유 → 앱 다운로드 흐름으로 구성했습니다. `feature/61-public-home-redesign`, Issue #61에서 관리합니다.

- 첫 화면: 코랄색 배경의 실제 앱 화면과 App Store·Google Play 바로가기.
- 영상 보기: 첫 화면의 `접시 사용 영상 보기`를 누르면 기존 36초 앱 사용 광고가 팝업으로 열립니다. 영상을 보려고 페이지 아래로 이동할 필요가 없습니다.
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

320px부터 데스크톱까지 대응합니다. 작은 화면에서는 메뉴를 접고, 이미지와 설명을 세로로 배치합니다. 메뉴는 항목 선택·바깥 클릭·Escape로 닫히며 Escape 시 토글 버튼으로 포커스를 돌려줍니다. 본문 건너뛰기와 고정 헤더 아래 섹션 이동을 지원합니다. 섹션 이동은 스크롤 애니메이션 없이 즉시 이동합니다. `prefers-reduced-motion`에서는 등장 애니메이션·전환도 끕니다. 기능 미리보기는 원본 화면의 비율을 보존합니다.

## 실제 앱 사용 영상 — Issue #65

`HomeVideoDialog.js`와 별도 CSS가 영상 팝업을 담당합니다. 팝업이 열린 동안만 마운트하므로 첫 화면에서는 영상·포스터·자막을 요청하지 않습니다. 네이티브 `<dialog>`로 배경 접근을 제한하고, 닫기 버튼·Escape·팝업 바깥 클릭으로 닫습니다. 닫거나 다른 경로로 이동하면 재생 정지, 영상 소스 해제, 페이지 스크롤과 버튼 포커스 복원을 수행합니다. 백그라운드로 전환하면 재생을 일시 정지합니다.

영상은 직접 누른 후 재생을 시도하고, 브라우저가 자동 재생을 제한하면 기본 재생 버튼을 사용합니다. 기본 플레이어로 소리·탐색·전체 화면을 조작할 수 있습니다. 다운로드 실패는 재시도로 복구할 수 있고, 한국어 화면 문구 자막은 플레이어에서 선택할 수 있습니다. 원본에 화면 자막이 이미 있으므로 추가 자막은 기본으로 켜지지 않습니다.

- 원본: 앱 저장소 `output/marketing/phone-ad-2026-09-30-v2/final/jeopsi-phone-ad-36s-v2.mp4`. 사용자가 이번 홈에 사용하도록 지정한 기존 제작물입니다. 원본 편집·문구·BGM은 보존했습니다.
- 웹 영상: `public/media/jeopsi-demo-36s-v1.mp4`, 36초, 720×1280, H.264 30fps, AAC, 7,230,520바이트. 원본 33,344,829바이트 대비 78.3% 줄였습니다. 첫 재생을 위한 메타데이터가 파일 앞에 있습니다(fast start).
- 포스터: `public/media/jeopsi-demo-poster-v1.jpg`, 영상 5초 지점, 540×960.
- 선택 자막: `public/media/jeopsi-demo-ko-v1.vtt`, 원본 타임라인과 같은 11개 구간. 음성 내레이션은 없습니다.
- 영상 SHA-256: `ca00b107e945539285e9c62806d44fa91b31a13987da777f5b8d4aef176cf305`.
- 원본 SHA-256: `d36b90633dd9c3e090bc0f134dc149d00a04c775a56fe00cbb8408b490a9f599`.

### Amplify 배포 조건

AWS Amplify 콘솔 → 해당 웹 앱 → 호스팅 → 다시 쓰기 및 리디렉션에서, SPA 요청을 `/index.html`로 보내는 정규식의 확장자 제외 목록에 `mp4|vtt`를 추가해야 합니다. 기존 확장자·다른 규칙·순서는 보존합니다. 예를 들어 현재 목록이 아래와 같다면 다음처럼 변경합니다.

```text
(css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json)
→ (css|gif|ico|jpg|js|png|txt|svg|woff|ttf|map|json|mp4|vtt)
```

대상 `/index.html`과 상태 `200`은 유지합니다. 이 설정은 저장소의 빌드 설정이나 HTTP 헤더 설정으로 대체할 수 없습니다. 운영에서는 파일 존재 여부뿐 아니라 MP4 응답이 HTML이 아닌지, `Content-Type: video/mp4`, 바이트 범위 요청 `206`, 브라우저 실제 재생·탐색까지 확인해야 합니다. 자막은 `text/vtt`, 포스터는 `image/jpeg`로 응답해야 합니다. 자산을 바꾸면 버전 파일명도 변경해 오래된 CDN 캐시와 구분합니다.

## 로컬 확인

```sh
npm ci
CI=true npm test -- --watch=false --watchman=false --runInBand src/pages/Home.test.js src/components/HomeNavigation.test.js src/components/home/HomeVideoDialog.test.js
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

영상 팝업 검증은 같은 환경 변수로 `scripts/home-promo-browser.mjs`를 실행합니다. 첫 방문의 영상 요청 없음, 버튼 진입, 재생·탐색·오디오 디코딩, 자막, 닫기·Escape·바깥 클릭, 스크롤·포커스 복원, 재진입 초기화, 실패·재시도와 작은 화면/가로 화면을 확인합니다. 정적 로컬 서버도 MP4/VTT의 MIME과 바이트 범위 요청을 지원해야 실제 배포와 같은 동작을 검증할 수 있습니다.

## 적용 상태

로컬 구현과 검증을 진행한 변경입니다. 운영 배포 여부는 연결 PR과 Amplify의 `main` 배포 기록으로 확인합니다. 루트 앱 작업 공간 `output/home-redesign-2026-10-28`에 화면·검증 로그·패치를 보관합니다.
