/**
 * rowSx para Datagrid de react-admin.
 * Pinta de rojo claro las filas con soft-delete (deletedAt != null),
 * pero solo si el usuario es SuperAdmin.
 */
export const useDeletedRowSx = () => {
    const isSuperAdmin = sessionStorage.getItem('role') === 'SuperAdmin';

    if (!isSuperAdmin) return undefined;

    return (record) =>
        record?.deletedAt
            ? { backgroundColor: '#fff1f1', '&:hover': { backgroundColor: '#ffe4e4 !important' } }
            : {};
};
