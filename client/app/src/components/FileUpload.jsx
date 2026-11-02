import { useEffect, useId, useState } from "react";

const DEFAULT_ACCEPT = ".jpg,.jpeg,.png,.webp";
const DEFAULT_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const DEFAULT_MAX_MB = 5;

function getExtension(filename = "") {
  const idx = filename.lastIndexOf(".");
  if (idx === -1) return "";
  return filename.slice(idx).toLowerCase();
}

function validateFile(file, { allowedExtensions, maxSizeMB }) {
  if (!file) return "";

  const ext = getExtension(file.name);
  if (!allowedExtensions.includes(ext)) {
    return `Only ${allowedExtensions.join(", ")} files are allowed.`;
  }

  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return `File must be ${maxSizeMB} MB or smaller.`;
  }

  return "";
}

function FileUpload({
  id,
  label = "Cover image",
  accept = DEFAULT_ACCEPT,
  allowedExtensions = DEFAULT_EXTENSIONS,
  maxSizeMB = DEFAULT_MAX_MB,
  value = null,
  existingUrl = "",
  onChange,
  error = "",
  disabled = false,
  required = false,
  helpText,
}) {
  const generatedId = useId();
  const inputId = id || `file-upload-${generatedId}`;
  const [previewUrl, setPreviewUrl] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!value) {
      setPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);

  const displayUrl = previewUrl || existingUrl;
  const shownError = error || localError;

  const handleFileChange = (e) => {
    if (disabled) return;

    const file = e.target.files?.[0] ?? null;
    const validationError = validateFile(file, {
      allowedExtensions,
      maxSizeMB,
    });

    if (validationError) {
      setLocalError(validationError);
      e.target.value = "";
      onChange?.(null, validationError);
      return;
    }

    setLocalError("");
    onChange?.(file, "");
  };

  const clearFile = () => {
    if (disabled) return;
    setLocalError("");
    onChange?.(null, "");
  };

  return (
    <div className={`field field--full${shownError ? " field--error" : ""}`}>
      <label htmlFor={inputId}>
        {label}
        {required && !disabled && (
          <span className="field__required"> *</span>
        )}
      </label>

      {!disabled && (
        <input
          id={inputId}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          aria-invalid={Boolean(shownError)}
        />
      )}

      {helpText && !shownError && (
        <p className="file-upload__hint">{helpText}</p>
      )}

      {shownError && <p className="field__error">{shownError}</p>}

      {displayUrl ? (
        <div className="file-upload__preview">
          <img src={displayUrl} alt="Cover preview" />
          {!disabled && value && (
            <button
              type="button"
              className="btn btn--secondary file-upload__clear"
              onClick={clearFile}
            >
              Remove selected file
            </button>
          )}
        </div>
      ) : (
        disabled && <p className="file-upload__empty">No cover image.</p>
      )}
    </div>
  );
}

export default FileUpload;
