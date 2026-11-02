import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";
import { usePermissions } from "../permissions";

const emptyForm = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  roleId: "",
  isActive: true,
};

const emptyErrors = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  confirmPassword: "",
  roleId: "",
  form: "",
};

const userToForm = (user) => ({
  firstName: user?.first_name ?? user?.firstName ?? "",
  lastName: user?.last_name ?? user?.lastName ?? "",
  email: user?.email ?? "",
  password: "",
  confirmPassword: "",
  roleId: String(user?.role_id ?? user?.roleId ?? ""),
  roleName: user?.role_name ?? user?.roleName ?? "",
  isActive: user?.is_active ?? user?.isActive ?? true,
});

function AddUser({ mode = "add" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, loading: permissionsLoading, homePath } = usePermissions();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const editingId = isView || isEdit ? id : null;
  const requiredAction = isView ? "read" : isEdit ? "update" : "create";
  const canUpdate = can("users", "update");

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState(emptyErrors);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [loading, setLoading] = useState(isView || isEdit);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadRoles = async () => {
      setRolesLoading(true);
      try {
        const response = await apiFetch("/roles/", {
          method: "POST",
          body: JSON.stringify({ page: 1, page_size: 100 }),
        });

        if (response.status === 401) {
          return;
        }

        const data = await response.json();
        if (!cancelled && response.ok && data?.success) {
          setRoles(data?.data ?? []);
        }
      } catch (error) {
        console.log(error);
      } finally {
        if (!cancelled) setRolesLoading(false);
      }
    };

    loadRoles();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if ((!isView && !isEdit) || !editingId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchUser = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch(`/users/${editingId}`);

        if (response.status === 401) {
          return;
        }

        const data = await response.json();

        if (cancelled) return;

        if (response.ok && data?.success) {
          setForm(userToForm(data.data));
        } else {
          setLoadError(data?.message ?? "Unable to load user details.");
        }
      } catch (error) {
        console.log(error);
        if (!cancelled) {
          setLoadError("Unable to load user details.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [isView, isEdit, editingId, navigate]);

  const pageTitle = isView ? "View user" : isEdit ? "Edit user" : "Add User";

  const selectedRoleName =
    form.roleName ||
    roles.find((role) => String(role.id) === String(form.roleId))?.role_name ||
    "";

  const updateField = (field) => (e) => {
    if (isView) return;

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

  const updateToggleField = (field) => (e) => {
    if (isView) return;

    setForm({
      ...form,
      [field]: e.target.checked,
    });
    if (errors.form) {
      setErrors({
        ...errors,
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

    if (!isEdit && !isView) {
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

    if (isEdit && form.password) {
      if (form.password.length < 6) {
        nextErrors.password = "Password must be at least 6 characters.";
      }
      if (form.confirmPassword !== form.password) {
        nextErrors.confirmPassword = "Passwords do not match.";
      }
    }

    if (!form.roleId) {
      nextErrors.roleId = "Role is required.";
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
    roleId: apiErrors.role_id?.[0] ?? "",
    form: apiErrors.non_field_errors?.[0] ?? "",
  });

  const buildUserPayload = ({ includePassword = true } = {}) => {
    const payload = {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      role_id: Number(form.roleId),
      is_active: Boolean(form.isActive),
    };

    if (includePassword && form.password) {
      payload.password = form.password;
    }

    return payload;
  };

  const addUser = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await apiFetch("/users/create/", {
        method: "POST",
        body: JSON.stringify({
          ...buildUserPayload({ includePassword: true }),
          password: form.password,
        }),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (response.ok && data?.success) {
        navigate("/users", {
          state: { toast: data.message ?? "User created successfully." },
        });
        return;
      }

      if (data?.errors) {
        if (typeof data.errors === "string") {
          setErrors({ ...emptyErrors, form: data.errors });
        } else {
          setErrors(mapApiErrors(data.errors));
        }
      } else {
        setErrors({
          ...emptyErrors,
          form: data?.message ?? "Unable to create user. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to create user. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateUser = async () => {
    if (!validate() || submitting || !editingId) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await apiFetch(`/users/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(buildUserPayload()),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (response.ok && data?.success) {
        navigate("/users", {
          state: { toast: data.message ?? "User updated successfully." },
        });
        return;
      }

      if (data?.errors) {
        if (typeof data.errors === "string") {
          setErrors({ ...emptyErrors, form: data.errors });
        } else {
          setErrors(mapApiErrors(data.errors));
        }
      } else {
        setErrors({
          ...emptyErrors,
          form: data?.message ?? "Unable to update user. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to update user. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isEdit) {
      updateUser();
    } else {
      addUser();
    }
  };

  const startEdit = () => {
    navigate(`/edit_user/${editingId}`);
  };

  if (permissionsLoading || loading) {
    return (
      <section className="panel" aria-labelledby="user-form-heading">
        <h2 id="user-form-heading" className="panel__title">
          {pageTitle}
        </h2>
        <p className="empty">
          {loading ? "Loading user..." : "Loading permissions..."}
        </p>
      </section>
    );
  }

  if (!can("users", requiredAction)) {
    return <Navigate to={homePath} replace />;
  }

  if (loadError) {
    return (
      <section className="panel" aria-labelledby="user-form-heading">
        <h2 id="user-form-heading" className="panel__title">
          {pageTitle}
        </h2>
        <p className="field__error">{loadError}</p>
        <div className="form-actions">
          <Link to="/users" className="btn btn--secondary">
            Back to listing
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`panel${isView ? " panel--view" : ""}`}
      aria-labelledby="user-form-heading"
    >
      <h2 id="user-form-heading" className="panel__title">
        {pageTitle}
      </h2>

      <div className="form-grid">
        <div className={`field${errors.firstName ? " field--error" : ""}`}>
          <label htmlFor="user-first-name">
            First name {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="user-first-name"
            type="text"
            autoComplete="given-name"
            placeholder="e.g. Alex"
            value={form.firstName}
            onChange={updateField("firstName")}
            readOnly={isView}
            aria-invalid={Boolean(errors.firstName)}
          />
          {errors.firstName && (
            <p className="field__error">{errors.firstName}</p>
          )}
        </div>

        <div className={`field${errors.lastName ? " field--error" : ""}`}>
          <label htmlFor="user-last-name">
            Last name {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="user-last-name"
            type="text"
            autoComplete="family-name"
            placeholder="e.g. Rivera"
            value={form.lastName}
            onChange={updateField("lastName")}
            readOnly={isView}
            aria-invalid={Boolean(errors.lastName)}
          />
          {errors.lastName && (
            <p className="field__error">{errors.lastName}</p>
          )}
        </div>

        <div
          className={`field field--full${errors.email ? " field--error" : ""}`}
        >
          <label htmlFor="user-email">
            Email {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="user-email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={updateField("email")}
            readOnly={isView}
            aria-invalid={Boolean(errors.email)}
          />
          {errors.email && <p className="field__error">{errors.email}</p>}
        </div>

        {!isView && (
          <>
            <div className={`field${errors.password ? " field--error" : ""}`}>
              <label htmlFor="user-password">
                Password{" "}
                {!isEdit && <span className="field__required">*</span>}
              </label>
              <input
                id="user-password"
                type="password"
                autoComplete="new-password"
                placeholder={
                  isEdit
                    ? "Leave blank to keep current password"
                    : "At least 6 characters"
                }
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
              <label htmlFor="user-confirm-password">
                Confirm password{" "}
                {!isEdit && <span className="field__required">*</span>}
              </label>
              <input
                id="user-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder={
                  isEdit
                    ? "Leave blank to keep current password"
                    : "Re-enter password"
                }
                value={form.confirmPassword}
                onChange={updateField("confirmPassword")}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
              {errors.confirmPassword && (
                <p className="field__error">{errors.confirmPassword}</p>
              )}
            </div>
          </>
        )}

        <div
          className={`field field--full${errors.roleId ? " field--error" : ""}`}
        >
          <label htmlFor="user-role">
            Role {!isView && <span className="field__required">*</span>}
          </label>
          {isView ? (
            <input
              id="user-role"
              type="text"
              value={selectedRoleName}
              readOnly
            />
          ) : (
            <select
              id="user-role"
              value={form.roleId}
              onChange={updateField("roleId")}
              aria-invalid={Boolean(errors.roleId)}
              disabled={rolesLoading}
            >
              <option value="">
                {rolesLoading ? "Loading roles..." : "Select a role"}
              </option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.role_name}
                </option>
              ))}
            </select>
          )}
          {errors.roleId && <p className="field__error">{errors.roleId}</p>}
        </div>

        <div className="field field--full">
          <div className="switch-field">
            <div>
              <label htmlFor="user-is-active">User status</label>
              <p className="switch-field__hint">
                Inactive users cannot log in.
              </p>
            </div>
            {isView ? (
              <span
                className={`status-pill ${
                  form.isActive ? "status-pill--active" : "status-pill--inactive"
                }`}
              >
                {form.isActive ? "Active" : "Inactive"}
              </span>
            ) : (
              <label className="switch" htmlFor="user-is-active">
                <input
                  id="user-is-active"
                  type="checkbox"
                  checked={Boolean(form.isActive)}
                  onChange={updateToggleField("isActive")}
                />
                <span className="switch__slider" aria-hidden="true" />
                <span className="switch__text">
                  {form.isActive ? "Active" : "Inactive"}
                </span>
              </label>
            )}
          </div>
        </div>
      </div>

      {errors.form && <p className="field__error">{errors.form}</p>}

      <div className="form-actions">
        <Link to="/users" className="btn btn--secondary">
          {isView ? "Back to listing" : "Cancel"}
        </Link>
        {isView ? (
          canUpdate && (
            <button type="button" className="btn btn--primary" onClick={startEdit}>
              Edit user
            </button>
          )
        ) : (
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting
              ? "Saving..."
              : isEdit
                ? "Save changes"
                : "Add User"}
          </button>
        )}
      </div>
    </section>
  );
}

export default AddUser;
