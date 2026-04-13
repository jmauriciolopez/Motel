import React, { useMemo, useState } from 'react';
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
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    LinearProgress
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
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import {
    Activity,
    DollarSign,
    Calendar,
    Zap,
    MapPin,
    TrendingUp,
    Clock,
    Tag
} from 'lucide-react';
import { useMotel } from '../context/MotelContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
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
            {subtitle && (
                <Typography variant="body2" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <TrendingUp size={14} /> {subtitle}
                </Typography>
            )}
        </CardContent>
    </Card>
);

const ReporteRendimiento = () => {
    const { currentMotelId } = useMotel();
    const defaultDesde = new Date();
    defaultDesde.setDate(defaultDesde.getDate() - 30);
    const [desde, setDesde] = useState(defaultDesde.toISOString().split('T')[0]);
    const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);

    const turnosFilter = useMemo(() => ({
        Salida_desde: desde,
        Salida_hasta: hasta,
        mostrar_cerrados: true,
        motelId: currentMotelId,
    }), [desde, hasta, currentMotelId]);

    const { data, isLoading, error } = useGetList('turnos', {
        filter: turnosFilter,
        pagination: { page: 1, perPage: 2000 },
        sort: { field: 'Ingreso', order: 'ASC' }
    });

    const stats = useMemo(() => {
        if (!data) return null;

        const roomYield = {};
        const hourlyYield = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, total: 0, count: 0 }));
        const dailyYield = [
            { name: 'Dom', total: 0, count: 0 },
            { name: 'Lun', total: 0, count: 0 },
            { name: 'Mar', total: 0, count: 0 },
            { name: 'Mié', total: 0, count: 0 },
            { name: 'Jue', total: 0, count: 0 },
            { name: 'Vie', total: 0, count: 0 },
            { name: 'Sáb', total: 0, count: 0 }
        ];

        const promoDataMap = {
            'Plena': { name: 'Tarifa Plena', value: 0, count: 0 },
            'Promoción': { name: 'Promocionales', value: 0, count: 0 },
            'Pernocte': { name: 'Pernoctes', value: 0, count: 0 }
        };

        let totalTotal = 0;

        data.forEach(turno => {
            const monto = Number(turno.Total || 0);
            totalTotal += monto;

            // 1. Room Yield Logic
            const habId = turno.habitacion?.Identificador || 'S/N';
            if (!roomYield[habId]) roomYield[habId] = { name: habId, revenue: 0, turns: 0 };
            roomYield[habId].revenue += monto;
            roomYield[habId].turns += 1;

            // 2. Hourly & Daily Logic
            if (turno.Ingreso) {
                const date = new Date(turno.Ingreso);
                const hour = date.getHours();
                const day = date.getDay(); // 0-6 (Sun-Sat)

                hourlyYield[hour].total += monto;
                hourlyYield[hour].count += 1;

                dailyYield[day].total += monto;
                dailyYield[day].count += 1;
            }

            // 3. Promotion Logic
            const tarifa = turno.habitacion?.tarifa;
            const tNombre = (tarifa?.Nombre || '').toUpperCase();

            if (tNombre.includes('PERNOCTE')) {
                promoDataMap['Pernocte'].value += monto;
                promoDataMap['Pernocte'].count += 1;
            } else if (tarifa?.PrecioTurnoPromocional || tNombre.includes('PROMO')) {
                promoDataMap['Promoción'].value += monto;
                promoDataMap['Promoción'].count += 1;
            } else {
                promoDataMap['Plena'].value += monto;
                promoDataMap['Plena'].count += 1;
            }
        });

        // Post-processing rooms
        const roomData = Object.values(roomYield)
            .map(r => ({ ...r, avgTicket: r.revenue / r.turns }))
            .sort((a, b) => b.revenue - a.revenue);

        const promoData = Object.values(promoDataMap).filter(p => p.count > 0);

        return {
            totalTotal,
            avgPerTurn: data.length ? (totalTotal / data.length).toFixed(0) : 0,
            roomData,
            hourlyYield,
            dailyYield,
            promoData,
            totalTurns: data.length
        };
    }, [data]);

    if (isLoading) return <Loading />;
    if (error) return <Error />;

    const formatter = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    });

    return (
        <Box sx={{ p: 4, backgroundColor: '#f8fafc', minHeight: '100vh' }}>
            <Title title="Panel de Rendimiento Estratégico" />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#1e293b' }}>Análisis Operativo</Typography>
                    <Typography variant="body1" color="textSecondary">Métricas detalladas por habitación, horario y promociones</Typography>
                </Box>
                <Paper sx={{ p: 1, display: 'flex', gap: 2, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <TextField
                        type="date"
                        label="Desde"
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        variant="standard"
                        sx={{ px: 2 }}
                    />
                    <TextField
                        type="date"
                        label="Hasta"
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                        variant="standard"
                        sx={{ px: 2 }}
                    />
                </Paper>
            </Box>

            <Grid container spacing={3}>
                {/* Section 1: KPIs Principales */}
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Facturación Total"
                        value={formatter.format(stats?.totalTotal)}
                        icon={DollarSign}
                        color="#6366f1"
                        subtitle="Ingreso neto en periodo"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Total Turnos"
                        value={stats?.totalTurns}
                        icon={Zap}
                        color="#10b981"
                        subtitle="Movimiento operativo"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Ticket Promedio"
                        value={formatter.format(stats?.avgPerTurn)}
                        icon={Activity}
                        color="#f59e0b"
                        subtitle="Rendimiento por usuario"
                    />
                </Grid>
                <Grid item xs={12} md={3}>
                    <StatCard
                        title="Hab. Activas"
                        value={stats?.roomData.length}
                        icon={MapPin}
                        color="#8b5cf6"
                        subtitle="Alcance de inventario"
                    />
                </Grid>

                {/* Section 2: Análisis Temporal (Horarios y Días) */}
                <Grid item xs={12} lg={8}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: 'none' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                <Clock color="#6366f1" />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Picos de Rentabilidad por Horario</Typography>
                            </Box>
                            <Box sx={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats?.hourlyYield}>
                                        <defs>
                                            <linearGradient id="colorY" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="hour" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `$${val / 1000}k`} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            formatter={(value) => formatter.format(value)}
                                        />
                                        <Area type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorY)" name="Recaudación" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: 'none', height: '100%' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                <Calendar color="#10b981" />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Distribución Semanal</Typography>
                            </Box>
                            <Box sx={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.dailyYield} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                                        <Tooltip formatter={(value) => formatter.format(value)} cursor={{ fill: '#f1f5f9' }} />
                                        <Bar dataKey="total" fill="#10b981" radius={[0, 10, 10, 0]} name="Recaudación" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Section 3: Ranking de Habitaciones */}
                <Grid item xs={12} lg={8}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: 'none' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                <TrendingUp color="#f59e0b" />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Rendimiento por Habitación</Typography>
                            </Box>
                            <TableContainer sx={{ maxHeight: 400 }}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 700, bgcolor: '#fff' }}>Habitación</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#fff' }}>Turnos</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#fff' }}>Ticket Promedio</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700, bgcolor: '#fff' }}>Rendimiento Total</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats?.roomData.slice(0, 10).map((row, index) => (
                                            <TableRow key={row.name} hover>
                                                <TableCell sx={{ fontWeight: 600 }}>{row.name}</TableCell>
                                                <TableCell align="right">{row.turns}</TableCell>
                                                <TableCell align="right">{formatter.format(row.avgTicket)}</TableCell>
                                                <TableCell align="right">
                                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                                                            {formatter.format(row.revenue)}
                                                        </Typography>
                                                        <Box sx={{ width: '100px' }}>
                                                            <LinearProgress
                                                                variant="determinate"
                                                                value={(row.revenue / stats.roomData[0].revenue) * 100}
                                                                sx={{ height: 6, borderRadius: 3, bgcolor: '#f1f5f9', '& .MuiLinearProgress-bar': { bgcolor: '#f59e0b' } }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Section 4: Impacto de Promociones */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ borderRadius: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.05)', border: 'none', height: '100%' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                <Tag color="#ef4444" />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Efectividad Comercial</Typography>
                            </Box>
                            <Box sx={{ height: 300 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={stats?.promoData}
                                            innerRadius={70}
                                            outerRadius={100}
                                            paddingAngle={8}
                                            dataKey="value"
                                            nameKey="name"
                                        >
                                            {stats?.promoData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={8} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatter.format(value)} />
                                        <Legend verticalAlign="bottom" height={36} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                {stats?.promoData.map((p, index) => (
                                    <Box key={p.name} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                        <Typography variant="body2" color="textSecondary">{p.name}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                            {((p.value / stats.totalTotal) * 100).toFixed(1)}% <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>({p.count} turnos)</Typography>
                                        </Typography>
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default ReporteRendimiento;

