import React from "react";

function AdminPageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="admin-page-header">
      <div>
        {eyebrow ? <span className="admin-page-header__eyebrow">{eyebrow}</span> : null}
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="admin-page-header__actions">{actions}</div> : null}
    </header>
  );
}

export default AdminPageHeader;
