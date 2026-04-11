import React, { useState } from 'react';
import { useDataProvider, useNotify } from 'react-admin';
import { Box, Button, CircularProgress, Tooltip } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useMotel } from '../context/MotelContext';
import { Cookies, getApiUrl } from '../helpers/Utils';

const DevResetOnboarding = () => {
    const { currentMotelId } = useMotel();
    const dataProvider = useDataProvider();
    const notify = useNotify();
    const [loading, setLoading] = useState(false);

    const handleReset = async () => {
        if (!window.confirm('¿Eliminar todo lo creado en el onboarding y reiniciar el wizard?')) return;

        setLoading(true);
        try {
            const motelId = currentMotelId;
            const token = Cookies.getCookie('token');

            // Obtener motel para resolver su propietario sin depender de filtros no soportados
            const motelData = motelId
                ? await dataProvider.getOne('moteles', { id: motelId }).catch(() => ({ data: null }))
                : { data: null };
            const propietarioId = motelData?.data?.Propietario?.id || motelData?.data?.propietario?.id || null;

            // Obtener todo lo vinculado al motel en paralelo
            const [
                { data: habitaciones },
                { data: tarifas },
                { data: depositos },
                { data: productos },
                { data: rubros },
            ] = await Promise.all([
                motelId ? dataProvider.getList('habitaciones', {
                    filter: { 'motel.id': motelId },
                    pagination: { page: 1, perPage: 200 },
                    sort: { field: 'id', order: 'ASC' }
                }) : { data: [] },
                motelId ? dataProvider.getList('tarifas', {
                    filter: { 'motel.id': motelId },
                    pagination: { page: 1, perPage: 50 },
                    sort: { field: 'id', order: 'ASC' }
                }) : { data: [] },
                motelId ? dataProvider.getList('depositos', {
                    filter: { 'motel.id': motelId },
                    pagination: { page: 1, perPage: 20 },
                    sort: { field: 'id', order: 'ASC' }
                }).catch(() => ({ data: [] })) : { data: [] },
                motelId ? dataProvider.getList('productos', {
                    filter: { 'motel.id': motelId },
                    pagination: { page: 1, perPage: 500 },
                    sort: { field: 'id', order: 'ASC' }
                }).catch(() => ({ data: [] })) : { data: [] },
                motelId ? dataProvider.getList('rubros', {
                    filter: { 'motel.id': motelId },
                    pagination: { page: 1, perPage: 100 },
                    sort: { field: 'id', order: 'ASC' }
                }).catch(() => ({ data: [] })) : { data: [] },
            ]);

            // Obtener id real del usuario actual para excluirlo
            let myNumericId = null;
            try {
                const meRes = await fetch(getApiUrl('/usuarios/me'), {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (meRes.ok) {
                    const me = await meRes.json();
                    myNumericId = me?.id;
                }
            } catch { /* no bloquear */ }

            const deleteRecord = (resource, id) =>
                fetch(getApiUrl(`/${resource}/${id}`), {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => {});

            // Obtener usuarios vinculados al motel (excepto el usuario actual)
            let motelUsers = [];
            if (motelId && token) {
                try {
                    const motelNumericRes = await fetch(
                        getApiUrl(`/usuarios/por-motel?motelId=${encodeURIComponent(motelId)}&excluirUsuarioId=${encodeURIComponent(myNumericId || '')}`),
                        { headers: { Authorization: `Bearer ${token}` } }
                    );
                    if (motelNumericRes.ok) {
                        const allUsers = await motelNumericRes.json();
                        motelUsers = allUsers || [];
                    }
                } catch { /* no bloquear */ }
            }

            // 1. Desvincular al admin actual del motel (sin borrarlo)
            if (myNumericId) {
                await fetch(getApiUrl(`/usuarios/${myNumericId}/desvincular-moteles`), {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => {});
            }

            // 2. Desvincular y eliminar usuarios secundarios del motel
            for (const u of motelUsers) {
                await fetch(getApiUrl(`/usuarios/${u.id}/desvincular-moteles`), {
                    method: 'PATCH',
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => {});
                await fetch(getApiUrl(`/usuarios/${u.id}`), {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => {});
            }

            // 3. Eliminar registros del motel (habitaciones, tarifas, depósitos, productos, rubros)
            await Promise.all([
                ...habitaciones.map(h => deleteRecord('habitaciones', h.id)),
                ...tarifas.map(t => deleteRecord('tarifas', t.id)),
                ...depositos.map(d => deleteRecord('depositos', d.id)),
                ...productos.map(p => deleteRecord('productos', p.id)),
                ...rubros.map(r => deleteRecord('rubros', r.id)),
            ]);

            // 4. Eliminar el motel
            if (motelId) {
                await fetch(getApiUrl(`/moteles/${motelId}`), {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }).catch(() => {});
            }

            // 5. Eliminar el propietario (después del motel para evitar FK violations)
            if (propietarioId) {
                await deleteRecord('propietarios', propietarioId);
            }

            ['token', 'email', 'role', 'motel', 'moteles', 'fullName', 'userId'].forEach(c => Cookies.deleteCookie(c));
            notify('Reset completo. Redirigiendo al login...', { type: 'success' });
            setTimeout(() => { window.location.href = '/#/login'; }, 800);
        } catch (err) {
            notify('Error en reset: ' + err.message, { type: 'warning' });
            setLoading(false);
        }
    };

    return (
        <Tooltip title="DEV: Reset Onboarding" placement="left">
            <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9998 }}>
                <Button
                    variant="contained"
                    onClick={handleReset}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
                    sx={{
                        bgcolor: '#C62828',
                        '&:hover': { bgcolor: '#b71c1c' },
                        borderRadius: '12px',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        textTransform: 'none',
                        boxShadow: '0 4px 12px rgba(198,40,40,0.4)'
                    }}
                >
                    {loading ? 'Reseteando...' : 'Reset Onboarding'}
                </Button>
            </Box>
        </Tooltip>
    );
};

export default DevResetOnboarding;
