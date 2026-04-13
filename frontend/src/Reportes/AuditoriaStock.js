import React, { useState, useEffect, useMemo } from 'react';
import {
    Box, Typography, Paper, Table, TableHead, TableRow, TableCell,
    TableBody, CircularProgress, TextField, Grid, Chip, TableSortLabel,
    TableFooter, MenuItem,
} from '@mui/material';
import { Title } from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { http } from '../shared/api/HttpClient';

const fmtN = (n) => Number(n || 0).toLocaleString('es-AR');
const fmtM = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n ?? 0);

const AuditoriaStock = () => {
    const hoy = new Date().toISOString().split('T')[0];
    const primerDiaMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

    const [desde, setDesde] = useState(primerDiaMes);
    const [hasta, setHasta] = useState(hoy);
    const [data, setData]         = useState([]);
    const [depositos, setDepositos] = useState({});
    const [loading, setLoading]   = useState(false);
    const [orderBy, setOrderBy]   = useState('Nombre');
    const [order, setOrder]       = useState('asc');
    const [rubroFiltro, setRubroFiltro] = useState('');

    const { currentMotelId } = useMotel();

    // Rubros únicos derivados de los datos
    const rubros = useMemo(() => {
        const set = new Set(data.map(r => r.Rubro).filter(Boolean));
        return [...set].sort();
    }, [data]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const json = await http.get('/productos/auditoria-stock', {
                params: { desde, hasta }
            });
            setData(json.data || []);
            setDepositos(json.depositos || {});
        } catch {
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, [desde, hasta, currentMotelId]);

    // Columnas de depósito dinámicas
    const depositoCols = useMemo(() => Object.entries(depositos).map(([id, nombre]) => ({ id, nombre })), [depositos]);

    const handleSort = (col) => {
        if (orderBy === col) setOrder(o => o === 'asc' ? 'desc' : 'asc');
        else { setOrderBy(col); setOrder('asc'); }
    };

    const sorted = useMemo(() => {
        const filtered = rubroFiltro ? data.filter(r => r.Rubro === rubroFiltro) : data;
        return [...filtered].sort((a, b) => {
            let va = a[orderBy]; let vb = b[orderBy];
            if (va === undefined) va = a.StockPorDeposito?.[orderBy] ?? 0;
            if (vb === undefined) vb = b.StockPorDeposito?.[orderBy] ?? 0;
            if (typeof va === 'string') return order === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            return order === 'asc' ? va - vb : vb - va;
        });
    }, [data, orderBy, order, rubroFiltro]);

    const totals = useMemo(() => {
        const base = { Comprado: 0, Transferido: 0, StockPrincipal: 0, Egresado: 0, Faltante: 0, FaltanteImporte: 0 };
        const deps = {};
        depositoCols.forEach(d => deps[d.id] = 0);
        sorted.forEach(r => {
            base.Comprado        += r.Comprado;
            base.Transferido     += r.Transferido;
            base.StockPrincipal  += r.StockPrincipal || 0;
            base.Egresado        += r.Egresado;
            base.Faltante        += r.Faltante;
            base.FaltanteImporte += r.FaltanteImporte;
            depositoCols.forEach(d => { deps[d.id] += r.StockPorDeposito?.[d.id] || 0; });
        });
        return { ...base, deps };
    }, [sorted, depositoCols]);

    const SortCell = ({ col, label, align = 'right', width }) => (
        <TableCell align={align} sx={{ fontWeight: 700, fontSize: '0.75rem', bgcolor: '#f8fafc', p: '6px 8px', ...(width ? { width, minWidth: width } : {}) }}>
            <TableSortLabel active={orderBy === col} direction={orderBy === col ? order : 'asc'} onClick={() => handleSort(col)}>
                {label}
            </TableSortLabel>
        </TableCell>
    );

    return (
        <Box sx={{ mt: 2, maxWidth: 1400, mx: 'auto' }}>
            <Title title="Auditoría de Stock" />
            <Typography variant="h6" fontWeight={800} sx={{ mb: 0.5, color: '#1e1b4b' }}>Auditoría de Stock</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Movimientos de stock por producto en el período seleccionado.
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} md={3}>
                    <TextField label="Desde" type="date" size="small" fullWidth value={desde}
                        onChange={e => setDesde(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField label="Hasta" type="date" size="small" fullWidth value={hasta}
                        onChange={e => setHasta(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6} md={3}>
                    <TextField select label="Rubro" size="small" fullWidth value={rubroFiltro}
                        onChange={e => setRubroFiltro(e.target.value)}>
                        <MenuItem value="">Todos</MenuItem>
                        {rubros.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </TextField>
                </Grid>
            </Grid>

            {loading && <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>}

            {!loading && data.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <Typography variant="body1" color="text.secondary">Sin movimientos en el período</Typography>
                </Paper>
            )}

            {!loading && data.length > 0 && (
                <Paper sx={{ borderRadius: 2, overflow: 'auto' }}>
                    <Table size="small" stickyHeader sx={{ tableLayout: 'fixed', width: '100%' }}>
                        <TableHead>
                            <TableRow>
                                <SortCell col="Nombre" label="Producto" align="left" width="160px" />
                                <SortCell col="Rubro" label="Rubro" align="left" width="110px" />
                                <SortCell col="Comprado" label="Comprado" width="80px" />
                                <SortCell col="StockPrincipal" label="Principal" width="80px" />
                                <SortCell col="Transferido" label="Transfer." width="80px" />
                                <SortCell col="Egresado" label="Egresado" width="80px" />
                                <SortCell col="Faltante" label="Faltante" width="80px" />
                                <SortCell col="FaltanteImporte" label="Faltante $" width="100px" />
                                {depositoCols.map(d => (
                                    <SortCell key={d.id} col={d.id} label={d.nombre} width="90px" />
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {sorted.map(row => (
                                <TableRow key={row.id} hover>
                                    <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', p: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.Nombre}</TableCell>
                                    <TableCell sx={{ fontSize: '0.8rem', p: '6px 8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.Rubro}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem', p: '6px 8px' }}>{fmtN(row.Comprado)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem', p: '6px 8px' }}>{fmtN(row.StockPrincipal)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem', p: '6px 8px' }}>{fmtN(row.Transferido)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem', p: '6px 8px' }}>{fmtN(row.Egresado)}</TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem', p: '6px 8px' }}>
                                        {row.Faltante > 0
                                            ? <Chip label={fmtN(row.Faltante)} size="small" color="error" sx={{ fontWeight: 700 }} />
                                            : <Chip label={fmtN(row.Faltante)} size="small" color="warning" sx={{ fontWeight: 700 }} />
                                        }
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontSize: '0.8rem', p: '6px 8px' }}>{row.FaltanteImporte !== 0 ? <Chip label={fmtM(row.FaltanteImporte)} size="small" color={row.FaltanteImporte > 0 ? 'error' : 'warning'} sx={{ fontWeight: 700 }} /> : fmtM(0)}</TableCell>
                                    {depositoCols.map(d => {
                                        const cant = row.StockPorDeposito?.[d.id] || 0;
                                        const esperadoSecund = row.Transferido - row.Egresado;
                                        const enFaltante = cant < esperadoSecund;
                                        return (
                                            <TableCell key={d.id} align="right">
                                                <Chip label={fmtN(cant)} size="small"
                                                    color={enFaltante ? 'error' : 'success'}
                                                    sx={{ fontWeight: 700 }} />
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow sx={{ bgcolor: '#f1f5f9' }}>
                                <TableCell sx={{ fontWeight: 800 }}>TOTAL</TableCell>
                                <TableCell />
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtN(totals.Comprado)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtN(totals.StockPrincipal)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtN(totals.Transferido)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{fmtN(totals.Egresado)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: totals.Faltante > 0 ? 'error.main' : 'inherit' }}>{fmtN(totals.Faltante)}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700, color: totals.FaltanteImporte > 0 ? 'error.main' : 'inherit' }}>{fmtM(totals.FaltanteImporte)}</TableCell>
                                {depositoCols.map(d => (
                                    <TableCell key={d.id} align="right" sx={{ fontWeight: 700 }}>{fmtN(totals.deps[d.id])}</TableCell>
                                ))}
                            </TableRow>
                        </TableFooter>
                    </Table>
                </Paper>
            )}
        </Box>
    );
};

export default AuditoriaStock;
