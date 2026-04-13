import React, { useState, useMemo, useCallback } from 'react';
import { Title, useGetList } from 'react-admin';
import {
    Box, Typography, Paper, ToggleButton, ToggleButtonGroup,
    CircularProgress, Chip, Grid,
} from '@mui/material';
import {
    ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, Brush,
} from 'recharts';
import { useMotel } from '../context/MotelContext';

// ── Helpers de fecha (sin date-fns) ──────────────────────────────────────────

const pad = (n) => String(n).padStart(2, '0');

const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const addDays = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const addWeeks = (d, n) => addDays(d, n * 7);
const addMonths = (d, n) => { const r = new Date(d); r.setMonth(r.getMonth() + n); return r; };
const startOfYear = (d) => new Date(d.getFullYear(), 0, 1);
const startOfWeekMon = (d) => { const r = new Date(d); const day = r.getDay(); const diff = (day === 0 ? -6 : 1 - day); r.setDate(r.getDate() + diff); r.setHours(0, 0, 0, 0); return r; };
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const startOfDay = (d) => { const r = new Date(d); r.setHours(0, 0, 0, 0); return r; };
const startOfHour = (d) => { const r = new Date(d); r.setMinutes(0, 0, 0); return r; };

const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const fmtLabel = {
    hour: (iso) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}h`; },
    day: (iso) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; },
    week: (iso) => { const d = new Date(iso); return `S ${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; },
    month: (iso) => { const d = new Date(iso); return `${MONTHS_ES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; },
};

const bucketKey = {
    hour: (iso) => startOfHour(new Date(iso)).toISOString(),
    day: (iso) => startOfDay(new Date(iso)).toISOString(),
    week: (iso) => startOfWeekMon(new Date(iso)).toISOString(),
    month: (iso) => startOfMonth(new Date(iso)).toISOString(),
};

const fmtMoney = (v) => v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v}`;

// ── Constantes ────────────────────────────────────────────────────────────────

const METRICS = [
    { key: 'turnos', label: 'Turnos', color: '#6366f1' },
    { key: 'limpiezas', label: 'Limpiezas', color: '#10b981' },
    { key: 'facturado', label: 'Facturado', color: '#f59e0b' },
    { key: 'consumos', label: 'Consumos', color: '#ef4444' },
];

const RANGES = [
    { key: '1D', label: '1D' },
    { key: '1W', label: '1S' },
    { key: '1M', label: '1M' },
    { key: 'YTD', label: 'YTD' },
    { key: 'custom', label: 'Custom' },
];

const GRANULARITIES = [
    { key: 'hour', label: 'Hora' },
    { key: 'day', label: 'Día' },
    { key: 'week', label: 'Semana' },
    { key: 'month', label: 'Mes' },
];

// ── Componente ────────────────────────────────────────────────────────────────

const ReporteAnalitico = () => {
    const { currentMotelId } = useMotel();

    const [range, setRange] = useState('1W');
    const [granularity, setGranularity] = useState('day');
    const [metrics, setMetrics] = useState(['turnos', 'facturado']);
    const [customDesde, setCustomDesde] = useState('');
    const [customHasta, setCustomHasta] = useState('');

    // ── Rango de fechas ───────────────────────────────────────────────────────
    const { desde, hasta } = useMemo(() => {
        const now = new Date();
        const hoy = toYMD(now);
        if (range === '1D') return { desde: hoy, hasta: hoy };
        if (range === '1W') return { desde: toYMD(addWeeks(now, -1)), hasta: hoy };
        if (range === '1M') return { desde: toYMD(addMonths(now, -1)), hasta: hoy };
        if (range === 'YTD') return { desde: toYMD(startOfYear(now)), hasta: hoy };
        if (range === 'custom') return { desde: customDesde || hoy, hasta: customHasta || hoy };
        return { desde: hoy, hasta: hoy };
    }, [range, customDesde, customHasta]);

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: turnos = [], isLoading: loadingTurnos } = useGetList('turnos', {
        filter: {
            Salida_desde: desde,
            Salida_hasta: hasta,
            mostrar_cerrados: true,
            motelId: currentMotelId,
        },
        pagination: { page: 1, perPage: 2000 },
        sort: { field: 'Salida', order: 'ASC' },
    });

    const { data: limpiezas = [], isLoading: loadingLimpiezas } = useGetList('limpiezas', {
        filter: {
            Cuando: {
                $gte: `${desde}T00:00:00.000Z`,
                $lte: `${hasta}T23:59:59.999Z`
            },
            Finalizado: true,
            motelId: currentMotelId,
        },
        pagination: { page: 1, perPage: 2000 },
        sort: { field: 'Cuando', order: 'ASC' },
    });

    const { data: consumos = [], isLoading: loadingConsumos } = useGetList('consumos', {
        filter: {
            createdAt: {
                $gte: `${desde}T00:00:00.000Z`,
                $lte: `${hasta}T23:59:59.999Z`
            },
            motelId: currentMotelId,
        },
        pagination: { page: 1, perPage: 5000 },
        sort: { field: 'createdAt', order: 'ASC' },
    });

    const isLoading = loadingTurnos || loadingLimpiezas || loadingConsumos;

    // ── Agregación ────────────────────────────────────────────────────────────
    const chartData = useMemo(() => {
        const buckets = {};
        const ensure = (key) => {
            if (!buckets[key]) buckets[key] = { _ts: key, turnos: 0, limpiezas: 0, facturado: 0, consumos: 0 };
        };

        turnos.forEach(t => {
            if (!t.Salida) return;
            const key = bucketKey[granularity](t.Salida);
            ensure(key);
            buckets[key].turnos += 1;
            buckets[key].facturado += Number(t.Total || 0);
        });

        limpiezas.forEach(l => {
            if (!l.Cuando) return;
            const key = bucketKey[granularity](l.Cuando);
            ensure(key);
            buckets[key].limpiezas += 1;
        });

        consumos.forEach(c => {
            const fecha = c.createdAt || c.updatedAt;
            if (!fecha) return;
            const key = bucketKey[granularity](fecha);
            ensure(key);
            buckets[key].consumos += Number(c.Importe || c.Monto || 0);
        });

        return Object.values(buckets)
            .sort((a, b) => a._ts.localeCompare(b._ts))
            .map(b => ({ ...b, label: fmtLabel[granularity](b._ts) }));
    }, [turnos, limpiezas, consumos, granularity]);

    // ── Totales ───────────────────────────────────────────────────────────────
    const totals = useMemo(() => ({
        turnos: turnos.length,
        limpiezas: limpiezas.length,
        facturado: turnos.reduce((s, t) => s + Number(t.Total || 0), 0),
        consumos: consumos.reduce((s, c) => s + Number(c.Importe || c.Monto || 0), 0),
    }), [turnos, limpiezas, consumos]);

    const toggleMetric = useCallback((key) => {
        setMetrics(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    }, []);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <Box sx={{ mt: 2, maxWidth: 1200, mx: 'auto', px: 1 }}>
            <Title title="Reporte Analítico" />
            <Typography variant="h6" fontWeight={800} sx={{ color: '#1e1b4b', mb: 3 }}>
                Reporte Analítico
            </Typography>

            {/* Controles */}
            <Paper sx={{ p: 2, borderRadius: 3, mb: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Rango</Typography>
                    <ToggleButtonGroup value={range} exclusive onChange={(_, v) => v && setRange(v)} size="small">
                        {RANGES.map(r => (
                            <ToggleButton key={r.key} value={r.key} sx={{ fontWeight: 700, px: 1.5 }}>{r.label}</ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Box>

                {range === 'custom' && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <input type="date" value={customDesde} onChange={e => setCustomDesde(e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
                        <Typography variant="body2" color="text.secondary">—</Typography>
                        <input type="date" value={customHasta} onChange={e => setCustomHasta(e.target.value)}
                            style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 13 }} />
                    </Box>
                )}

                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Agregación</Typography>
                    <ToggleButtonGroup value={granularity} exclusive onChange={(_, v) => v && setGranularity(v)} size="small">
                        {GRANULARITIES.map(g => (
                            <ToggleButton key={g.key} value={g.key} sx={{ fontWeight: 700, px: 1.5 }}>{g.label}</ToggleButton>
                        ))}
                    </ToggleButtonGroup>
                </Box>

                <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Métricas</Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {METRICS.map(m => (
                            <Chip key={m.key} label={m.label} size="small" onClick={() => toggleMetric(m.key)}
                                sx={{
                                    fontWeight: 700, cursor: 'pointer',
                                    bgcolor: metrics.includes(m.key) ? m.color : 'transparent',
                                    color: metrics.includes(m.key) ? '#fff' : m.color,
                                    border: `2px solid ${m.color}`,
                                    '&:hover': { opacity: 0.85 },
                                }}
                            />
                        ))}
                    </Box>
                </Box>
            </Paper>

            {/* Totales */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {METRICS.map(m => (
                    <Grid item xs={6} sm={3} key={m.key}>
                        <Paper sx={{ p: 2, borderRadius: 3, borderTop: `4px solid ${m.color}` }}>
                            <Typography variant="caption" color="text.secondary" fontWeight={600}>{m.label}</Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: m.color }}>
                                {m.key === 'facturado' || m.key === 'consumos'
                                    ? fmtMoney(totals[m.key])
                                    : totals[m.key]}
                            </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>

            {/* Gráfico */}
            <Paper sx={{ p: 3, borderRadius: 3 }}>
                {isLoading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height={400}>
                        <CircularProgress />
                    </Box>
                ) : chartData.length === 0 ? (
                    <Box display="flex" justifyContent="center" alignItems="center" height={400}>
                        <Typography color="text.secondary">Sin datos para el período seleccionado</Typography>
                    </Box>
                ) : (
                    <ResponsiveContainer width="100%" height={440}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                            <YAxis yAxisId="count" orientation="left" tick={{ fontSize: 11 }}
                                allowDecimals={false}
                                label={{ value: 'Cantidad', angle: -90, position: 'insideLeft', offset: 15, style: { fontSize: 11 } }}
                            />
                            <YAxis yAxisId="money" orientation="right"
                                tickFormatter={v => `$${(v / 1000).toFixed(0)}k`}
                                tick={{ fontSize: 11 }}
                                label={{ value: '$', angle: 90, position: 'insideRight', offset: 15, style: { fontSize: 11 } }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                                formatter={(value, name) => {
                                    const m = METRICS.find(x => x.key === name);
                                    const label = m?.label || name;
                                    if (name === 'facturado' || name === 'consumos')
                                        return [`$${Number(value).toLocaleString('es-AR')}`, label];
                                    return [value, label];
                                }}
                            />
                            <Legend formatter={(value) => METRICS.find(m => m.key === value)?.label || value} />
                            <Brush dataKey="label" height={22} stroke="#e2e8f0" travellerWidth={8} />

                            {metrics.includes('turnos') && (
                                <Bar yAxisId="count" dataKey="turnos" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={36} />
                            )}
                            {metrics.includes('limpiezas') && (
                                <Bar yAxisId="count" dataKey="limpiezas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                            )}
                            {metrics.includes('facturado') && (
                                <Area yAxisId="money" type="monotone" dataKey="facturado"
                                    fill="#fef3c7" stroke="#f59e0b" strokeWidth={2} fillOpacity={0.4} />
                            )}
                            {metrics.includes('consumos') && (
                                <Line yAxisId="money" type="monotone" dataKey="consumos"
                                    stroke="#ef4444" strokeWidth={2} dot={false} />
                            )}
                        </ComposedChart>
                    </ResponsiveContainer>
                )}
            </Paper>
        </Box>
    );
};

export default ReporteAnalitico;
