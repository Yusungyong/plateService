import useModalFocus from "../../components/useModalFocus";
import React from "react";

function DetailDrawer({ isOpen, title, description, onClose, children, footer }) {
  const modalRef = useModalFocus(isOpen, onClose);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="admin-drawer-layer">
      <button
        type="button"
        className="admin-drawer-backdrop"
        aria-label="상세 패널 닫기"
        onClick={onClose}
      />
      <aside ref={modalRef} className="admin-detail-drawer" role="dialog" aria-modal="true" aria-label={title}>
        <header className="admin-detail-drawer__header">
          <div>
            <h2>{title}</h2>
            {description ? <p>{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} aria-label="닫기">
            닫기
          </button>
        </header>
        <div className="admin-detail-drawer__body">{children}</div>
        {footer ? <footer className="admin-detail-drawer__footer">{footer}</footer> : null}
      </aside>
    </div>
  );
}

export default DetailDrawer;
