import React from "react";
import { Link } from "react-router-dom";
import PageLayout from "../components/PageLayout";

export default function NotFound() {
  return <PageLayout title="페이지를 찾을 수 없어요" description="주소가 변경되었거나 존재하지 않는 페이지입니다."><p>접시 홈에서 다시 둘러보거나 고객지원에서 도움을 받아보세요.</p><div className="plate-recovery"><Link to="/">접시 홈으로</Link><Link to="/faq">고객지원</Link></div></PageLayout>;
}
