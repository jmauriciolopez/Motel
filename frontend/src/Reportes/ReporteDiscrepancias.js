import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, Chip, CircularProgress, TextField, Grid,
} from '@mui/material';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Title } from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Cookies, getApiUrl } from '../helpers/Utils';

const fmt = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val ?? 0);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

const ReporteDiscrepancias = () => {
    const hoy = new Date().toISOString().split('T')[0];

    const [desde, setDesde] = useState(hoy);
    const [hasta, setHasta] = useState(hoy);
    const [data, setData]   = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = Cookies.getCookie('token');
            const res = await fetch(
                getApiUrl(`/pagos/discrepancias?desde=${desde}&hasta=${hasta}`),
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const json = await res.json();
            setData(json.data || []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [desde, hasta]);

    const totalDiff = data.reduce((acc, p) => acc + (Number(p.turno?.Total ?? 0) - Number(p.Importe ?? 0)), 0);

    return (
        <Box sx={{ mt: 2, maxWidth: 1100, mx: 'auto', minHeight: '100%' }}>
            <Title title="Discrepancias de Cobro" />
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: '#1e1b4b' }}>
                Discrepancias de Cobro
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Turnos donde el importe cobrado difiere del total calculado.
            </Typography>

            {/* Filtros */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <TextField label="Desde" type="date" size="small" fullWidth
                        value={desde} onChange={e => setDesde(e.target.value)}
                        InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField label="Hasta" type="date" size="small" fullWidth
                        value={hasta} onChange={e => setHasta(e.target.value)}
                        InputLabelProps={{ shrink: true }} />
                </Grid>
            </Grid>

            {/* Resumen */}
            {!loading && data.length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 2, display: 'flex', gap: 3, alignItems: 'center' }}>
                    <AlertTriangle size={22} color="#f97316" />
                    <Box>
                        <Typography variant="subtitle2" fontWeight={700} color="warning.dark">
                            {data.length} turno{data.length !== 1 ? 's' : ''} con discrepancia
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Diferencia total: <strong>{fmt(totalDiff)}</strong>
                            {totalDiff > 0 ? ' (se cobró de menos)' : ' (se cobró de más)'}
                        </Typography>
                    </Box>
                </Paper>
            )}

            {!loading && data.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 8 }} />
                    <Typography variant="body1" color="text.secondary">
                        Sin discrepancias en el período seleccionado
                    </Typography>
                </Paper>
            )}

            {loading && (
                <Box display="flex" justifyContent="center" p={6}>
                    <CircularProgress />
                </Box>
            )}

            {!loading && data.length > 0 && (
                <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Habitación</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Cliente</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Ingreso</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Salida</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Total Turno</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Cobrado</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>Forma Pago</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">Diferencia</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map(p => {
                                const total   = Number(p.turno?.Total ?? 0);
                                const importe = Number(p.Importe ?? 0);
                                const diff    = total - importe;
                                return (
                                    <TableRow key={p.id} hover>
                                        <TableCell sx={{ fontWeight: 600 }}>{p.turno?.habitacion?.Identificador ?? '-'}</TableCell>
                                        <TableCell>{p.turno?.cliente?.Patente ?? '-'}</TableCell>
                                        <TableCell>{fmtDate(p.turno?.Ingreso)}</TableCell>
                                        <TableCell>{fmtDate(p.turno?.Salida)}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{fmt(total)}</TableCell>
                                        <TableCell align="right">{fmt(importe)}</TableCell>
                                        <TableCell>{p.formaPago?.Tipo ?? '-'}</TableCell>
                                        <TableCell align="right">
                                            <Chip
                                                label={fmt(diff)}
                                                size="small"
                                                color={diff > 0 ? 'error' : 'warning'}
                                                sx={{ fontWeight: 700 }}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Paper>
            )}
        </Box>
    );
};

export default ReporteDiscrepancias;
