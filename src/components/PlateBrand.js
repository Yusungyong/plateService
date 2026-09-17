import React from "react";
import { Link } from "react-router-dom";

export default function PlateBrand({ compact = false }) {
  return <Link to="/" className={`plate-brand${compact ? " plate-brand--compact" : ""}`} aria-label="접시 홈으로 이동">
    <img src="/images/home/plate-mascot.png" width="64" height="64" alt="" />
    <span>접시<small>홈으로</small></span>
  </Link>;
}

export function PlateFooter() {
  return <footer className="plate-footer"><PlateBrand compact /><nav aria-label="서비스 안내"><Link to="/faq">고객지원</Link><Link to="/terms-of-service">이용약관</Link><Link to="/privacy-policy">개인정보 처리방침</Link><a href="mailto:su12ng@gmail.com">문의하기</a></nav><small>© {new Date().getFullYear()} 접시 · 운영자 유성용</small></footer>;
}
