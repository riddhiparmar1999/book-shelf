import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../auth";
import { usePermissions } from "../permissions";

const emptyStats = {
  total_users: 0,
  total_roles: 0,
  total_books: 0,
  books_added_today: 0,
  users_added_today: 0,
};

function Dashboard({ showToast }) {
  const { can } = usePermissions();
  const [stats, setStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchDashboard = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await apiFetch("/dashboard/");

        if (response.status === 401) {
          return;
        }

        const data = await response.json().catch(() => ({}));

        if (cancelled) return;

        if (response.ok && data?.success) {
          setStats({
            ...emptyStats,
            ...(data.data ?? {}),
          });
          if (data?.message) {
            showToast?.(data.message);
          }
        } else {
          setError(data?.message ?? "Unable to load dashboard.");
          showToast?.(data?.message ?? "Unable to load dashboard.", "error");
        }
      } catch (err) {
        console.log(err);
        if (!cancelled) {
          setError("Unable to load dashboard.");
          showToast?.("Unable to load dashboard.", "error");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchDashboard();

    return () => {
      cancelled = true;
    };
  }, [showToast]);

  const cards = [
    {
      key: "total_users",
      label: "Total users",
      value: stats.total_users,
      to: can("users", "read") ? "/users" : null,
      tone: "mint",
    },
    {
      key: "total_roles",
      label: "Total roles",
      value: stats.total_roles,
      to: can("roles", "read") ? "/roles" : null,
      tone: "lime",
    },
    {
      key: "total_books",
      label: "Total books",
      value: stats.total_books,
      to: can("books", "read") ? "/books" : null,
      tone: "cyan",
    },
    {
      key: "books_added_today",
      label: "Books added today",
      value: stats.books_added_today,
      to: can("books", "read") ? "/books" : null,
      tone: "orange",
    },
    {
      key: "users_added_today",
      label: "Users added today",
      value: stats.users_added_today,
      to: can("users", "read") ? "/users" : null,
      tone: "mint",
    },
  ];

  return (
    <section className="dashboard" aria-labelledby="dashboard-heading">
      <div className="dashboard__header">
        <div>
          <h2 id="dashboard-heading" className="dashboard__title">
            Dashboard
          </h2>
          <p className="dashboard__subtitle">
            A quick look at users, roles, and books across Shelf.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="empty">Loading dashboard...</p>
      ) : error ? (
        <p className="empty">{error}</p>
      ) : (
        <>
          <div className="dashboard__grid">
            {cards.map((card) => {
              const content = (
                <>
                  <p className="dashboard-stat__label">{card.label}</p>
                  <p className="dashboard-stat__value">{card.value}</p>
                </>
              );

              if (card.to) {
                return (
                  <Link
                    key={card.key}
                    to={card.to}
                    className={`dashboard-stat dashboard-stat--${card.tone} dashboard-stat--link`}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div
                  key={card.key}
                  className={`dashboard-stat dashboard-stat--${card.tone}`}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default Dashboard;
