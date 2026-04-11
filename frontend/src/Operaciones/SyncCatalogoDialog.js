import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Checkbox, FormControlLabel, Box, Typography,
    CircularProgress, Divider, Chip, TextField, InputAdornment,
} from '@mui/material';
import { Search as SearchIcon, Sync as SyncIcon } from '@mui/icons-material';
import { useNotify, useRefresh } from 'react-admin';
import { Cookies, getApiUrl } from '../helpers/Utils';

const SyncCatalogoDialog = ({ open, onClose }) => {
    const [catalogo, setCatalogo] = useState([]);
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [search, setSearch] = useState('');
    const notify = useNotify();
    const refresh = useRefresh();

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        const token = Cookies.getCookie('token');
        fetch(getApiUrl('/catalogo-productos?_limit=300&_sort=Nombre&_order=asc'), {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                // Normalizar camelCase → PascalCase para compatibilidad con el render
                const items = (data.data || []).map(p => ({
                    ...p,
                    Nombre: p.Nombre,
                    Precio: p.Precio,
                    CriterioBusqueda: p.CriterioBusqueda,
                    rubro: p.rubro ? { ...p.rubro, Nombre: p.rubro.Nombre } : null,
                }));
                setCatalogo(items);
            })
            .catch(() => notify('Error al cargar el catálogo', { type: 'error' }))
            .finally(() => setLoading(false));
    }, [open]);

    const filtered = catalogo.filter(p =>
        p.Nombre?.toLowerCase().includes(search.toLowerCase()) ||
        p.rubro?.Nombre?.toLowerCase().includes(search.toLowerCase()) ||
        p.CriterioBusqueda?.toLowerCase().includes(search.toLowerCase())
    );

    const toggle = (docId) => {
        setSelected(prev =>
            prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
        );
    };

    const toggleAll = () => {
        const filteredIds = filtered.map(p => p.id);
        const allSelected = filteredIds.every(id => selected.includes(id));
        if (allSelected) {
            setSelected(prev => prev.filter(id => !filteredIds.includes(id)));
        } else {
            setSelected(prev => Array.from(new Set([...prev, ...filteredIds])));
        }
    };

    const handleSync = async () => {
        if (selected.length === 0) return;
        setSyncing(true);
        try {
            const token = Cookies.getCookie('token');
            const motelId = localStorage.getItem('motelId');
            const res = await fetch(getApiUrl('/productos/sync-catalogo'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                    'x-motel-id': motelId,
                },
                body: JSON.stringify({ motelId, catalogoIds: selected }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error en sync');
            notify(`${data.length ?? selected.length} productos sincronizados`, { type: 'success' });
            refresh();
            setSelected([]);
            onClose();
        } catch (err) {
            notify('Error: ' + err.message, { type: 'error' });
        } finally {
            setSyncing(false);
        }
    };

    const filteredIds = filtered.map(p => p.id);
    const allFilteredSelected = filteredIds.length > 0 && filteredIds.every(id => selected.includes(id));

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
            PaperProps={{ sx: { borderRadius: '16px' } }}>
            <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
                Sincronizar desde Catálogo
                {selected.length > 0 && (
                    <Chip label={`${selected.length} seleccionados`} size="small"
                        color="primary" sx={{ ml: 2, fontWeight: 700 }} />
                )}
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                <TextField
                    fullWidth size="small" placeholder="Buscar producto o rubro..."
                    value={search} onChange={e => setSearch(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                        startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                    }}
                />

                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress size={32} />
                    </Box>
                ) : (
                    <>
                        <FormControlLabel
                            control={<Checkbox checked={allFilteredSelected} onChange={toggleAll} indeterminate={selected.length > 0 && !allFilteredSelected} />}
                            label={<Typography variant="body2" fontWeight={700}>Seleccionar todos ({filtered.length})</Typography>}
                            sx={{ mb: 1 }}
                        />
                        <Divider sx={{ mb: 1 }} />
                        <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
                            {filtered.map(p => (
                                <FormControlLabel
                                    key={p.id}
                                    control={
                                        <Checkbox
                                            checked={selected.includes(p.id)}
                                            onChange={() => toggle(p.id)}
                                        />
                                    }
                                    label={
                                        <Box>
                                            <Typography variant="body2" fontWeight={600}>{p.Nombre}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {p.rubro?.Nombre} · ${p.Precio?.toLocaleString()}
                                            </Typography>
                                        </Box>
                                    }
                                    sx={{ display: 'flex', width: '100%', mb: 0.5 }}
                                />
                            ))}
                            {filtered.length === 0 && (
                                <Typography variant="body2" color="text.secondary" textAlign="center" p={3}>
                                    No hay productos en el catálogo
                                </Typography>
                            )}
                        </Box>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2, gap: 1 }}>
                <Button onClick={onClose} color="inherit">Cancelar</Button>
                <Button
                    variant="contained" onClick={handleSync}
                    disabled={selected.length === 0 || syncing}
                    startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : <SyncIcon />}
                    sx={{ borderRadius: '10px', fontWeight: 700 }}
                >
                    {syncing ? 'Sincronizando...' : `Sincronizar ${selected.length > 0 ? `(${selected.length})` : ''}`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default SyncCatalogoDialog;
