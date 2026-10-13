import { useEffect, useRef } from "react";

let locks = 0;
let originalOverflow = "";
export default function useDialogFocus(isOpen, onClose, busy = false) {
  const node = useRef(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    if (!isOpen || !node.current) return;
    const dialog = node.current;
    const previous = document.activeElement;
    if (locks++ === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    const controls = () => [
      ...dialog.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex='0']"
      ),
    ];
    const preferred = dialog.querySelector(
      "select:not(:disabled), textarea:not(:disabled), input:not(:disabled)"
    );
    (preferred || controls()[0])?.focus();
    function keydown(event) {
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== dialog) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (!latest.current.busy) latest.current.onClose?.();
      } else if (event.key === "Tab") {
        const items = controls();
        const first = items[0],
          last = items[items.length - 1];
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || !dialog.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      if (--locks === 0) document.body.style.overflow = originalOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [isOpen]);
  return node;
}
