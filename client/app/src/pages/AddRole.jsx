import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../auth";
import RolePermissions, {
  buildPermissionsPayload,
  createEmptyPermissions,
  permissionsFromApi,
} from "../components/RolePermissions";
import { fetchModules } from "../modules";
import { usePermissions } from "../permissions";

const emptyForm = {
  roleName: "",
  description: "",
};

const emptyErrors = {
  roleName: "",
  description: "",
  form: "",
};

const roleToForm = (role) => ({
  roleName: role?.role_name ?? "",
  description: role?.description ?? "",
});

function AddRole({ mode = "add" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, loading: permissionsLoading, homePath } = usePermissions();
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const editingId = isView || isEdit ? id : null;
  const requiredAction = isView ? "read" : isEdit ? "update" : "create";
  const canUpdate = can("roles", "update");

  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState(emptyErrors);
  const [loading, setLoading] = useState(isView || isEdit);
  const [loadError, setLoadError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [modules, setModules] = useState([]);
  const [modulesLoading, setModulesLoading] = useState(true);
  const [permissions, setPermissions] = useState({});
  const [savedPermissions, setSavedPermissions] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const loadModules = async () => {
      setModulesLoading(true);
      try {
        const nextModules = await fetchModules();
        if (cancelled) return;
        setModules(nextModules);
      } catch (error) {
        console.log(error);
        if (error?.status === 401) {
          return;
        }
        if (!cancelled) setModules([]);
      } finally {
        if (!cancelled) setModulesLoading(false);
      }
    };

    loadModules();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if ((!isView && !isEdit) || !editingId) {
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      setLoadError("");

      try {
        const response = await apiFetch(`/roles/${editingId}`);

        if (response.status === 401) {
          return;
        }

        const data = await response.json();

        if (response.ok && data?.success) {
          setForm(roleToForm(data.data));
          setSavedPermissions(data.data?.permissions ?? []);
        } else {
          setLoadError(data?.message ?? "Unable to load role details.");
        }
      } catch (error) {
        console.log(error);
        setLoadError("Unable to load role details.");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [isView, isEdit, editingId, navigate]);

  // Merge modules + saved API permissions into checkbox state
  useEffect(() => {
    if (!modules.length) return;

    if (savedPermissions) {
      setPermissions(permissionsFromApi(modules, savedPermissions));
    } else if (!isView && !isEdit) {
      setPermissions(createEmptyPermissions(modules));
    }
  }, [modules, savedPermissions, isView, isEdit]);

  const pageTitle = isView ? "View role" : isEdit ? "Edit role" : "Add Role";

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

  const validate = () => {
    const nextErrors = { ...emptyErrors };

    if (!form.roleName.trim()) {
      nextErrors.roleName = "Role name is required.";
    } else if (form.roleName.trim().length < 2) {
      nextErrors.roleName = "Role name must be at least 2 characters.";
    }

    setErrors(nextErrors);
    return !Object.values(nextErrors).some((msg) => msg !== "");
  };

  const mapApiErrors = (apiErrors = {}) => ({
    roleName: apiErrors.role_name?.[0] ?? "",
    description: apiErrors.description?.[0] ?? "",
    form: apiErrors.non_field_errors?.[0] ?? "",
  });

  const buildRolePayload = () => ({
    role_name: form.roleName.trim(),
    description: form.description.trim(),
    permissions: buildPermissionsPayload(modules, permissions),
  });

  const addRole = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await apiFetch("/roles/create/", {
        method: "POST",
        body: JSON.stringify(buildRolePayload()),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (response.ok && data?.success) {
        navigate("/roles", { state: { toast: data.message } });
        return;
      }

      if (data?.errors) {
        setErrors(mapApiErrors(data.errors));
      } else {
        setErrors({
          ...emptyErrors,
          form: data?.message ?? "Unable to create role. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to create role. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const updateRole = async () => {
    if (!validate() || submitting) return;

    setSubmitting(true);
    setErrors(emptyErrors);

    try {
      const response = await apiFetch(`/roles/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(buildRolePayload()),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (response.ok && data?.success) {
        navigate("/roles", {
          state: { toast: data?.message ?? "Role updated successfully." },
        });
        return;
      }

      if (data?.errors) {
        setErrors(mapApiErrors(data.errors));
      } else {
        setErrors({
          ...emptyErrors,
          form: data?.message ?? "Unable to update role. Please try again.",
        });
      }
    } catch (error) {
      console.log(error);
      setErrors({
        ...emptyErrors,
        form: "Unable to update role. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (isEdit) {
      updateRole();
    } else {
      addRole();
    }
  };

  const startEdit = () => {
    navigate(`/edit_role/${editingId}`);
  };

  if (permissionsLoading || loading) {
    return (
      <section className="panel" aria-labelledby="role-form-heading">
        <p className="book-form__status">
          {loading ? "Loading role details..." : "Loading permissions..."}
        </p>
      </section>
    );
  }

  if (!can("roles", requiredAction)) {
    return <Navigate to={homePath} replace />;
  }

  if (loadError) {
    return (
      <section className="panel" aria-labelledby="role-form-heading">
        <p className="book-form__status book-form__status--error">{loadError}</p>
        <div className="form-actions">
          <Link to="/roles" className="btn btn--secondary">
            Back to listing
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`panel${isView ? " panel--view" : ""}`}
      aria-labelledby="role-form-heading"
    >
      <h2 id="role-form-heading" className="panel__title">
        {pageTitle}
      </h2>

      <div className="form-grid">
        <div
          className={`field field--full${errors.roleName ? " field--error" : ""}`}
        >
          <label htmlFor="role-name">
            Role name {!isView && <span className="field__required">*</span>}
          </label>
          <input
            id="role-name"
            type="text"
            placeholder="e.g. Admin"
            value={form.roleName}
            onChange={updateField("roleName")}
            readOnly={isView}
            aria-invalid={Boolean(errors.roleName)}
          />
          {errors.roleName && (
            <p className="field__error">{errors.roleName}</p>
          )}
        </div>

        <div
          className={`field field--full${errors.description ? " field--error" : ""}`}
        >
          <label htmlFor="role-description">Description</label>
          <textarea
            id="role-description"
            placeholder="Describe this role..."
            value={form.description}
            onChange={updateField("description")}
            readOnly={isView}
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description && (
            <p className="field__error">{errors.description}</p>
          )}
        </div>
      </div>

      <RolePermissions
        modules={modules}
        permissions={permissions}
        onChange={setPermissions}
        readOnly={isView}
        loading={modulesLoading}
      />

      {errors.form && <p className="field__error">{errors.form}</p>}

      <div className="form-actions">
        <Link to="/roles" className="btn btn--secondary">
          {isView ? "Back to listing" : "Cancel"}
        </Link>
        {isView ? (
          canUpdate && (
            <button type="button" className="btn btn--primary" onClick={startEdit}>
              Edit role
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
                : "Add Role"}
          </button>
        )}
      </div>
    </section>
  );
}

export default AddRole;
