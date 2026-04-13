import React, { useMemo, useState, useEffect } from 'react';
import {
    Title,
    useGetList,
    Loading,
    Error
} from 'react-admin';
import {
    Card,
    CardContent,
    Grid,
    Typography,
    Box,
    TextField,
    Paper,
    Divider,
    InputAdornment,
    Slider,
    Tooltip as MuiTooltip
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';
import {
    Calculator,
    Zap,
    Trash2,
    Activity,
    DollarSign,
    PieChart as PieIcon,
    ArrowUpRight,
    TrendingDown,
    Home,
    ShoppingBag
} from 'lucide-react';
import { useMotel } from '../context/MotelContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, value, icon: Icon, color, subtitle, trend }) => (
    <Card sx={{
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        border: 'none',
        borderRadius: 4,
        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
        background: '#fff'
    }}>
        <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '4px',
            backgroundColor: color
        }} />
        <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                    <Typography variant="overline" color="textSecondary" sx={{ fontWeight: 600, letterSpacing: 1.2 }}>
                        {title}
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
                        {value}
                    </Typography>
                </Box>
                <Box sx={{
                    p: 1.5,
                    borderRadius: 3,
                    backgroundColor: `${color}15`,
                    color: color
                }}>
                    <Icon size={24} />
                </Box>
            </Box>
            {trend && (
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: trend > 0 ? 'success.main' : 'error.main' }}>
                    {trend > 0 ? <ArrowUpRight size={14} /> : <TrendingDown size={14} />} {Math.abs(trend)}% vs Estimado
                </Typography>
            )}
            {subtitle && !trend && (
                <Typography variant="body2" color="textSecondary">
                    {subtitle}
                </Typography>
            )}
        </CardContent>
    </Card>
);

