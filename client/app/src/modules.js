import { apiFetch } from "./auth";

const MODULE_ROUTES = {
  dashboard: "/dashboard",
  books: "/books",
  "about books": "/books",
  "user management": "/users",
  "role management": "/roles",
  "reviews & ratings": "/reviews",
  reports: "/reports",
};

/** Canonical module keys used by `can(module, action)`. */
export const MODULE_KEYS = {
  dashboard: "dashboard",
  books: "books",
  users: "users",
  roles: "roles",
  reviews: "reviews",
  reports: "reports",
};

const MODULE_ALIASES = {
  dashboard: ["dashboard"],
  books: ["books", "about books"],
  users: ["user management", "users"],
  roles: ["role management", "roles"],
  reviews: ["reviews & ratings", "reviews"],
  reports: ["reports"],
};

const EMPTY_PERMISSIONS = {
  create: false,
  read: false,
  update: false,
  delete: false,
};

export function moduleToPath(moduleName = "") {
  const key = moduleName.trim().toLowerCase();
  if (MODULE_ROUTES[key]) return MODULE_ROUTES[key];

  return `/${key.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}`;
}

export function normalizeModules(modules = []) {
  return modules?.map((module) => {
    const label = module?.module_name ?? module?.label ?? "";
    const id = String(module?.module_id ?? module?.id ?? label);
    const rawPermissions = module?.permissions ?? {};

    return {
      id,
      label,
      path: moduleToPath(label),
      permissions: {
        create: Boolean(rawPermissions.create ?? rawPermissions.can_create),
        read: Boolean(rawPermissions.read ?? rawPermissions.can_read),
        update: Boolean(rawPermissions.update ?? rawPermissions.can_update),
        delete: Boolean(rawPermissions.delete ?? rawPermissions.can_delete),
      },
      raw: module,
    };
  });
}

export function findModule(modules = [], moduleKey = "") {
  const key = String(moduleKey).trim().toLowerCase();
  const aliases = MODULE_ALIASES[key] ?? [key];

  return (
    modules.find((module) =>
      aliases.includes(String(module.label ?? "").trim().toLowerCase())
    ) ?? null
  );
}

export function getModulePermissions(modules = [], moduleKey = "") {
  const module = findModule(modules, moduleKey);
  if (!module) return { ...EMPTY_PERMISSIONS };
  return { ...EMPTY_PERMISSIONS, ...module.permissions };
}

export function canAccess(modules = [], moduleKey = "", action = "read") {
  const permissions = getModulePermissions(modules, moduleKey);
  return Boolean(permissions[action]);
}

export async function fetchModules() {
  const response = await apiFetch("/modules/");
  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.success) {
    const error = new Error(data?.message ?? "Unable to load modules.");
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return normalizeModules(data?.data ?? []);
}
