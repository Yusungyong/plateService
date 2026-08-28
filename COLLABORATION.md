# Plate 관리자·사용자·백엔드 협업 가이드

이 저장소는 Plate 관리자 프론트엔드 작업의 기준점이다. 작업 상태와 코드 변경은 GitHub에서 관리하고,
별도 문서 도구에는 장기 보관이 필요한 기획·정책·회의 결정만 기록한다.

이 문서는 백엔드 저장소 `Yusungyong/plateAppServer`의 `COLLABORATION.md`에 정의된 상태,
라벨, 브랜치 및 Issue 연결 규칙을 관리자 프론트엔드까지 확장한다.

## 저장소 구성과 Issue 등록 기준

- 관리자 화면 문제: [Yusungyong/plateService](https://github.com/Yusungyong/plateService)
- 사용자 앱 화면 문제: [Yusungyong/plateApp2](https://github.com/Yusungyong/plateApp2)
- API, DB, 인증, 배포 문제: [Yusungyong/plateAppServer](https://github.com/Yusungyong/plateAppServer)
- 기본 브랜치: 세 저장소 모두 `main`

여러 저장소가 관련된 작업은 저장소별 책임 범위에 맞춰 각각 Issue를 만들고, 각 Issue와 관련 PR을
서로 링크한다. 한 저장소의 Issue만으로 다른 저장소의 작업까지 대신 관리하지 않는다.

## 저장소 접근 원칙

- 이 저장소에서 작업할 때 `plateApp2`와 `plateAppServer`는 기본적으로 읽기 전용으로 다룬다.
- 사용자가 명시적으로 요청하기 전에는 다른 저장소의 코드 수정, 커밋, 푸시, Issue 종료를 하지 않는다.
- 다른 저장소의 쓰기 작업이 필요하면 대상 저장소와 작업 범위를 먼저 확인한다.
- 인증정보나 토큰은 소스, 문서, 커밋, Issue 또는 PR에 기록하지 않는다.

## 기본 원칙

- 구현할 작업은 먼저 담당 저장소의 GitHub Issue로 만든다.
- API 계약이 바뀌면 구현 전에 요청·응답과 호환성 영향을 백엔드 Issue에 적는다.
- 작업 브랜치와 Pull Request는 관련 Issue를 연결한다.
- 프론트엔드가 연동을 시작할 수 있는 시점에 백엔드 Issue 또는 PR에 `frontend-ready` 라벨을 붙인다.
- API 변경과 관련 문서 변경은 같은 PR에 포함한다.

## 권장 작업 흐름

1. 문제의 책임 범위에 따라 담당 저장소에 Issue를 생성한다.
2. 여러 저장소가 관련되면 각 저장소에 후속 Issue를 만들고 상호 링크한다.
3. Issue에 목적, 영향 범위, 완료 조건을 작성한다. API 작업이면 엔드포인트와 요청·응답 예시도 포함한다.
4. `feature/<issue-number>-<summary>` 또는 `fix/<issue-number>-<summary>` 브랜치에서 작업한다.
5. 구현 초기에 Draft PR을 열고 Issue를 연결한다.
6. API 계약이 확정되면 백엔드 Issue 또는 PR에 `frontend-ready`를 붙인다.
7. 테스트, 문서, 저장소 간 연동 확인이 끝나면 PR을 병합하고 담당 Issue를 닫는다.

## API 변경 시 반드시 공유할 내용

- HTTP 메서드와 경로
- 인증 필요 여부
- Path, Query, Body 파라미터
- 성공 응답 예시
- 오류 코드와 오류 응답 예시
- nullable 또는 optional 필드
- 필드 추가·변경·삭제 내역
- 기존 관리자 및 사용자 프론트와의 호환 여부
- 적용 환경과 배포 상태
- 각 프론트엔드에서 확인할 테스트 시나리오

## 상태와 라벨

공통 GitHub Project의 권장 상태는 다음과 같다.

- `Todo`: 아직 시작하지 않음
- `In Progress`: 구현 중
- `Review`: 검토 또는 연동 확인 중
- `Done`: 배포·연동 확인 완료

세 저장소에서 함께 사용할 권장 라벨은 다음과 같다.

- `backend`: 백엔드 구현 작업
- `frontend`: 프론트엔드 구현 작업
- `api-change`: API 계약 변경
- `breaking-change`: 기존 연동을 깨뜨리는 변경
- `frontend-ready`: 프론트 연동을 시작할 수 있음
- `blocked`: 다른 작업이나 결정에 막힘
- `needs-spec`: 요구사항 또는 API 계약 보완 필요

관리자와 사용자 프론트엔드 작업을 구분할 필요가 있으면 Issue 제목과 본문의 저장소 링크로 구분하고,
공통 라벨 명칭은 위 목록을 유지한다.

## Issue 연결 예시

관리자 프론트 Issue:

```md
Backend API: Yusungyong/plateAppServer#45
User app: Yusungyong/plateApp2#123
```

사용자 프론트 Issue:

```md
Backend API: Yusungyong/plateAppServer#45
Admin frontend: Yusungyong/plateService#67
```

백엔드 Issue:

```md
Related admin frontend: Yusungyong/plateService#67
Related user frontend: Yusungyong/plateApp2#123
```

PR 본문에서 `Closes #67`처럼 같은 저장소의 Issue를 연결하면 PR 병합 시 해당 Issue가 자동으로 닫힌다.
다른 저장소의 Issue는 상호 링크를 유지하고, 해당 저장소의 완료 조건을 확인한 뒤 별도로 닫는다.

## 완료 기준

- 구현과 자동 테스트가 완료되었다.
- API 요청·응답 예시가 최신 상태다.
- 관리자 및 사용자 프론트 영향과 호환성 여부가 명시되었다.
- 필요한 다른 저장소의 Issue와 PR이 연결되었다.
- 배포 또는 적용 환경이 기록되었다.
- 저장소 간 연동 확인이 끝났거나 후속 작업이 명확히 등록되었다.

## 비밀정보 관리

- `.env`, PEM 키, GitHub 토큰, AWS 키, DB 접속정보 등 비밀정보를 Git에 추가하지 않는다.
- 공개 가능한 환경별 URL처럼 의도적으로 추적하는 설정 외에는 `.env*` 파일을 커밋하지 않는다.
- 비밀값은 로컬 환경 변수 또는 승인된 비밀 저장소에서 주입한다.
- 비밀정보가 커밋된 경우 값을 즉시 폐기·재발급하고, 이력 정리는 별도 승인 후 진행한다.

## GitHub 최초 설정

1. 개인 계정의 GitHub Project에 세 저장소의 Issue와 PR을 추가한다.
2. Project 상태를 `Todo`, `In Progress`, `Review`, `Done`으로 구성한다.
3. 세 저장소에 위 공통 라벨을 생성한다.
4. 가능하면 새 Issue와 PR이 Project에 자동 추가되도록 워크플로를 설정한다.
