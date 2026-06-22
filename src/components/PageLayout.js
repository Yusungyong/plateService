import React from "react";

function PageLayout({ title, description, children, className = "" }) {
  return (
    <section className={`page-layout${className ? ` ${className}` : ""}`}>
      <header className="page-layout__header">
        <h2 className="page-layout__title">{title}</h2>
        {description ? <p className="page-layout__description">{description}</p> : null}
      </header>

      <div className="page-layout__content">{children}</div>
    </section>
  );
}

export default PageLayout;
