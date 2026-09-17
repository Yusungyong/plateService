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
  // Only escaped, build-time Markdown from the public allowlist reaches this component.
  return <div dangerouslySetInnerHTML={{ __html: page?.body || generated.notFound }} />;
}
