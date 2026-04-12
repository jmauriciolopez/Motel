/**
 * @param {unknown} permissions
 * @param {string[]} roles nombres en minúsculas (p. ej. backend RolUsuario)
 */
export const hasRole = (permissions, roles = []) => {
    const normalized = String(permissions ?? '').toLowerCase();
    return roles.includes(normalized);
};

export const canManageCompras = (permissions) =>
    hasRole(permissions, ['superadmin', 'administrador', 'supervisor']);
