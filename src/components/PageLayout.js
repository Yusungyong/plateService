import React, { useEffect } from "react";

function PageLayout({ title, description, children, className = "" }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | 접시`;
    return () => { document.title = previous; };
  }, [title]);
  return (
    <section className={`page-layout${className ? ` ${className}` : ""}`}>
      <header className="page-layout__header">
        <h1 className="page-layout__title">{title}</h1>
        {description ? <p className="page-layout__description">{description}</p> : null}
      </header>

      <div className="page-layout__content">{children}</div>
    </section>
  );
}

export default PageLayout;
