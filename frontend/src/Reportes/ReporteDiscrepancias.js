import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, Chip, CircularProgress, TextField, Grid,
} from '@mui/material';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Title, useTranslate } from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { http } from '../shared/api/HttpClient';

const fmt = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(val ?? 0);
const fmtDate = (iso) => iso ? new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-';

const ReporteDiscrepancias = () => {
    const translate = useTranslate();
    const hoy = new Date().toISOString().split('T')[0];

    const [desde, setDesde] = useState(hoy);
    const [hasta, setHasta] = useState(hoy);
    const [data, setData]   = useState([]);
    const [loading, setLoading] = useState(false);

    const { currentMotelId } = useMotel();

    const fetchData = async () => {
        setLoading(true);
        try {
            const json = await http.get('/pagos/discrepancias', {
                params: { desde, hasta }
            });
            setData(json.data || []);
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [desde, hasta, currentMotelId]);

    const totalDiff = data.reduce((acc, p) => acc + (Number(p.turno?.Total ?? 0) - Number(p.Importe ?? 0)), 0);

    return (
        <Box sx={{ mt: 2, maxWidth: 1100, mx: 'auto', minHeight: '100%' }}>
            <Title title={translate('pos.reports.payment_discrepancy')} />
            <Typography variant="h6" fontWeight={800} sx={{ mb: 1, color: '#1e1b4b' }}>
                {translate('pos.reports.payment_discrepancy')}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {translate('pos.dashboard.operational_subtitle')}
            </Typography>

            {/* Filtros */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <TextField label={translate('pos.reports.date_from')} type="date" size="small" fullWidth
                        value={desde} onChange={e => setDesde(e.target.value)}
                        InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField label={translate('pos.reports.date_to')} type="date" size="small" fullWidth
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
                            {data.length} {translate('pos.reports.payment_discrepancy').toLowerCase()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {translate('pos.reports.total_difference')}: <strong>{fmt(totalDiff)}</strong>
                            {totalDiff > 0 ? ` ${translate('pos.reports.collected_less')}` : ` ${translate('pos.reports.collected_more')}`}
                        </Typography>
                    </Box>
                </Paper>
            )}

            {!loading && data.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ marginBottom: 8 }} />
                    <Typography variant="body1" color="text.secondary">
                        {translate('pos.reports.no_data')}
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
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.reports.room')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.reports.customer')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.reports.checkin')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.reports.checkout')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">{translate('pos.reports.total_turns')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">{translate('pos.reports.charged')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }}>{translate('pos.reports.payment_method')}</TableCell>
                                <TableCell sx={{ fontWeight: 700 }} align="right">{translate('pos.reports.missing')}</TableCell>
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
