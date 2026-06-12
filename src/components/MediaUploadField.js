import { useEffect, useRef, useState } from "react";

function MediaUploadField({ label, accept, file, emptyText, onChange, variant = "image" }) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const typeLabel = variant === "video" ? "VIDEO" : "IMAGE";
  const hasFile = Boolean(file?.name);

  useEffect(() => {
    if (!file || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") {
      setPreviewUrl("");
      return undefined;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);

    return () => {
      if (typeof URL.revokeObjectURL === "function") {
        URL.revokeObjectURL(nextPreviewUrl);
      }
    };
  }, [file]);

  function handleRemove(event) {
    event.preventDefault();
    event.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onChange(null);
  }

  return (
    <div className="media-upload">
      <span className="media-upload__label">{label}</span>
      <label className="media-upload__dropzone">
        <input
          ref={inputRef}
          className="media-upload__input"
          type="file"
          accept={accept}
          onChange={(event) => onChange(event.target.files?.[0] || null)}
        />
        <span className={hasFile ? "media-upload__surface media-upload__surface--selected" : "media-upload__surface"}>
          <span className="media-upload__badge">{typeLabel}</span>
          {previewUrl && variant === "image" ? (
            <img className="media-upload__preview" src={previewUrl} alt={`${label} 미리보기`} />
          ) : null}
          {previewUrl && variant === "video" ? (
            <video className="media-upload__preview" src={previewUrl} muted playsInline controls />
          ) : null}
          <span className="media-upload__text">{hasFile ? "선택된 파일" : emptyText}</span>
          {hasFile ? (
            <span className="media-upload__filename" title={file.name}>
              {file.name}
            </span>
          ) : null}
          {hasFile ? <span className="media-upload__meta">{formatFileSize(file.size)}</span> : null}
          <span className="media-upload__action">파일 선택</span>
        </span>
      </label>
      {hasFile ? (
        <button type="button" className="media-upload__remove" onClick={handleRemove}>
          선택 취소
        </button>
      ) : null}
    </div>
  );
}

function formatFileSize(value) {
  if (!Number.isFinite(value)) {
    return "";
  }

  if (value < 1024) {
    return `${value}B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)}KB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)}MB`;
}

export default MediaUploadField;
