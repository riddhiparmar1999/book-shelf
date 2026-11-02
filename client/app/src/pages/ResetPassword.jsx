import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const emptyForm = {
  password: "",
  confirmPassword: "",
};

const emptyErrors = {
  password: "",
  confirmPassword: "",
  form: "",
};

function ResetPassword({ showToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams]
  );

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState(emptyErrors);
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field) => (e) => {
    setForm({
      ...form,
      [field]: e.target.value,
    });
    if (errors[field] || errors.form) {
      setErrors({
        ...errors,
        [field]: "",
        form: "",
      });
    }
  };

  const validate = () => {
    const nextErrors = { ...emptyErrors };

    if (!token) {
      nextErrors.form = "Reset link is missing or invalid.";
    }

    if (!form.password) {
      nextErrors.password = "Password is required.";
    } else if (form.password.length < 6) {
      nextErrors.password = "Password must be at least 6 characters.";
    }

    if (!form.confirmPassword) {
      nextErrors.confirmPassword = "Please confirm your password.";
    } else if (form.confirmPassword !== form.password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some((msg) => msg !== "");
  };

  const mapApiErrors = (apiErrors = {}) => ({
    password: apiErrors.password?.[0] ?? "",
    confirmPassword: apiErrors.confirm_password?.[0] ?? "",
    form: apiErrors.token?.[0] ?? apiErrors.non_field_errors?.[0] ?? "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/reset-password/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            token,
            password: form.password,
            confirm_password: form.confirmPassword,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        showToast?.(
          data.message ?? "Password reset successfully. You can now log in."
        );
        navigate("/", { replace: true });
        return;
      }

      if (data?.errors) {
        setErrors(mapApiErrors(data.errors));
      } else {
        setErrors({
          ...emptyErrors,
          form: data?.message ?? "Unable to reset password. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to reset password. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel auth-panel" aria-labelledby="reset-heading">
      <div className="auth-panel__header">
        <h2 id="reset-heading" className="panel__title">
          Reset password
        </h2>
        <p className="auth-panel__hint">
          Choose a new password for your Shelf account.
        </p>
      </div>

      {!token ? (
        <>
          <p className="field__error">
            This reset link is missing or invalid. Request a new one from the
            forgot password page.
          </p>
          <div className="form-actions auth-form__actions">
            <Link
              to="/forgot-password"
              className="btn btn--primary auth-form__submit"
            >
              Forgot password
            </Link>
          </div>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className={`field${errors.password ? " field--error" : ""}`}>
            <label htmlFor="reset-password">
              New password <span className="field__required">*</span>
            </label>
            <input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 6 characters"
              value={form.password}
              onChange={updateField("password")}
              aria-invalid={Boolean(errors.password)}
            />
            {errors.password && (
              <p className="field__error">{errors.password}</p>
            )}
          </div>

          <div
            className={`field${errors.confirmPassword ? " field--error" : ""}`}
          >
            <label htmlFor="reset-confirm-password">
              Confirm password <span className="field__required">*</span>
            </label>
            <input
              id="reset-confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="Re-enter password"
              value={form.confirmPassword}
              onChange={updateField("confirmPassword")}
              aria-invalid={Boolean(errors.confirmPassword)}
            />
            {errors.confirmPassword && (
              <p className="field__error">{errors.confirmPassword}</p>
            )}
          </div>

          {errors.form && <p className="field__error">{errors.form}</p>}

          <div className="form-actions auth-form__actions">
            <button
              type="submit"
              className="btn btn--primary auth-form__submit"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Reset password"}
            </button>
          </div>
        </form>
      )}

      <p className="auth-panel__footer">
        <Link to="/" className="auth-panel__link">
          Back to log in
        </Link>
      </p>
    </section>
  );
}

export default ResetPassword;
