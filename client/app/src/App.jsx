import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";
import AddBook from "./pages/AddBook";
import AddRole from "./pages/AddRole";
import AddUser from "./pages/AddUser";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Placeholder from "./pages/Placeholder";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import RoleManagement from "./pages/RoleManagement";
import UserManagement from "./pages/UserManagement";
import { getStoredUser, logout, consumeSessionExpiredMessage } from "./auth";
import { fetchModules } from "./modules";
import { PermissionsProvider, RequirePermission } from "./permissions";
import { ProfileIcon } from "./components/ActionIcons";
import "./App.css";

function Toast({ toast, onClose }) {
  if (!toast) return null;

  return (
    <div
      className={`toast toast--${toast.type}`}
      role="status"
      aria-live="polite"
    >
      <p className="toast__message">{toast.message}</p>
      <button
        type="button"
        className="toast__close"
        aria-label="Dismiss notification"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}

function LogoMark({ to = "/" }) {
  return (
    <Link to={to} className="logo" aria-label="Shelf home">
      <span className="logo__mark" aria-hidden="true" />
      <span className="logo__text">Shelf</span>
    </Link>
  );
}

function AuthLayout({ children, toast, onCloseToast }) {
  return (
    <div className="app app--auth">
      <Toast toast={toast} onClose={onCloseToast} />
      <header className="brand">
        <div className="brand__top">
          <LogoMark to="/" />
          <nav className="brand__nav" aria-label="Account">
            <Link to="/" className="brand__nav-link">
              Log in
            </Link>
            <Link to="/register" className="btn btn--primary brand__nav-btn">
              Register
            </Link>
          </nav>
        </div>
        <p className="brand__tag">
          Add books to your library and keep titles, authors, and prices in one
          place.
        </p>
      </header>
      {children}
    </div>
  );
}

function AppLayout({
  children,
  toast,
  onCloseToast,
  user,
  onLogout,
  loggingOut,
  navItems,
  navLoading,
}) {
  return (
    <div className="app app--shell">
      <Toast toast={toast} onClose={onCloseToast} />

      <div className="shell">
        <aside className="sidebar" aria-label="Main navigation">
          <div className="sidebar__brand">
            <LogoMark to={navItems[0]?.path || "/dashboard"} />
          </div>

          <nav className="sidebar__nav">
            {navLoading ? (
              <p className="sidebar__status">Loading modules...</p>
            ) : navItems.length === 0 ? (
              <p className="sidebar__status">No modules found.</p>
            ) : (
              navItems.map((item) => (
                <NavLink
                  key={`${item.id}-${item.path}`}
                  to={item.path}
                  className={({ isActive }) =>
                    `sidebar__link${isActive ? " sidebar__link--active" : ""}`
                  }
                >
                  {item.label}
                </NavLink>
              ))
            )}
          </nav>
        </aside>

        <div className="shell__main">
          <header className="topbar">
            <LogoMark to={navItems[0]?.path || "/dashboard"} />
            <div className="topbar__actions">
              {user?.first_name && (
                <span className="topbar__greeting">
                  Hi, {user?.first_name} {user?.last_name}
                </span>
              )}
              <Link
                to="/profile"
                className="icon-btn topbar__profile"
                aria-label="View profile"
                title="Profile"
              >
                <ProfileIcon />
              </Link>
              <button
                type="button"
                className="btn btn--ghost topbar__logout"
                onClick={onLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
            </div>
          </header>

          <main className="shell__content">{children}</main>
        </div>
      </div>
    </div>
  );
}

function AppShell({ toast, onCloseToast, user, showToast, onLogin, onLogout }) {
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [navItems, setNavItems] = useState([]);
  const [navLoading, setNavLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      setNavItems([]);
      setNavLoading(false);
      return;
    }

    let cancelled = false;

    const loadModules = async () => {
      setNavLoading(true);
      try {
        const modules = await fetchModules();
        if (!cancelled) setNavItems(modules);
      } catch (error) {
        console.log(error);
        if (error?.status === 401) {
          return;
        }
        if (!cancelled) setNavItems([]);
      } finally {
        if (!cancelled) setNavLoading(false);
      }
    };

    loadModules();

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  useEffect(() => {
    const onSessionExpired = (event) => {
      const message =
        event.detail?.message ??
        "Your session has expired. Please log in again.";
      showToast(message, "error");
      navigate("/", { replace: true });
    };

    window.addEventListener("session-expired", onSessionExpired);
    return () => window.removeEventListener("session-expired", onSessionExpired);
  }, [navigate, showToast]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const result = await onLogout();
      showToast?.(result?.message ?? "Logged out successfully.");
      navigate("/");
    } finally {
      setLoggingOut(false);
    }
  };

  if (!user) {
    return (
      <AuthLayout toast={toast} onCloseToast={onCloseToast}>
        <Routes>
          <Route
            path="/"
            element={<Landing showToast={showToast} onLogin={onLogin} />}
          />
          <Route
            path="/register"
            element={<Register showToast={showToast} />}
          />
          <Route
            path="/forgot-password"
            element={<ForgotPassword showToast={showToast} />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword showToast={showToast} />}
          />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthLayout>
    );
  }

  const homePath = navItems[0]?.path || "/dashboard";

  return (
    <PermissionsProvider modules={navItems} loading={navLoading}>
      <AppLayout
        toast={toast}
        onCloseToast={onCloseToast}
        user={user}
        onLogout={handleLogout}
        loggingOut={loggingOut}
        navItems={navItems}
        navLoading={navLoading}
      >
        <Routes>
          <Route path="/" element={<Navigate to={homePath} replace />} />
          <Route
            path="/dashboard"
            element={
              <RequirePermission module="dashboard">
                <Dashboard showToast={showToast} />
              </RequirePermission>
            }
          />
          <Route
            path="/profile"
            element={<Profile showToast={showToast} />}
          />
          <Route
            path="/reviews"
            element={
              <RequirePermission module="reviews">
                <Placeholder title="Reviews & Ratings" />
              </RequirePermission>
            }
          />
          <Route
            path="/reports"
            element={
              <RequirePermission module="reports">
                <Placeholder title="Reports" />
              </RequirePermission>
            }
          />
          <Route
            path="/books"
            element={
              <RequirePermission module="books">
                <Home showToast={showToast} />
              </RequirePermission>
            }
          />
          <Route
            path="/roles"
            element={
              <RequirePermission module="roles">
                <RoleManagement showToast={showToast} />
              </RequirePermission>
            }
          />
          <Route
            path="/users"
            element={
              <RequirePermission module="users">
                <UserManagement showToast={showToast} />
              </RequirePermission>
            }
          />
          <Route path="/add_user" element={<AddUser mode="add" />} />
          <Route
            path="/edit_user/:id"
            element={
              <RequirePermission module="users" action="update">
                <AddUser mode="edit" />
              </RequirePermission>
            }
          />
          <Route
            path="/view_user/:id"
            element={
              <RequirePermission module="users" action="read">
                <AddUser mode="view" />
              </RequirePermission>
            }
          />
          <Route path="/add_role" element={<AddRole mode="add" />} />
          <Route
            path="/edit_role/:id"
            element={
              <RequirePermission module="roles" action="update">
                <AddRole mode="edit" />
              </RequirePermission>
            }
          />
          <Route
            path="/view_role/:id"
            element={
              <RequirePermission module="roles" action="read">
                <AddRole mode="view" />
              </RequirePermission>
            }
          />
          <Route path="/add_book" element={<AddBook mode="add" />} />
          <Route
            path="/edit_book/:id"
            element={
              <RequirePermission module="books" action="update">
                <AddBook mode="edit" />
              </RequirePermission>
            }
          />
          <Route
            path="/view_book/:id"
            element={
              <RequirePermission module="books" action="read">
                <AddBook mode="view" />
              </RequirePermission>
            }
          />
          <Route path="/login" element={<Navigate to={homePath} replace />} />
          <Route
            path="/register"
            element={<Navigate to={homePath} replace />}
          />
          <Route path="*" element={<Navigate to={homePath} replace />} />
        </Routes>
      </AppLayout>
    </PermissionsProvider>
  );
}

function App() {
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(() => getStoredUser());

  const showToast = (message, type = "success") => {
    setToast({ message, type });
  };

  const handleLogin = (nextUser) => {
    setUser(nextUser);
  };

  const handleLogout = async () => {
    const result = await logout();
    setUser(null);
    return result;
  };

  useEffect(() => {
    const syncUser = () => setUser(getStoredUser());
    window.addEventListener("auth-changed", syncUser);
    return () => window.removeEventListener("auth-changed", syncUser);
  }, []);

  useEffect(() => {
    if (user) return;

    const message = consumeSessionExpiredMessage();
    if (message) {
      setToast({ message, type: "error" });
    }
  }, [user]);

  useEffect(() => {
    if (!toast) return;

    const timer = setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <BrowserRouter>
      <AppShell
        toast={toast}
        onCloseToast={() => setToast(null)}
        user={user}
        showToast={showToast}
        onLogin={handleLogin}
        onLogout={handleLogout}
      />
    </BrowserRouter>
  );
}

export default App;
