import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../auth";
import ConfirmDialog from "../components/ConfirmDialog";
import { DeleteIcon, EditIcon, ViewIcon } from "../components/ActionIcons";
import { usePermissions } from "../permissions";

const emptyPagination = {
  current_page: 1,
  page_size: 5,
  total_records: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function RoleManagement({ showToast }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canCreate = can("roles", "create");
  const canUpdate = can("roles", "update");
  const canDelete = can("roles", "delete");
  const canRead = can("roles", "read");
  const [roles, setRoles] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = pagination.page_size || 5;

  const fetchRoles = async (page = 1, options = {}) => {
    const { showSuccessMessage = false } = options;
    setLoading(true);

    try {
      const response = await apiFetch("/roles/", {
        method: "POST",
        body: JSON.stringify({
          page,
          page_size: pageSize,
        }),
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json();

      if (response.ok && data?.success) {
        setRoles(data?.data ?? []);
        setPagination(data?.pagination ?? emptyPagination);
        if (showSuccessMessage && data?.message) {
          showToast?.(data.message);
        }
      } else {
        showToast?.(data?.message ?? "Unable to load roles.", "error");
      }
    } catch (error) {
      console.log(error);
      showToast?.("Unable to load roles.", "error");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.total_pages) return;
    if (page === pagination.current_page) return;
    fetchRoles(page);
  };

  useEffect(() => {
    fetchRoles(1, { showSuccessMessage: true });
  }, []);

  useEffect(() => {
    if (location.state?.toast) {
      showToast(location.state.toast);
      fetchRoles(1);
      navigate("/roles", { replace: true, state: {} });
    }
  }, [location.state, navigate, showToast]);

  const startEdit = (role) => {
    navigate(`/edit_role/${role.id}`);
  };

  const viewRole = (id) => {
    navigate(`/view_role/${id}`);
  };

  const deleteRole = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      const response = await apiFetch(`/roles/${pendingDelete.id}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        showToast?.(data?.message ?? "Role deleted successfully.");
        setPendingDelete(null);

        const isLastItemOnPage =
          roles.length === 1 && pagination.current_page > 1;
        const pageToLoad = isLastItemOnPage
          ? pagination.current_page - 1
          : pagination.current_page;
        fetchRoles(pageToLoad);
      } else {
        showToast?.(data?.message ?? "Unable to delete role.", "error");
      }
    } catch (error) {
      console.log(error);
      showToast?.("Unable to delete role.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="library" aria-labelledby="roles-heading">
        <div className="library__header">
          <div className="library__header-left">
            <h2 id="roles-heading" className="library__title">
              Role management
            </h2>
            <p className="library__count">
              {pagination.total_records}{" "}
              {pagination.total_records === 1 ? "role" : "roles"}
            </p>
          </div>
          {canCreate && (
            <Link to="/add_role" className="btn btn--primary">
              Add Role
            </Link>
          )}
        </div>

        {loading ? (
          <p className="empty">Loading roles...</p>
        ) : roles.length === 0 ? (
          <p className="empty">
            No roles yet.
            {canCreate ? " Add your first one." : ""}
          </p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">Role name</th>
                    <th scope="col">Description</th>
                    <th scope="col">Created at</th>
                    {(canRead || canUpdate || canDelete) && (
                      <th scope="col" className="data-table__actions-col">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => (
                    <tr key={role.id}>
                      <td>
                        <span className="data-table__title">
                          {role.role_name}
                        </span>
                      </td>
                      <td>
                        <span className="data-table__sub">
                          {role.description || "—"}
                        </span>
                      </td>
                      <td>{formatDate(role.created_at)}</td>
                      {(canRead || canUpdate || canDelete) && (
                        <td>
                          <div className="book__actions">
                            {canRead && (
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label={`View ${role.role_name}`}
                                title="View"
                                onClick={() => viewRole(role.id)}
                              >
                                <ViewIcon />
                              </button>
                            )}
                            {canUpdate && (
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label={`Edit ${role.role_name}`}
                                title="Edit"
                                onClick={() => startEdit(role)}
                              >
                                <EditIcon />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="icon-btn icon-btn--danger"
                                aria-label={`Delete ${role.role_name}`}
                                title="Delete"
                                onClick={() =>
                                  setPendingDelete({
                                    id: role.id,
                                    name: role.role_name,
                                  })
                                }
                              >
                                <DeleteIcon />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <nav className="pagination" aria-label="Roles pagination">
              <p className="pagination__info">
                Page {pagination.current_page} of {pagination.total_pages || 1}
                <span className="pagination__sep">·</span>
                {pagination.total_records} roles
              </p>

              <div className="pagination__controls">
                <button
                  type="button"
                  className="pagination__btn"
                  disabled={!pagination.has_previous}
                  aria-label="Previous page"
                  onClick={() => goToPage(pagination.current_page - 1)}
                >
                  Previous
                </button>

                <div className="pagination__pages">
                  {Array.from(
                    { length: pagination.total_pages || 1 },
                    (_, index) => {
                      const page = index + 1;
                      return (
                        <button
                          key={page}
                          type="button"
                          className={`pagination__page${
                            pagination.current_page === page
                              ? " pagination__page--active"
                              : ""
                          }`}
                          aria-label={`Page ${page}`}
                          aria-current={
                            pagination.current_page === page ? "page" : undefined
                          }
                          onClick={() => goToPage(page)}
                        >
                          {page}
                        </button>
                      );
                    }
                  )}
                </div>

                <button
                  type="button"
                  className="pagination__btn"
                  disabled={!pagination.has_next}
                  aria-label="Next page"
                  onClick={() => goToPage(pagination.current_page + 1)}
                >
                  Next
                </button>
              </div>
            </nav>
          </>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete role"
        message="Are you sure you want to delete"
        itemName={pendingDelete?.name}
        confirmLabel="Delete role"
        loading={deleting}
        onConfirm={deleteRole}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default RoleManagement;