const EstimacionCostos = () => {
    const { currentMotelId: motelId } = useMotel();
    // 1. Fechas
    const defaultDesde = new Date();
    defaultDesde.setDate(1); // Primer día del mes
    const [desde, setDesde] = useState(defaultDesde.toISOString().split('T')[0]);
    const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);

    // 2. Parámetros de Costo (Persistentes)
    const [costoPorTurno, setCostoPorTurno] = useState(() => Number(localStorage.getItem('est_costo_turno')) || 1500);
    const [costoMantenimientoHab, setCostoMantenimientoHab] = useState(() => Number(localStorage.getItem('est_costo_hab')) || 5000);
    const [otrosCostosFijos, setOtrosCostosFijos] = useState(() => Number(localStorage.getItem('est_costo_fijos')) || 250000);

    useEffect(() => {
        localStorage.setItem('est_costo_turno', costoPorTurno);
        localStorage.setItem('est_costo_hab', costoMantenimientoHab);
        localStorage.setItem('est_costo_fijos', otrosCostosFijos);
    }, [costoPorTurno, costoMantenimientoHab, otrosCostosFijos]);

    // 3. Fetch de Datos
    const turnosSort = { field: 'Salida', order: 'ASC' };
    const turnosPagination = { page: 1, perPage: 2000 };
    const habPagination = { page: 1, perPage: 200 };

    const turnosFilter = useMemo(() => ({
        Salida_desde: desde,
        Salida_hasta: hasta,
        mostrar_cerrados: true,
        motelId: motelId,
    }), [desde, hasta, motelId]);

    const { data: turnos, isLoading: loadingTurnos, error: errorTurnos } = useGetList('turnos', {
        filter: turnosFilter,
        pagination: turnosPagination,
        sort: turnosSort
    });

    const { data: habitaciones, isLoading: loadingHab } = useGetList('habitaciones', {
        pagination: habPagination,
        filter: { motelId: motelId }
    });

    // 4. Cálculos Matemáticos
    const stats = useMemo(() => {
        if (!turnos || !habitaciones) return null;

        let totalIngreso = 0;
        let totalCMV = 0; // Cost of Goods Sold (Costo de productos)
        let totalTurnos = turnos.length;
        let totalHabs = habitaciones.length;

        // Agrupación por fecha para el gráfico
        const dailyStats = {};

        turnos.forEach(t => {
            const ingreso = Number(t.Total || 0);
            totalIngreso += ingreso;

            // Calcular costo de productos (consumos)
            let costoTurnoProductos = 0;
            if (t.consumos) {
                t.consumos.forEach(c => {
                    const costoProd = Number(c.producto?.Costo || 0);
                    costoTurnoProductos += (costoProd * Number(c.Cantidad || 0));
                });
            }
            totalCMV += costoTurnoProductos;

            // Agrupar para gráfico
            if (t.Salida) {
                const dateKey = t.Salida.split('T')[0];
                if (!dailyStats[dateKey]) {
                    dailyStats[dateKey] = { date: dateKey, ingresos: 0, turnos: 0, cmv: 0 };
                }
                dailyStats[dateKey].ingresos += ingreso;
                dailyStats[dateKey].turnos += 1;
                dailyStats[dateKey].cmv += costoTurnoProductos;
            }
        });

        const costoVariableOperativo = totalTurnos * costoPorTurno;
        const costoFijoHabitaciones = totalHabs * costoMantenimientoHab;
        const costoTotalEstimado = costoVariableOperativo + costoFijoHabitaciones + totalCMV + otrosCostosFijos;

        const margenNeto = totalIngreso - costoTotalEstimado;
        const porcentajeMargen = totalIngreso > 0 ? (margenNeto / totalIngreso * 100).toFixed(1) : 0;

        // Preparar datos para gráficos
        const chartData = Object.values(dailyStats).sort((a, b) => a.date.localeCompare(b.date));

        const compositionData = [
            { name: 'Variable (Limpieza)', value: costoVariableOperativo },
            { name: 'Mercadería (CMV)', value: totalCMV },
            { name: 'Infraestructura', value: costoFijoHabitaciones },
            { name: 'Gastos Fijos', value: otrosCostosFijos }
        ];

        return {
            totalIngreso,
            totalCMV,
            totalTurnos,
            totalHabs,
            costoVariableOperativo,
            costoFijoHabitaciones,
            costoTotalEstimado,
            margenNeto,
            porcentajeMargen,
            compositionData,
            chartData
        };
    }, [turnos, habitaciones, costoPorTurno, costoMantenimientoHab, otrosCostosFijos]);

    if (loadingTurnos || loadingHab) return <Loading />;
    if (errorTurnos) return <Error />;

    const formatter = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    });

    return (
        <Box sx={{ p: 4, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <Title title="Estimación de Costos y Rentabilidad" />

            {/* Encabezado y Filtros */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>
                        Calculadora de Rentabilidad
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Combinamos datos reales de actividad con tus parámetros de costo
                    </Typography>
                </Box>

                <Paper sx={{ p: 2, display: 'flex', gap: 3, borderRadius: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                    <TextField
                        type="date"
                        label="Inicio Período"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        variant="standard"
                    />
                    <TextField
                        type="date"
                        label="Fin Período"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        variant="standard"
                    />
                </Paper>
            </Box>

            <Grid container spacing={3}>
                {/* Lateral: Configuración de Parámetros */}
                <Grid item xs={12} md={4} lg={3}>
                    <Paper sx={{ p: 3, borderRadius: 4, height: '100%', border: '1px solid #e2e8f0' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                            <Calculator size={20} color="#6366f1" />
                            <Typography variant="h6" fontWeight={700}>Parámetros</Typography>
                        </Box>

                        <Box sx={{ mb: 4 }}>
                            <Typography variant="body2" fontWeight={600} gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Costo Insumos / Turno</span>
                                <span style={{ color: '#6366f1' }}>{formatter.format(costoPorTurno)}</span>
                            </Typography>
                            <Slider
                                value={costoPorTurno}
                                min={0}
                                max={5000}
                                step={100}
                                onChange={(_, v) => setCostoPorTurno(v)}
                                sx={{ color: '#6366f1' }}
                            />
                            <Typography variant="caption" color="textSecondary">Limpieza, lavandería y kits</Typography>
                        </Box>

                        <Box sx={{ mb: 4 }}>
                            <Typography variant="body2" fontWeight={600} gutterBottom sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Mant. Fijo / Habitación</span>
                                <span style={{ color: '#10b981' }}>{formatter.format(costoMantenimientoHab)}</span>
                            </Typography>
                            <Slider
                                value={costoMantenimientoHab}
                                min={0}
                                max={20000}
                                step={500}
                                onChange={(_, v) => setCostoMantenimientoHab(v)}
                                sx={{ color: '#10b981' }}
                            />
                            <Typography variant="caption" color="textSecondary">Amortización y mantenimiento base</Typography>
                        </Box>

                        <Box sx={{ mb: 4 }}>
                            <Typography variant="body2" fontWeight={600} gutterBottom>Otros Costos Fijos Mensuales</Typography>
                            <TextField
                                fullWidth
                                size="small"
                                type="number"
                                value={otrosCostosFijos}
                                onChange={(e) => setOtrosCostosFijos(Number(e.target.value))}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                }}
                                sx={{ mt: 1 }}
                            />
                            <Typography variant="caption" color="textSecondary">Sueldos, Luz, Agua, Alquiler</Typography>
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        <Box sx={{ p: 2, bgcolor: '#f1f5f9', borderRadius: 3 }}>
                            <Typography variant="caption" fontWeight={700} color="textSecondary" uppercase>Fórmula Aplicada</Typography>
                            <Typography variant="body2" sx={{ mt: 1, fontFamily: 'monospace' }}>
                                (Turnos × {costoPorTurno}) + <br />
                                (Habs × {costoMantenimientoHab}) + <br />
                                CMV + Gastos Fijos
                            </Typography>
                        </Box>
                    </Paper>
                </Grid>

                {/* Principal: Resultados */}
                <Grid item xs={12} md={8} lg={9}>
                    <Grid container spacing={3}>
                        {/* KPIs Superiores */}
                        <Grid item xs={12} md={4}>
                            <StatCard
                                title="Ingreso Real Bruto"
                                value={formatter.format(stats?.totalIngreso)}
                                icon={DollarSign}
                                color="#6366f1"
                                subtitle={`${stats?.totalTurnos} turnos procesados`}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard
                                title="Costo Total Estimado"
                                value={formatter.format(stats?.costoTotalEstimado)}
                                icon={TrendingDown}
                                color="#ef4444"
                                subtitle="Suma de fijos, variables y CMV"
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <StatCard
                                title="Utilidad Estimada"
                                value={formatter.format(stats?.margenNeto)}
                                icon={Activity}
                                color="#10b981"
                                subtitle={`Margen sobre ingresos: ${stats?.porcentajeMargen}%`}
                            />
                        </Grid>

                        {/* Fila 2: Gráficos y Detalles */}
                        <Grid item xs={12} md={7}>
                            <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight={700} mb={3}>Evolución Ingresos vs Costos CMV</Typography>
                                    <Box sx={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={stats?.chartData}>
                                                <defs>
                                                    <linearGradient id="colorIng" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="date" hide />
                                                <YAxis hide />
                                                <Tooltip
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                                    formatter={(v) => formatter.format(v)}
                                                />
                                                <Area type="monotone" dataKey="ingresos" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorIng)" name="Ingresos" />
                                                <Area type="monotone" dataKey="cmv" stroke="#ef4444" strokeWidth={2} fill="transparent" name="Costo Mercadería" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={5}>
                            <Card sx={{ borderRadius: 4, height: '100%', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight={700} mb={3}>Distribución del Costo</Typography>
                                    <Box sx={{ height: 300 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={stats?.compositionData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={100}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                >
                                                    {stats?.compositionData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip formatter={(v) => formatter.format(v)} />
                                                <Legend />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {/* Fila 3: Breakdown de Costos */}
                        <Grid item xs={12}>
                            <Paper sx={{ p: 0, borderRadius: 4, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                <Box sx={{ p: 3, bgcolor: '#f8fafc' }}>
                                    <Typography variant="h6" fontWeight={700}>Desglose de Costos Estimados</Typography>
                                </Box>
                                <Divider />
                                <Grid container>
                                    <Grid item xs={12} md={3} sx={{ p: 4, borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                                        <Box sx={{ mb: 2, display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: '#fef3c7', color: '#f59e0b' }}>
                                            <Home size={24} />
                                        </Box>
                                        <Typography variant="h5" fontWeight={800}>{formatter.format(stats?.costoFijoHabitaciones)}</Typography>
                                        <Typography variant="body2" color="textSecondary">Infraestructura (Habitaciones)</Typography>
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>{stats?.totalHabs} habitaciones activas</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3} sx={{ p: 4, borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                                        <Box sx={{ mb: 2, display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: '#e0f2fe', color: '#0ea5e9' }}>
                                            <Activity size={24} />
                                        </Box>
                                        <Typography variant="h5" fontWeight={800}>{formatter.format(stats?.costoVariableOperativo)}</Typography>
                                        <Typography variant="body2" color="textSecondary">Operatividad (Limpieza)</Typography>
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Basado en {stats?.totalTurnos} rotaciones</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3} sx={{ p: 4, borderRight: '1px solid #f1f5f9', textAlign: 'center' }}>
                                        <Box sx={{ mb: 2, display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: '#dcfce7', color: '#10b981' }}>
                                            <ShoppingBag size={24} />
                                        </Box>
                                        <Typography variant="h5" fontWeight={800}>{formatter.format(stats?.totalCMV)}</Typography>
                                        <Typography variant="body2" color="textSecondary">Mercadería (CMV)</Typography>
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Costo de productos vendidos</Typography>
                                    </Grid>
                                    <Grid item xs={12} md={3} sx={{ p: 4, textAlign: 'center' }}>
                                        <Box sx={{ mb: 2, display: 'inline-flex', p: 1.5, borderRadius: 3, bgcolor: '#f1f5f9', color: '#64748b' }}>
                                            <Zap size={24} />
                                        </Box>
                                        <Typography variant="h5" fontWeight={800}>{formatter.format(otrosCostosFijos)}</Typography>
                                        <Typography variant="body2" color="textSecondary">Estructura y Fijos</Typography>
                                        <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>Gastos generales de administración</Typography>
                                    </Grid>
                                </Grid>
                            </Paper>
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
        </Box>
    );
};

export default EstimacionCostos;
