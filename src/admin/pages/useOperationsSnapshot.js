import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { getOperationsSnapshot } from "../api/operationsApi";
export default function useOperationsSnapshot() {
  const { user } = useAuth();
  const scope = JSON.stringify([
    user?.accountSubject,
    user?.roles,
    user?.permissions,
  ]);
  const [result, setResult] = useState({
    scope,
    snapshot: null,
    error: "",
    loading: true,
  });
  const [autoRefresh, setAutoRefresh] = useState(true);
  const active = useRef(null),
    version = useRef(0);
  const load = useCallback(async () => {
    if (active.current) return;
    const request = ++version.current,
      controller = new AbortController();
    active.current = controller;
    setResult((old) => ({ ...old, scope, loading: true, error: "" }));
    try {
      const snapshot = await getOperationsSnapshot({
        signal: controller.signal,
      });
      if (snapshot?.schemaVersion !== 1)
        throw new Error("운영 API 응답 형식을 확인할 수 없습니다.");
      if (request === version.current)
        setResult({ scope, snapshot, error: "", loading: false });
    } catch (error) {
      if (request === version.current && !controller.signal.aborted)
        setResult({
          scope,
          snapshot: null,
          error: error.message || "운영 데이터를 불러오지 못했습니다.",
          loading: false,
        });
    } finally {
      if (active.current === controller) active.current = null;
    }
  }, [scope]);
  useEffect(() => {
    const requestVersion = version;
    const request = active;
    setResult({ scope, snapshot: null, error: "", loading: true });
    void load();
    return () => {
      requestVersion.current++;
      request.current?.abort();
      request.current = null;
    };
  }, [load, scope]);
  useEffect(() => {
    if (!autoRefresh) return;
    let disposed = false,
      timer;
    const schedule = () => {
      clearTimeout(timer);
      if (!disposed && document.visibilityState !== "hidden")
        timer = setTimeout(tick, 30000);
    };
    const tick = async () => {
      if (disposed || document.visibilityState === "hidden") return;
      await load();
      schedule();
    };
    const visibility = () => {
      clearTimeout(timer);
      if (document.visibilityState !== "hidden") void tick();
    };
    schedule();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [load, autoRefresh]);
  return {
    ...(result.scope === scope
      ? result
      : { snapshot: null, error: "", loading: true }),
    load,
    autoRefresh,
    setAutoRefresh,
  };
}
