import {useLayoutEffect, useRef} from "react";
const focusable = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]';
export default function useModalFocus(open, onClose) {
  const ref = useRef(null), close = useRef(onClose);
  close.current = onClose;
  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.tabIndex = -1;
    const items = () => [...dialog.querySelectorAll(focusable)].filter(el => el.getClientRects().length);
    const topmost = () => [...document.querySelectorAll('[aria-modal="true"]')].pop() === dialog;
    (items()[0] || dialog).focus();
    const focus = event => {if (topmost() && !dialog.contains(event.target)) (items()[0] || dialog).focus();};
    const key = event => {
      if (!topmost()) return;
      if (event.key === "Escape") {event.preventDefault(); event.stopPropagation(); close.current?.();}
      if (event.key === "Tab") {
        const list = items(), first = list[0] || dialog, last = list[list.length - 1] || dialog;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {event.preventDefault(); last.focus();}
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {event.preventDefault(); first.focus();}
      }
    };
    document.addEventListener("keydown", key, true); document.addEventListener("focusin", focus);
    return () => {document.removeEventListener("keydown", key, true); document.removeEventListener("focusin", focus); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus();};
  }, [open]);
  return ref;
}
