import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const emptyErrors = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  form: "",
};

function Register({ showToast }) {
  const navigate = useNavigate();
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

    if (!form.firstName.trim()) {
      nextErrors.firstName = "First name is required.";
    }

    if (!form.lastName.trim()) {
      nextErrors.lastName = "Last name is required.";
    }

    if (!form.email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Enter a valid email address.";
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
    firstName: apiErrors.first_name?.[0] ?? "",
    lastName: apiErrors.last_name?.[0] ?? "",
    email: apiErrors.email?.[0] ?? "",
    password: apiErrors.password?.[0] ?? "",
    confirmPassword: "",
    form: apiErrors.non_field_errors?.[0] ?? "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        showToast?.(data.message ?? "User registered successfully.");
        navigate("/");
        return;
      }

      setErrors(mapApiErrors(data?.errors));
      if (!data?.errors) {
        setErrors({
          ...emptyErrors,
          form: data?.message ?? "Unable to register. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to register. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel auth-panel" aria-labelledby="register-heading">
      <div className="auth-panel__header">
        <h2 id="register-heading" className="panel__title">
          Create account
        </h2>
        <p className="auth-panel__hint">
          Join Shelf and start building your personal library.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className="form-grid auth-form__name-row">
          <div className={`field${errors.firstName ? " field--error" : ""}`}>
            <label htmlFor="register-first-name">
              First name <span className="field__required">*</span>
            </label>
            <input
              id="register-first-name"
              type="text"
              autoComplete="given-name"
              placeholder="e.g. Alex"
              value={form.firstName}
              onChange={updateField("firstName")}
              aria-invalid={Boolean(errors.firstName)}
            />
            {errors.firstName && (
              <p className="field__error">{errors.firstName}</p>
            )}
          </div>

          <div className={`field${errors.lastName ? " field--error" : ""}`}>
            <label htmlFor="register-last-name">
              Last name <span className="field__required">*</span>
            </label>
            <input
              id="register-last-name"
              type="text"
              autoComplete="family-name"
              placeholder="e.g. Rivera"
              value={form.lastName}
              onChange={updateField("lastName")}
              aria-invalid={Boolean(errors.lastName)}
            />
            {errors.lastName && (
              <p className="field__error">{errors.lastName}</p>
            )}
          </div>
        </div>

        <div className={`field${errors.email ? " field--error" : ""}`}>
          <label htmlFor="register-email">
            Email <span className="field__required">*</span>
          </label>
          <input
            id="register-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={updateField("email")}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="field__error">{errors.email}</p>}
        </div>

        <div className={`field${errors.password ? " field--error" : ""}`}>
          <label htmlFor="register-password">
            Password <span className="field__required">*</span>
          </label>
          <input
            id="register-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={form.password}
            onChange={updateField("password")}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <p className="field__error">{errors.password}</p>}
        </div>

        <div className={`field${errors.confirmPassword ? " field--error" : ""}`}>
          <label htmlFor="register-confirm">
            Confirm password <span className="field__required">*</span>
          </label>
          <input
            id="register-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter your password"
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
            {submitting ? "Registering..." : "Register"}
          </button>
        </div>
      </form>

      <p className="auth-panel__footer">
        Already have an account?{" "}
        <Link to="/" className="auth-panel__link">
          Log in
        </Link>
      </p>
    </section>
  );
}

export default Register;
