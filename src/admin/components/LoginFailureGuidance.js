import React from "react";
import { loginAuthReport } from "../pages/apiClientErrors";

export default function LoginFailureGuidance({ report }) {
  const auth = loginAuthReport(report);
  if (!auth) return null;
  return <aside className="login-failure-guidance" aria-label="로그인 오류 확인 안내">
    <strong>로그인 인증 거부 · HTTP 401</strong>
    <p>확인된 401 보고 {auth.reportedCount}건{!auth.complete && " · 최근 분류에서 확인된 건수"}. 서버가 로그인을 승인하지 않은 응답입니다. 아이디 또는 비밀번호 중 어느 항목이 원인인지는 수집 정보만으로 확정할 수 없습니다.</p>
    <p>회원 모니터링에서 계정 존재 여부와 가입 방식을 확인하고, 앱에서 아이디·이메일 또는 가입한 소셜 로그인으로 다시 확인하세요. 올바른 정보로도 반복되면 마지막 발생 시각과 새 보고를 함께 확인하세요.</p>
    <p>과거 실패 기록은 집계 구간이 지나면 목록에서 빠집니다. 이후 로그인에 성공해도 기존 기록이 즉시 삭제되지는 않습니다.</p>
  </aside>;
}
