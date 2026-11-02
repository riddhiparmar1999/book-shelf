import { useState } from "react";
import { Link } from "react-router-dom";

const emptyErrors = {
  email: "",
  form: "",
};

function ForgotPassword({ showToast }) {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState(emptyErrors);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const validate = () => {
    const nextErrors = { ...emptyErrors };

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      nextErrors.email = "Enter a valid email address.";
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some((msg) => msg !== "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/forgot-password/",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        setSent(true);
        showToast?.(
          data.message ??
            "If an account exists with this email, a password reset link has been sent."
        );
        return;
      }

      if (data?.errors?.email?.[0]) {
        setErrors({ ...emptyErrors, email: data.errors.email[0] });
      } else {
        setErrors({
          ...emptyErrors,
          form:
            data?.message ??
            "Unable to send reset link. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to send reset link. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel auth-panel" aria-labelledby="forgot-heading">
      <div className="auth-panel__header">
        <h2 id="forgot-heading" className="panel__title">
          Forgot password
        </h2>
        <p className="auth-panel__hint">
          Enter your email and we&apos;ll send you a link to reset your
          password.
        </p>
      </div>

      {sent ? (
        <>
          <p className="auth-panel__hint">
            If an account exists for <strong>{email.trim().toLowerCase()}</strong>,
            a reset link has been sent. Check your inbox and follow the
            instructions.
          </p>
          <div className="form-actions auth-form__actions">
            <Link to="/" className="btn btn--primary auth-form__submit">
              Back to log in
            </Link>
          </div>
        </>
      ) : (
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className={`field${errors.email ? " field--error" : ""}`}>
            <label htmlFor="forgot-email">
              Email <span className="field__required">*</span>
            </label>
            <input
              id="forgot-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email || errors.form) {
                  setErrors(emptyErrors);
                }
              }}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && <p className="field__error">{errors.email}</p>}
          </div>

          {errors.form && <p className="field__error">{errors.form}</p>}

          <div className="form-actions auth-form__actions">
            <button
              type="submit"
              className="btn btn--primary auth-form__submit"
              disabled={submitting}
            >
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </div>
        </form>
      )}

      <p className="auth-panel__footer">
        Remember your password?{" "}
        <Link to="/" className="auth-panel__link">
          Log in
        </Link>
      </p>
    </section>
  );
}

export default ForgotPassword;
