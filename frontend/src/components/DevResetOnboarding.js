import React, { useState } from 'react';
import { useDataProvider, useNotify } from 'react-admin';
import { Box, Button, CircularProgress, Tooltip } from '@mui/material';
import { Trash2 } from 'lucide-react';
import { useMotel } from '../context/MotelContext';
import { http } from '../shared/api/HttpClient';

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

            // Obtener motel para resolver su propietario sin depender de filtros no soportados
            const motelData = motelId
                ? await dataProvider.getOne('moteles', { id: motelId }).catch(() => ({ data: null }))
                : { data: null };

            const propietarioId = motelData?.data?.Propietario?.id || motelData?.data?.propietario?.id || null;

            // Obtener todo lo vinculado al motel en paralelo
            console.log('[DevReset] Fetching related records...');
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

            console.log('[DevReset] Found:', {
                habitaciones: habitaciones.length,
                tarifas: tarifas.length,
                depositos: depositos.length,
                productos: productos.length,
                rubros: rubros.length,
            });

            // Obtener id real del usuario actual para excluirlo
            let myNumericId = null;
            try {
                const me = await http.get('/usuarios/me');
                myNumericId = me?.id;
            } catch { /* no bloquear */ }

            const deleteRecord = (resource, id) =>
                http.delete(`/${resource}/${id}`).catch(err => {
                    console.warn(`[DevReset] Error deleting ${resource}/${id}:`, err);
                });

            let motelUsers = [];
            if (motelId) {
                try {
                    const params = { motelId: encodeURIComponent(motelId) };
                    if (myNumericId) params.excluirUsuarioId = encodeURIComponent(myNumericId);
                    motelUsers = await http.get('/usuarios/por-motel', { params }) || [];
                } catch { /* no bloquear */ }
            }

            // 1. Desvincular al admin actual del motel
            if (myNumericId) {
                await http.patch(`/usuarios/${myNumericId}/desvincular-moteles`, {}).catch(() => {});
            }

            // 2. Desvincular y eliminar usuarios secundarios
            for (const u of motelUsers) {
                await http.patch(`/usuarios/${u.id}/desvincular-moteles`, {}).catch(() => {});
                await http.delete(`/usuarios/${u.id}`).catch(() => {});
            }

            // 3. Eliminar registros del motel en orden correcto (respetando FKs)
            console.log('[DevReset] Deleting productos...');
            await Promise.all(productos.map(p => deleteRecord('productos', p.id)));
            
            console.log('[DevReset] Deleting rubros...');
            await Promise.all(rubros.map(r => deleteRecord('rubros', r.id)));
            
            console.log('[DevReset] Deleting habitaciones and tarifas...');
            await Promise.all([
                ...habitaciones.map(h => deleteRecord('habitaciones', h.id)),
                ...tarifas.map(t => deleteRecord('tarifas', t.id)),
            ]);
            
            console.log('[DevReset] Deleting depositos...');
            await Promise.all(depositos.map(d => deleteRecord('depositos', d.id)));

            // 4. Eliminar el motel
            if (motelId) {
                await http.delete(`/moteles/${motelId}`).catch(() => {});
            }

            // 5. Eliminar el propietario
            if (propietarioId) {
                await deleteRecord('propietarios', propietarioId);
            }

            sessionStorage.clear();
            notify('Reset completo. Redirigiendo al login...', { type: 'success' });
            setTimeout(() => { window.location.href = '/#/login'; }, 800);
        } catch (err) {
            console.error('[DevReset] Error:', err);
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
