# 운영 메뉴 조치 · 2026-10-13

Related admin: Yusungyong/plateService#39. Backend: Yusungyong/plateAppServer#154.

기존 운영 기능에 실제 버튼·입력 조치를 연결한다. 로컬 서버 clean verify와 웹 테스트·production build를 통과했다. 이 문서 작성 시점에는 새 변경을 운영에 배포하지 않았다. 기존 V48 운영 관리 배포와 이번 신규 조치 작업을 구분한다. DB 신규 마이그레이션은 없다.

## 신규 계약

응답은 `ApiResponse<T>`이며 개인정보 및 조치 응답은 `Cache-Control: no-store, private`다. 인증은 기존 JWT, 권한은 서버가 독립 검사한다.

| 메서드·경로 | 입력 | 성공 data | 권한 |
| --- | --- | --- | --- |
| GET `/api/admin/member-monitoring/members` | keyword 선택, limit 1~50/기본20 | 회원 배열 | MEMBER_MONITORING_READ |
| GET `/api/admin/member-monitoring/members/{username}` | username | member, reports30d, imagePosts30d, videoPosts30d, recentChanges 최대10 | MEMBER_MONITORING_READ |
| POST `/api/admin/member-monitoring/members/{username}/revoke-sessions` | reason 10~1000자, expectedTokenVersion>=0 | tokenVersion, endedSessions, invalidatedPushTokens | MEMBER_MONITORING_READ + ADMIN_ACCOUNT_MANAGE |
| GET `/api/admin/operations/reviews` | scope, target 기본menu/1~100자 | 최근 점검 배열 최대20 | 정확한 su12ng subject + DASHBOARD_READ |
| POST `/api/admin/operations/reviews` | scope, target 1~100자, status, reason 10~1000자 | recorded:true | 정확한 su12ng + DASHBOARD_READ + SETTING_MANAGE |

예: 세션 종료 `{"reason":"이상 로그인 검토에 따른 세션 종료입니다.","expectedTokenVersion":3}`.
예: 점검 `{"scope":"MEMBERS","target":"alice","status":"FOLLOW_UP","reason":"최근 활동을 검토한 뒤 추가 확인이 필요합니다."}`.

scope: OPERATIONS, INCIDENTS, RELEASES, DASHBOARD, API_REGISTRY, APPROVALS, STORES, FEEDS, SEASONAL, FAQ, QNA, MEMBERS.
status: FOLLOW_UP, VERIFIED. 기록은 기존 admin_audit_logs에 보관한다. 100자를 초과하는 API 식별자는 짧은 점검 대상명을 직접 입력한다. 점검 완료는 운영자의 확인 기록이며 실제 오류 해결·자동 수집 정상·기능 검증 성공을 의미하지 않는다.

회원 검색은 연락처·비밀번호·토큰·원본 프로필 변경 값을 응답하지 않는다. 탈퇴 중 회원을 제외하며 검색의 %/_는 와일드카드로 취급하지 않는다. 회원의 role은 정규화된 문자열이며 createdAt/nickname은 null일 수 있다. recentChanges의 changeType/at도 null일 수 있다. 유효 세션 수는 만료되지 않은 refresh 행 기준이다.

세션 종료는 계정 삭제 전역 fence·대상 행 lock·예상 버전 검증 후 token_version 증가, 모든 refresh 행 삭제, 대상 ACTIVE 푸시 등록 INVALID 전환, 감사 기록을 같은 트랜잭션에서 수행한다. 과거 access/refresh 토큰은 기존 인증 검증에서 무효다. 신규 로그인 금지/계정 영구 정지 기능은 아니다. 본인·su12ng·운영 역할·활성 명시 권한·탈퇴 중 계정은 거부한다. 운영 회원에게 실제 조치를 실행해 테스트하지 않는다.

오류: 400 입력/enum/범위 오류, 401 미인증, 403 권한·보호 계정, 404 대상 없음/탈퇴 중, 409 예상 tokenVersion 불일치. 저장 결과를 확인하지 못하면 상세를 다시 조회하고 최신 버전으로 판단한다. 같은 종료 요청을 재시도해도 이전 버전은409다. 일반 점검 메모는 추가 이력이며 HTTP 수준 중복 저장을 자동 합치지 않는다.

