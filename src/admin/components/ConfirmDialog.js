import React from "react";

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = "확인",
  isSubmitting = false,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="admin-dialog-layer">
      <div className="admin-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <p>{description}</p>
        </header>
        <div className="admin-dialog__actions">
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            취소
          </button>
          <button type="button" className="admin-button admin-button--primary" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "처리 중" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
