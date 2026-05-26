function MediaUploadField({ label, accept, file, emptyText, onChange, variant = "image" }) {
  const typeLabel = variant === "video" ? "VIDEO" : "IMAGE";

  return (
    <label className="media-upload">
      <span className="media-upload__label">{label}</span>
      <input
        className="media-upload__input"
        type="file"
        accept={accept}
        onChange={(event) => onChange(event.target.files?.[0] || null)}
      />
      <span className="media-upload__surface">
        <span className="media-upload__badge">{typeLabel}</span>
        <span className="media-upload__text">{file?.name ? "선택된 파일" : emptyText}</span>
        {file?.name ? <span className="media-upload__filename">{file.name}</span> : null}
        <span className="media-upload__action">파일 선택</span>
      </span>
    </label>
  );
}

export default MediaUploadField;
