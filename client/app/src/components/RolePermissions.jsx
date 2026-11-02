const PERMISSION_ACTIONS = [
  { key: "can_read", label: "View" },
  { key: "can_create", label: "Add" },
  { key: "can_update", label: "Edit" },
  { key: "can_delete", label: "Delete" },
];

export function createEmptyPermissions(modules = []) {
  return modules?.reduce((acc, module) => {
    acc[module?.id] = {
      can_read: false,
      can_create: false,
      can_update: false,
      can_delete: false,
    };
    return acc;
  }, {});
}

export function buildPermissionsPayload(modules = [], permissions = {}) {
  return modules?.map((module) => ({
    module_id: Number(module?.id),
    module_name: module?.label,
    can_create: Boolean(permissions[module?.id]?.can_create),
    can_read: Boolean(permissions[module?.id]?.can_read),
    can_update: Boolean(permissions[module?.id]?.can_update),
    can_delete: Boolean(permissions[module?.id]?.can_delete),
  }));
}

export function permissionsFromApi(modules = [], apiPermissions = []) {
  const next = createEmptyPermissions(modules);

  apiPermissions?.forEach((item) => {
    const id = String(item?.module_id);
    if (!next[id]) return;

    next[id] = {
      can_create: Boolean(item?.can_create),
      can_read: Boolean(item?.can_read),
      can_update: Boolean(item?.can_update),
      can_delete: Boolean(item?.can_delete),
    };
  });

  return next;
}

function RolePermissions({
  modules = [],
  permissions,
  onChange,
  readOnly = false,
  loading = false,
}) {
  const togglePermission = (moduleId, action) => {
    if (readOnly) return;

    onChange({
      ...permissions,
      [moduleId]: {
        ...permissions[moduleId],
        [action]: !permissions[moduleId]?.[action],
      },
    });
  };

  const isAllChecked = (moduleId) =>
    PERMISSION_ACTIONS.every(({ key }) => permissions[moduleId]?.[key]);

  const toggleAll = (moduleId) => {
    if (readOnly) return;

    const nextValue = !isAllChecked(moduleId);
    onChange({
      ...permissions,
      [moduleId]: PERMISSION_ACTIONS.reduce(
        (acc, { key }) => ({ ...acc, [key]: nextValue }),
        {}
      ),
    });
  };

  return (
    <div className="permissions-panel">
      <div className="permissions-panel__header">
        <h3 className="permissions-panel__title">Shelf</h3>
      </div>

      <div className="permissions-panel__table-wrap">
        {loading ? (
          <p className="permissions-panel__status">Loading modules...</p>
        ) : modules?.length === 0 ? (
          <p className="permissions-panel__status">No modules found.</p>
        ) : (
          <table className="permissions-table">
            <thead>
              <tr>
                <th scope="col" className="permissions-table__module-col">
                  Module
                </th>
                {PERMISSION_ACTIONS.map(({ key, label }) => (
                  <th
                    key={key}
                    scope="col"
                    className="permissions-table__action-col"
                  >
                    {label}
                  </th>
                ))}
                <th scope="col" className="permissions-table__action-col">
                  All
                </th>
              </tr>
            </thead>
            <tbody>
              {modules?.map((module) => (
                <tr key={module?.id}>
                  <th scope="row" className="permissions-table__module">
                    {module?.label}
                  </th>
                  {PERMISSION_ACTIONS.map(({ key }) => (
                    <td key={key} className="permissions-table__cell">
                      <label className="permissions-table__check">
                        <input
                          type="checkbox"
                          checked={Boolean(permissions[module?.id]?.[key])}
                          onChange={() => togglePermission(module?.id, key)}
                          disabled={readOnly}
                          aria-label={`${module?.label} ${key}`}
                        />
                      </label>
                    </td>
                  ))}
                  <td className="permissions-table__cell">
                    <label className="permissions-table__check">
                      <input
                        type="checkbox"
                        checked={isAllChecked(module?.id)}
                        onChange={() => toggleAll(module?.id)}
                        disabled={readOnly}
                        aria-label={`All permissions for ${module?.label}`}
                      />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default RolePermissions;
