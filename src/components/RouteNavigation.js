import {useEffect} from "react";
import {ScrollRestoration, useLocation, useNavigationType} from "react-router-dom";
export default function RouteNavigation() {
  const location = useLocation(), navigation = useNavigationType();
  useEffect(() => {
    if (location.hash || navigation === "POP") return;
    const focus = () => {const heading = document.querySelector("h1"); if (!heading) return false; heading.tabIndex = -1; heading.focus({preventScroll:true}); return true;};
    const observer = new MutationObserver(() => {if (focus()) observer.disconnect();});
    const timer = requestAnimationFrame(() => {if (!focus()) observer.observe(document.body,{childList:true,subtree:true});});
    return () => {cancelAnimationFrame(timer); observer.disconnect();};
  }, [location.key, location.hash, navigation]);
  return <ScrollRestoration />;
}
