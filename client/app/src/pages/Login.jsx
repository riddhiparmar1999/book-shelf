import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { saveAuth } from "../auth";

const emptyForm = {
  email: "",
  password: "",
};

const emptyErrors = {
  email: "",
  password: "",
  form: "",
};

function Login({ showToast, onLogin }) {
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

    setErrors(nextErrors);
    return !Object.values(nextErrors).some((msg) => msg !== "");
  };

  const mapApiErrors = (apiErrors = {}) => ({
    email: apiErrors.email?.[0] ?? "",
    password: apiErrors.password?.[0] ?? "",
    form: apiErrors.non_field_errors?.[0] ?? "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await fetch("http://127.0.0.1:8000/api/login/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data?.success) {
        const access_token = data.access;
        const refresh_token = data.refresh;
        const profile = data.user ?? {};

        const user = {
          id: profile.user_id ?? profile.id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          role_id: profile.role_id,
          role_name: profile.role_name,
        };

        saveAuth({ access_token, refresh_token, user });
        onLogin?.(user);

        showToast?.(data.message ?? "Login successful.");
        navigate("/books");
        return;
      }

      if (data?.errors) {
        setErrors(mapApiErrors(data.errors));
      } else {
        setErrors({
          ...emptyErrors,
          form: data?.message ?? "Unable to log in. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to log in. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="panel auth-panel" aria-labelledby="login-heading">
      <div className="auth-panel__header">
        <h2 id="login-heading" className="panel__title">
          Log in
        </h2>
        <p className="auth-panel__hint">
          Welcome back. Sign in to manage your library.
        </p>
      </div>

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
        <div className={`field${errors.email ? " field--error" : ""}`}>
          <label htmlFor="login-email">
            Email <span className="field__required">*</span>
          </label>
          <input
            id="login-email"
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
          <div className="field__label-row">
            <label htmlFor="login-password">
              Password <span className="field__required">*</span>
            </label>
            <Link to="/forgot-password" className="auth-panel__link auth-panel__forgot">
              Forgot password?
            </Link>
          </div>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Your password"
            value={form.password}
            onChange={updateField("password")}
            aria-invalid={Boolean(errors.password)}
          />
          {errors.password && <p className="field__error">{errors.password}</p>}
        </div>

        {errors.form && <p className="field__error">{errors.form}</p>}

        <div className="form-actions auth-form__actions">
          <button
            type="submit"
            className="btn btn--primary auth-form__submit"
            disabled={submitting}
          >
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </div>
      </form>

      <p className="auth-panel__footer">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="auth-panel__link">
          Register
        </Link>
      </p>
    </section>
  );
}

export default Login;
