# 소스·설정으로 확인한 약관 기초 사실

> 후속 정책 안내(2026-09-15): 이 문서는 당시 조사·계약 검토 기록입니다. 30일 탈퇴 복구, 비회원 위치 허용 및 최신 보관 정책은 [운영 정책 통합본](operating-policy-2026-09-15.md)을 따릅니다. 과거 제안의 수용 여부와 현 구현 완료 여부를 구분하세요.


갱신: 2026-09-14. 연령 정책은 운영자 확정, 코드 동작은 소스 확인, 인프라 현황은 백엔드가 제공한 읽기 전용 점검 결과를 구분합니다. 이 문서는 미게시 검토 자료이며 보관기간 승인이나 삭제 완료 증명은 아닙니다.

## 기준

- 운영자 결정: 최소 가입 연령 **만 15세 이상**. 이전 12세 검토안을 대체합니다. 일반·소셜·웹·구버전 가입에서 검증하는 기능은 별도 구현·검증 전입니다. 과거 회원의 연령을 추정하거나 확인 완료로 기록하지 않습니다.
- 서버 소스 기준: `cdd1f308ebb120c40247c32c4bc52661809a5c07`. [ProfileService 원문](https://github.com/Yusungyong/plateAppServer/blob/cdd1f308ebb120c40247c32c4bc52661809a5c07/src/main/java/com/plateapp/plate_main/profile/service/ProfileService.java)의 탈퇴 메서드·스냅샷·참조 연결 해제를 이번에 재확인했습니다.
- 그 밖의 서버 항목과 운영 설정은 [백엔드 고정 회신 B02/B04/B05](https://github.com/Yusungyong/plateAppServer/blob/ad03985b4de14c15ce605500e1bc6b9e3f4a680c/docs/legal/backend-release-response-2026-09-14.md)의 조사 결과입니다. 그 문서가 연결한 2026-09-14 운영 읽기 전용 점검에 근거하며 이번에 콘솔·DB를 직접 검사한 것은 아닙니다.
- [PR #37](https://github.com/Yusungyong/plateAppServer/pull/37) 조회 당시 head `262dcba`는 기반 로직 단계이며 실제 신규 API·영속 원장·삭제 작업·기기 처리에 연결되지 않았습니다.
- 앱은 현재 로컬 소스 확인. 이번 턴 이전의 미커밋 프로필 표시·로컬 기본 아바타 수정도 존재하므로 운영 설치본과 구분합니다.

## 보관·삭제 조사 결과

| 데이터 | 확인한 동작·수치 | 아직 채울 수 없는 것 |
| --- | --- | --- |
| 계정·갱신 토큰·소셜 연결 | ProfileService가 계정과 username별 갱신 토큰을 삭제. 소셜 탈퇴는 userId별 소셜 매핑도 삭제 | 전체 세션 무효화 실측·연관 DB/FK·백업의 최종 삭제 시점 |
| 프로필 사진 | 탈퇴 시 S3 URL 삭제 호출 | 성공/실패 복구, CDN 및 변환본 잔존 |
| 탈퇴 이력 | 삭제 직전 username/email/phone/role/activeRegion/profileImageUrl/nickname/code/isPrivate를 before 스냅샷에 기록. after/memo에 탈퇴 사유도 기록 가능 | 이력 보관 목적·승인 기간·만료 정리. 계정 삭제를 이력 삭제로 표시 불가 |
| 댓글·시청 | userId 참조를 null로 바꾸는 repository 호출 | 본문/그 밖의 식별자 파기. 연결 해제는 전체 삭제 아님 |
| 영상·이미지·레시피·관계·전체 미디어 | 조사한 계정 탈퇴 서비스에 일괄 정리 루틴 없음. 백엔드도 전체 소유 파일 삭제·재시도 미완료로 회신 | 실제 전체 잔존표·삭제 작업 구현·완료 기한 |
| 소셜 가입 임시 세션 | 만료/consumedAt 기록은 존재한다는 백엔드 회신 | 만료된 원시 profile·email·signupToken 행 삭제 실행 |
| 문의 연락처 | service_feedback.contact의 기본 90일 후 purgeAt, 매일 UTC 03:30 정리 코드, 해당 설정 override 없음이라는 회신 | 90일의 목적 적정성·운영 승인, 실제 배치 실행 및 기산점 상세. 문의 본문·첨부·신고 전체에 90일 적용 금지 |
| 홈 원시 요청·추천 | fp_377에 actor key·검색어·좌표 저장. cursor 15분, context는 cursor 만료+96시간 규모, snapshot/served item cleanup과 원시 request 삭제는 별개 | 원시 위치/요청 행·집계의 승인 기간·실제 파기 |
| 푸시·알림 | FCM 활성 및 fp_24 토큰 경로. 탈퇴 서비스에 해당 테이블 명시 삭제는 미확인 | 대기 발송 취소·토큰·알림 기록 삭제 시점 |
| 로그·DB 백업·CDN | RDS AccessDenied, CloudFront 조회 실패. journal 14일은 제안과 실제 적용 구분 | 실제 로그/백업 보존·복원 후 재삭제·CDN TTL |
| 버전별 동의 기록·receipt | 신규 계약 설계이며 아직 운영 영속 구현 없음 | 실제 기록 보유기간·탈퇴 후 처리. receipt 7일·멱등키 24시간은 법정 보관기간 아님 |

## 외부 서비스·전송 정보

| 서비스 | 확인한 항목·목적·설정 | 미확정 |
| --- | --- | --- |
| AWS S3 | 업로드 원본·프로필·썸네일 보관/전달. 해당 원본 버킷은 ap-northeast-2(서울). 버전 관리 미설정, 수명주기/버킷 복제 규칙 없음이라는 운영 회신 | 계약 수령 법인·별도 백업/복사·항목별 삭제/기간 |
| CloudFront | 미디어 CDN URL 사용. 설정 조회 실패 | 엣지·로그 처리국가, 보유기간·캐시 무효화·오리진 접근 |
| Firebase FCM | 운영 FIREBASE_ENABLED=true 회신. 푸시 토큰과 서비스 알림 처리 | 계약 법인·하위 처리자·국가·항목별 기간 |
| Google 지도/Geocoding/Directions | 지도 표시, 주소 해석, 길찾기. 앱 geocodingApi가 입력 주소를 Google geocode로, directionsApi가 origin/destination 좌표·mode 등을 Google directions로 직접 전송 | 실제 SDK 전체 네트워크 항목·수령 법인·처리 국가/기간·계약상 역할 |
| Apple·Google·카카오 | 앱 소셜 가입·재인증과 서버 provider 검증 경로. Google tokeninfo, Apple JWK, Kakao user/me 경로는 백엔드 회신 | provider별 실제 수신 범위·운영 성공·계약과 기간. 설치된 Naver 패키지만으로 활성 처리 확정 금지 |
| SendGrid SMTP | smtp.sendgrid.net 코드 설정 및 운영 host override 없음 회신. 인증 관련 메일 발송 구성 | 실제 발송/수신 검증·수령 법인·본문/주소 처리국가·기간 |
| DiceBear 과거 앱 경로 | 프로필 사진 없을 때 username을 외부 avatar seed로 사용하던 코드. 로컬 수정본은 고정 내장 PNG로 대체 | 수정본 배포·기존 앱 영향 확인 전 외부 전송 제거 완료로 고지 불가 |

서울 원본 버킷은 확인했지만 DB·CDN·메일·외부 공급자의 처리까지 국내라고 확정하지 않습니다. 업체 이름과 URL만으로 위탁/제3자 제공/국외 이전 근거를 확정하지 않습니다.

## 위치정보 흐름

| 단계 | 앱/서버에서 확인한 내용 | 남은 조치 |
| --- | --- | --- |
| 수집·지도 표시 | NearbyMapCanvas의 getCurrentPosition 및 showsUserLocation은 활성 상태·OS 권한 조건 사용. HomeMapPreview에도 별도 위치 경로 존재 | 실제 SDK 전송 실측과 계정 동의/기기 권한 분리 |
| 주변/홈 검색 | HomeScreen의 contentFeedLocation은 lastKnownUserLocationRef를 nearbyCenter보다 우선 사용. 수동 중심과 DEVICE가 혼용될 여지 | 출처 분리, 수동 탐색에 기기 좌표 fallback 제거 |
| 원시 저장 | 백엔드 회신상 홈 원시 요청에 actor key·좌표·검색어 저장 | 만료와 실제 파기 구분, 승인 기간·삭제 구현 |
| 외부 전달 | directionsApi/FullScreenMapScreen이 사용자 위치를 출발지로 사용, geocodingApi는 입력 주소 전송 | OS 해제·철회 시 진행 요청/늦은 응답 처리 및 외부 계약 |
| 게시물·친구 방문 | 장소 좌표 및 동행/방문 정보 처리 경로 | 단말 실시간 위치와 구분, 타인 정보의 처리 범위/권리 확인 |
| 철회·일시 중지 | 새 API 계약과 기반 로직만 존재, 실제 처리 경로 연결 전 | 원장·처리 차단·큐·원시 좌표·확인자료 파기 및 복수 기기 검증 |

신고/등록 여부·사업 개시일은 코드에서 확인할 수 없습니다. 사업 분류는 위 실제 처리 주체·흐름에 대한 추가 적용 판단이 필요합니다. 만 15세 정책 결정 자체가 기존 사용자 연령 확인이나 위치 관련 신고 완료를 증명하지 않습니다.

## 최종본에 남는 결정

1. 확인되지 않은 데이터군의 보관 목적·기간·기산점과 실제 파기 구현/실행 증거.
2. 외부 계약의 수령 법인·국가·기간 및 RDS/CloudFront 설정 증빙.
3. 위치사업 개시·신고 상태와 적용 판단, 운영 주소.
4. 만 15세 검증 방식·기존 회원 처리·시행일, 최종 문서 게시 URL.

새 조사를 요구하기 전에 이 문서의 확인값을 재사용합니다. 소스에 정리 루틴이 없는 항목은 빈칸을 임의 기간으로 채우지 않고 백엔드 수정 과제로 추적합니다.
