import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import { DeleteIcon, EditIcon, ViewIcon } from "../components/ActionIcons";
import { apiFetch } from "../auth";
import { usePermissions } from "../permissions";

const emptyPagination = {
  current_page: 1,
  page_size: 5,
  total_records: 0,
  total_pages: 1,
  has_next: false,
  has_previous: false,
};

function UserManagement({ showToast }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canCreate = can("users", "create");
  const canUpdate = can("users", "update");
  const canDelete = can("users", "delete");
  const canRead = can("users", "read");
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = pagination.page_size || 5;

  const fetchUsers = async (page = 1, options = {}) => {
    const { showSuccessMessage = false } = options;
    setLoading(true);

    try {
      const response = await apiFetch("/users/", {
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
        setUsers(data?.data ?? []);
        setPagination(data?.pagination ?? emptyPagination);
        if (showSuccessMessage && data?.message) {
          showToast?.(data.message);
        }
      } else {
        showToast?.(data?.message ?? "Unable to load users.", "error");
      }
    } catch (error) {
      console.log(error);
      showToast?.("Unable to load users.", "error");
    } finally {
      setLoading(false);
    }
  };

  const goToPage = (page) => {
    if (page < 1 || page > pagination.total_pages) return;
    if (page === pagination.current_page) return;
    fetchUsers(page);
  };

  useEffect(() => {
    fetchUsers(1, { showSuccessMessage: true });
  }, []);

  useEffect(() => {
    if (location.state?.toast) {
      showToast?.(location.state.toast);
      fetchUsers(1);
      navigate("/users", { replace: true, state: {} });
    }
  }, [location.state, navigate, showToast]);

  const startEdit = (user) => {
    navigate(`/edit_user/${user.user_id}`);
  };

  const viewUser = (user) => {
    navigate(`/view_user/${user.user_id}`);
  };

  const deleteUser = async () => {
    if (!pendingDelete || deleting) return;

    const userId = pendingDelete.id;
    setDeleting(true);
    try {
      const response = await apiFetch(`/users/${userId}`, {
        method: "DELETE",
      });

      if (response.status === 401) {
        return;
      }

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        showToast?.(data?.message ?? "User deleted successfully.");
        setPendingDelete(null);

        const isLastItemOnPage =
          users.length === 1 && pagination.current_page > 1;
        const pageToLoad = isLastItemOnPage
          ? pagination.current_page - 1
          : pagination.current_page;
        fetchUsers(pageToLoad);
      } else {
        showToast?.(data?.message ?? "Unable to delete user.", "error");
      }
    } catch (error) {
      console.log(error);
      showToast?.("Unable to delete user.", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <section className="library" aria-labelledby="users-heading">
        <div className="library__header">
          <div className="library__header-left">
            <h2 id="users-heading" className="library__title">
              User management
            </h2>
            <p className="library__count">
              {pagination.total_records}{" "}
              {pagination.total_records === 1 ? "user" : "users"}
            </p>
          </div>
          {canCreate && (
            <Link to="/add_user" className="btn btn--primary">
              Add User
            </Link>
          )}
        </div>

        {loading ? (
          <p className="empty">Loading users...</p>
        ) : users.length === 0 ? (
          <p className="empty">
            No users yet.
            {canCreate ? " Add your first one." : ""}
          </p>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">First name</th>
                    <th scope="col">Last name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Role name</th>
                    <th scope="col">Status</th>
                    {(canRead || canUpdate || canDelete) && (
                      <th scope="col" className="data-table__actions-col">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.user_id}>
                      <td>
                        <span className="data-table__title">
                          {user.first_name}
                        </span>
                      </td>
                      <td>{user.last_name}</td>
                      <td>{user.email}</td>
                      <td>
                        {user.role_name ? (
                          <span className="chip chip--mint">{user.role_name}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${
                            user.is_active
                              ? "status-pill--active"
                              : "status-pill--inactive"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      {(canRead || canUpdate || canDelete) && (
                        <td>
                          <div className="book__actions">
                            {canRead && (
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label={`View ${user.first_name} ${user.last_name}`}
                                title="View"
                                onClick={() => viewUser(user)}
                              >
                                <ViewIcon />
                              </button>
                            )}
                            {canUpdate && (
                              <button
                                type="button"
                                className="icon-btn"
                                aria-label={`Edit ${user.first_name} ${user.last_name}`}
                                title="Edit"
                                onClick={() => startEdit(user)}
                              >
                                <EditIcon />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                className="icon-btn icon-btn--danger"
                                aria-label={`Delete ${user.first_name} ${user.last_name}`}
                                title="Delete"
                                onClick={() =>
                                  setPendingDelete({
                                    id: user.user_id,
                                    name: `${user.first_name} ${user.last_name}`,
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

            <nav className="pagination" aria-label="Users pagination">
              <p className="pagination__info">
                Page {pagination.current_page} of {pagination.total_pages || 1}
                <span className="pagination__sep">·</span>
                {pagination.total_records} users
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
                    { length: Math.max(pagination.total_pages || 1, 1) },
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
        title="Delete user"
        message="Are you sure you want to delete"
        itemName={pendingDelete?.name}
        confirmLabel="Delete user"
        onConfirm={deleteUser}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}

export default UserManagement;
