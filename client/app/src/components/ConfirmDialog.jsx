function ConfirmDialog({
  open,
  title = "Confirm action",
  message,
  itemName,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
            />
          </svg>
        </div>

        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>

        <p id="confirm-dialog-message" className="confirm-dialog__message">
          {message}
          {itemName && (
            <>
              {" "}
              <strong className="confirm-dialog__item">{itemName}</strong>?
            </>
          )}
        </p>

        <p className="confirm-dialog__hint">This action cannot be undone.</p>

        <div className="confirm-dialog__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
