import React, { useEffect, useState } from "react";

function ReasonDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  reasonCodeOptions = [],
  isSubmitting = false,
  onCancel,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [reasonCode, setReasonCode] = useState("");
  const [error, setError] = useState("");
  const defaultReasonCode = reasonCodeOptions[0]?.value || "";

  useEffect(() => {
    if (isOpen) {
      setReason("");
      setReasonCode(defaultReasonCode);
      setError("");
    }
  }, [defaultReasonCode, isOpen]);

  if (!isOpen) {
    return null;
  }

  function handleSubmit(event) {
    event.preventDefault();
    const normalizedReason = reason.trim();

    if (reasonCodeOptions.length > 0 && !reasonCode) {
      setError("반려 사유 유형을 선택해 주세요.");
      return;
    }

    if (normalizedReason.length < 10) {
      setError("처리 사유를 10자 이상 입력해 주세요.");
      return;
    }

    onConfirm(normalizedReason, reasonCode);
  }

  return (
    <div className="admin-dialog-layer">
      <div className="admin-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <h2>{title}</h2>
          <p>{description}</p>
        </header>
        <form onSubmit={handleSubmit}>
          {reasonCodeOptions.length > 0 ? (
            <label>
              <span>반려 사유 유형</span>
              <select
                value={reasonCode}
                onChange={(event) => {
                  setReasonCode(event.target.value);
                  setError("");
                }}
                autoFocus
              >
                {reasonCodeOptions.map((option) => (
                  <option value={option.value} key={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span>처리 사유</span>
            <textarea
              rows={5}
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
              placeholder="담당자가 확인할 수 있도록 구체적으로 입력해 주세요."
              minLength={10}
              maxLength={1000}
              autoFocus={reasonCodeOptions.length === 0}
            />
          </label>
          {error ? <p className="admin-dialog__error">{error}</p> : null}
          <div className="admin-dialog__actions">
            <button type="button" onClick={onCancel} disabled={isSubmitting}>
              취소
            </button>
            <button type="submit" className="admin-button admin-button--danger" disabled={isSubmitting}>
              {isSubmitting ? "처리 중" : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ReasonDialog;