## 기존 메뉴 검증·수정

- 회원 모니터링과 FAQ 화면의 접근 권한을 각 서버의 MEMBER_MONITORING_READ, FAQ_MANAGE에 맞춘다. 기존 OPERATOR의 SUPPORT_MANAGE만으로 두 메뉴가 열리지 않는다.
- 회원 지표의 '권한 변경 대기'는 실제 최근24시간 변경 이력으로 표기한다. 승인 대기 큐가 없다. '오늘' 가입일·로그인 실패 구간은 서울 날짜를 기준으로 쿼리한다. 기존 모니터링 응답에도 no-store를 추가한다.
- 대시보드의 activeStores는 해당 기간에 updated_at이 변경된 매장 수다. 와이어 필드를 유지하면서 '변경된 매장'으로 이름을 고친다. 날짜 범위를 전체 조회 API에서 최대93일로 제한한다.
- 피드 관리 화면은 기존 `/api/admin/feeds` 사진 피드 API를 사용한다. 영상 관리가 구현된 것처럼 표시하지 않는다. 작성자·본문·제목·식당 검색을 제공한다. 서버의 추천 변경은 FEED_FEATURE, 신고 상세는 FEED_READ + REPORT_READ, 숨김/복원은 FEED_MODERATE다. 사유 및 optimistic version을 유지한다. 기존 FEED_MODERATE만 있고 FEED_FEATURE가 없는 명시 권한 계정의 추천 변경은403이다.
- 대시보드 활동 목록에 점검·피드·세션 조치의 한국어 라벨을 추가한다. 신규 서비스의 명령/조회 계약과 API 카탈로그에 추가5경로를 반영한다(서비스포트81).

## 사용자 검증

관리자 로그인 → 회원 모니터링 → 테스트 회원 검색 → 확인 → 전체 세션 종료 → 사유 입력 → 종료하기. 기존 테스트 로그인 요청이401인지 확인하고 다시 로그인 가능한지 확인한다. 운영 권한 계정과 본인은 종료 버튼이 없어야 한다.

피드 관리 → 테스트 사진 피드 검토 → 숨김 → 사유 → 조치 저장 → 상태와 버전 갱신 → 복원. 두 운영자가 같은 버전으로 처리하면 두 번째는409이며 최신 상태를 다시 확인한다. 조회 전용 계정에 조치 버튼이 보이지 않아야 한다.

모든 운영 메뉴 상단 → 운영 점검 기록 → 대상/점검 결과/10자 이상 내용 → 저장 → 새로 조회·재진입. 다른 메뉴·대상에는 섞이지 않아야 한다. 미로그인/다른 관리자 계정은 su12ng 도구를 사용할 수 없다. 이 기록으로 기존 API 오류 수치나 회원·게시물 상태가 바뀌면 안 된다.

대시보드 → 기간 조회 → 이전/다음 활동. 회원 모니터링 일부 API 실패 시 다른 영역이 유지되며 실패 영역을 '없음'으로 표시하면 안 된다. FAQ·Q&A·심사·제철 음식·매장·배포 기능은 기존 저장·권한 회귀로 확인한다.

## 로컬 검증 결과

서버 clean verify: 총1055개 중1053개 통과, FFmpeg 실행 파일이 없는 로컬 환경에서 기존2개 건너뜀. 신규 회원/점검의 실제 PostgreSQL7개, 직접 권한2개, HTTP/JWT4개 통과. 실제 이전/호환 JAR10개 회귀 포함. CI에서는 FFmpeg를 설치하고 해당 검증을 필수로 실행한다. 웹 테스트278개, 공개 법적 페이지13개 및 production build 통과. 실제 Chrome 격리 API에서12개 메뉴·점검 저장12개 및 회원 세션 종료1개/피드 숨김·복원·추천3개, 데스크톱1440px/모바일390px 가로 넘침·JS오류 없음. 운영 데이터에 실제 조치하지 않았다.
