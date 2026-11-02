import { createContext, useContext, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { canAccess } from "./modules";

const PermissionsContext = createContext({
  modules: [],
  loading: true,
  homePath: "/dashboard",
  can: () => false,
});

export function PermissionsProvider({ modules = [], loading = false, children }) {
  const value = useMemo(() => {
    const homePath = modules[0]?.path || "/dashboard";

    return {
      modules,
      loading,
      homePath,
      can: (moduleKey, action = "read") =>
        canAccess(modules, moduleKey, action),
    };
  }, [modules, loading]);

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

export function RequirePermission({
  module,
  action = "read",
  fallback,
  children,
}) {
  const { can, loading, homePath, modules } = usePermissions();

  if (loading) {
    return <p className="empty">Loading permissions...</p>;
  }

  if (!can(module, action)) {
    if (!modules.length) {
      return (
        <p className="empty">
          No modules are assigned to your role. Contact an administrator.
        </p>
      );
    }

    if (fallback || homePath) {
      return <Navigate to={fallback ?? homePath} replace />;
    }

    return (
      <p className="empty">You do not have permission to view this page.</p>
    );
  }

  return children;
}
