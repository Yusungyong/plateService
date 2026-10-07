import React, { useEffect } from "react";

function PageLayout({ title, description, children, className = "" }) {
  useEffect(() => {
    const previous = document.title;
    const meta = document.querySelector('meta[name="description"]');
    const previousDescription = meta?.content;
    if (meta && description) meta.content = description;
    document.title = `${title} | 접시`;
    return () => { document.title = previous; if (meta) meta.content = previousDescription || ""; };
  }, [title, description]);
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
