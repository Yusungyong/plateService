import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import generated from "./generated.json";
import "./legal.css";

export default function LegalPage() {
  const { pathname } = useLocation();
  const key = pathname.replace(/\/+$/, "");
  const page = generated.pages[key];
  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${page?.title || "문서를 찾을 수 없습니다"} | 접시`;
    return () => { document.title = previousTitle; };
  }, [page]);
  const downloadSource = (event) => {
    const link = event.target.closest?.('a[download]');
    const source = link && generated.downloads[link.getAttribute('href')];
    if (!source) return;
    event.preventDefault();
    const url = URL.createObjectURL(new Blob([source.source], { type: 'text/markdown;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = source.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Allow the browser to start the download before releasing the object URL.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  // Only escaped, build-time Markdown from the public allowlist reaches this component.
  return <div onClick={downloadSource} dangerouslySetInnerHTML={{ __html: page?.body || generated.notFound }} />;
}
