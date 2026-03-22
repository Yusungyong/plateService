import React from "react";
import PageLayout from "../components/PageLayout";

function StaticInfoPage({ title, description, notices }) {
  return (
    <PageLayout title={title} description={description}>
      <div className="info-stack">
        {notices.map((notice) => (
          <p key={notice} className="info-stack__item">
            {notice}
          </p>
        ))}
      </div>
    </PageLayout>
  );
}

export default StaticInfoPage;
