import React, { useContext, useEffect } from "react";
import { UNSAFE_DataRouterContext, useBlocker } from "react-router-dom";
import { registerLeaveProtection } from "./formLeaveProtection";
function RouterGuard({ when, pending, completed }) {
  const blocker = useBlocker(() => !completed?.current && (when || pending));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    if (pending) {
      window.alert("요청을 처리하고 있습니다. 결과를 확인한 뒤 이동해 주세요.");
      blocker.reset();
    } else if (window.confirm("저장하지 않은 내용이 있습니다. 내용을 버리고 이동할까요?")) blocker.proceed();
    else blocker.reset();
  }, [blocker, pending]);
  return null;
}
export default function UnsavedChangesGuard({ when, pending = false, completed }) {
  const router = useContext(UNSAFE_DataRouterContext);
  useEffect(() => registerLeaveProtection(() => ({dirty: !completed?.current && when, pending: !completed?.current && pending})), [when, pending, completed]);
  useEffect(() => {
    const warn = event => {
      if (completed?.current || !(when || pending)) return;
      event.preventDefault(); event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [when, pending, completed]);
  return router ? <RouterGuard when={Boolean(when)} pending={pending} completed={completed} /> : null;
}
