import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch, getAccessToken, getRefreshToken, saveAuth } from "../auth";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  roleName: "",
};

const emptyErrors = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  form: "",
};

const profileToForm = (profile) => ({
  firstName: profile?.first_name ?? "",
  lastName: profile?.last_name ?? "",
  email: profile?.email ?? "",
  password: "",
  confirmPassword: "",
  roleName: profile?.role_name ?? "",
});

function Profile({ showToast }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState(emptyErrors);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchProfile = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch("/profile/");

        if (response.status === 401) {
          return;
        }

        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (response.ok && data?.success) {
          setForm(profileToForm(data.data));
        } else {
          setLoadError(data?.message ?? "Unable to load profile.");
        }
      } catch (error) {
        console.log(error);
        if (!cancelled) {
          setLoadError("Unable to load profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchProfile();

    return () => {
      cancelled = true;
    };
  }, []);

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

    if (form.password || form.confirmPassword) {
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
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some((msg) => msg !== "");
  };

  const mapApiErrors = (apiErrors = {}) => ({
    firstName: apiErrors.first_name?.[0] ?? "",
    lastName: apiErrors.last_name?.[0] ?? "",
    email: apiErrors.email?.[0] ?? "",
    password: apiErrors.password?.[0] ?? "",
    confirmPassword: apiErrors.confirm_password?.[0] ?? "",
    form: apiErrors.non_field_errors?.[0] ?? "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    const payload = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
    };

    if (form.password) {
      payload.password = form.password;
      payload.confirm_password = form.confirmPassword;
    }

    try {
      const response = await apiFetch("/profile/", {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (response.ok && data?.success) {
        const nextProfile = data.data ?? {};
        setForm(profileToForm(nextProfile));

        const storedUser = {
          id: nextProfile.id,
          first_name: nextProfile.first_name,
          last_name: nextProfile.last_name,
          email: nextProfile.email,
        };
        saveAuth({
          access_token: getAccessToken(),
          refresh_token: getRefreshToken(),
          user: storedUser,
        });

        showToast?.(data.message ?? "Profile updated successfully.");
        navigate("/dashboard");
        return;
      }

      if (data?.errors) {
        setErrors(mapApiErrors(data.errors));
      } else {
        setErrors({
          ...emptyErrors,
          form: data?.message ?? "Unable to update profile. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to update profile. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <section className="panel" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="panel__title">
          Profile
        </h2>
        <p className="empty">Loading profile...</p>
      </section>
    );
  }

  if (loadError) {
    return (
      <section className="panel" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="panel__title">
          Profile
        </h2>
        <p className="field__error">{loadError}</p>
      </section>
    );
  }

  return (
    <section className="panel" aria-labelledby="profile-heading">
      <h2 id="profile-heading" className="panel__title">
        Profile
      </h2>
      <p className="panel__hint">
        Update your account details. Leave password blank to keep your current
        password.
      </p>

      <form className="form-grid" onSubmit={handleSubmit} noValidate>
        <div className={`field${errors.firstName ? " field--error" : ""}`}>
          <label htmlFor="profile-first-name">
            First name <span className="field__required">*</span>
          </label>
          <input
            id="profile-first-name"
            type="text"
            autoComplete="given-name"
            value={form.firstName}
            onChange={updateField("firstName")}
            aria-invalid={Boolean(errors.firstName)}
          />
          {errors.firstName && (
            <p className="field__error">{errors.firstName}</p>
          )}
        </div>

        <div className={`field${errors.lastName ? " field--error" : ""}`}>
          <label htmlFor="profile-last-name">
            Last name <span className="field__required">*</span>
          </label>
          <input
            id="profile-last-name"
            type="text"
            autoComplete="family-name"
            value={form.lastName}
            onChange={updateField("lastName")}
            aria-invalid={Boolean(errors.lastName)}
          />
          {errors.lastName && (
            <p className="field__error">{errors.lastName}</p>
          )}
        </div>

        <div
          className={`field field--full${errors.email ? " field--error" : ""}`}
        >
          <label htmlFor="profile-email">
            Email <span className="field__required">*</span>
          </label>
          <input
            id="profile-email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={updateField("email")}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="field__error">{errors.email}</p>}
        </div>

        <div className="field field--full">
          <label htmlFor="profile-role">Role</label>
          <input
            id="profile-role"
            type="text"
            value={form.roleName || "—"}
            readOnly
          />
        </div>

        <div className={`field${errors.password ? " field--error" : ""}`}>
          <label htmlFor="profile-password">New password</label>
          <input
            id="profile-password"
            type="password"
            autoComplete="new-password"
            placeholder="Leave blank to keep current password"
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
          <label htmlFor="profile-confirm-password">Confirm password</label>
          <input
            id="profile-confirm-password"
            type="password"
            autoComplete="new-password"
            placeholder="Re-enter new password"
            value={form.confirmPassword}
            onChange={updateField("confirmPassword")}
            aria-invalid={Boolean(errors.confirmPassword)}
          />
          {errors.confirmPassword && (
            <p className="field__error">{errors.confirmPassword}</p>
          )}
        </div>

        {errors.form && (
          <p className="field__error field--full">{errors.form}</p>
        )}

        <div className="form-actions field--full">
          <Link to="/dashboard" className="btn btn--secondary">
            Cancel
          </Link>
          <button
            type="submit"
            className="btn btn--primary"
            disabled={submitting}
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default Profile;
