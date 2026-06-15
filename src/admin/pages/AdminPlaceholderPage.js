import React from "react";
import AdminPageHeader from "../components/AdminPageHeader";

function AdminPlaceholderPage({ title, description, featured = false }) {
  return (
    <div className="admin-page">
      <AdminPageHeader
        eyebrow={featured ? "PLATE SEASONAL" : "PLATE OPERATIONS"}
        title={title}
        description={description}
      />
      <section
        className={
          featured
            ? "admin-empty-panel admin-empty-panel--featured"
            : "admin-empty-panel"
        }
      >
        <strong>다음 구현 단계</strong>
        <p>
          공통 레이아웃과 승인 관리 흐름을 먼저 안정화한 뒤 이 화면의 mock API와
          운영 액션을 연결합니다.
        </p>
      </section>
    </div>
  );
}

export default AdminPlaceholderPage;
