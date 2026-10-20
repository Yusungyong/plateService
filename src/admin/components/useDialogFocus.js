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
    const visible = (element) => {
      if (element.matches("input[type='hidden']")) return false;
      for (let parent = element; parent && parent !== dialog; parent = parent.parentElement) {
        if (parent.hidden || parent.hasAttribute("inert") || parent.getAttribute("aria-hidden") === "true") return false;
        if (parent.tagName === "DETAILS" && !parent.open && !parent.querySelector(":scope > summary")?.contains(element)) return false;
        const style = window.getComputedStyle(parent);
        if (style.display === "none" || style.visibility === "hidden") return false;
      }
      return true;
    };
    const controls = () => [
      ...dialog.querySelectorAll(
        "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary, [tabindex='0']"
      ),
    ].filter(visible);
    const preferred = controls().find(element => element.matches("select,textarea,input"));
    (preferred || controls()[0])?.focus();
    function keydown(event) {
      // Native modal dialogs live in the browser's top layer; let them manage focus.
      if (document.querySelector("dialog[open]")) return;
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
