import { useEffect, useRef } from "react";
export default function useActiveForm() {
  const active = useRef(true);
  const completed = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  return {active, completed};
}
