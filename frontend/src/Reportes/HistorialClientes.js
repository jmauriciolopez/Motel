import React, { useMemo, useState } from 'react';
import {
    Title,
    useGetList,
    Loading,
    Error,
    useTranslate
} from 'react-admin';
import {
    Card,
    CardContent,
    Grid,
    Typography,
    Box,
    TextField,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Avatar,
    MenuItem,
    Select,
    FormControl,
    InputLabel
} from '@mui/material';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import {
    Users,
    Car,
    Calendar,
    Award,
    TrendingUp,
    Search
} from 'lucide-react';
import { useMotel } from '../context/MotelContext';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const StatCard = ({ title, value, icon: Icon, color }) => (
    <Card sx={{
        height: '100%',
        borderRadius: 4,
        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        borderLeft: `6px solid ${color}`
    }}>
        <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
                p: 1.5,
                borderRadius: '50%',
                backgroundColor: `${color}15`,
                color: color
            }}>
                <Icon size={28} />
            </Box>
            <Box>
                <Typography variant="overline" color="textSecondary" sx={{ fontWeight: 600 }}>
                    {title}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                    {value}
                </Typography>
            </Box>
        </CardContent>
    </Card>
);

const HistorialClientes = () => {
    const translate = useTranslate();
    const { currentMotelId } = useMotel();
    const defaultDesde = new Date();
    defaultDesde.setDate(defaultDesde.getDate() - 90);
    const [desde, setDesde] = useState(defaultDesde.toISOString().split('T')[0]);
    const [hasta, setHasta] = useState(new Date().toISOString().split('T')[0]);
    const [topX, setTopX] = useState(10);

    const turnosFilter = useMemo(() => ({
        Salida_desde: desde,
        Salida_hasta: hasta,
        mostrar_cerrados: true,
        motelId: currentMotelId,
    }), [desde, hasta, currentMotelId]);

    const { data, isLoading, error } = useGetList('turnos', {
        filter: turnosFilter,
        pagination: { page: 1, perPage: 2000 },
        sort: { field: 'Ingreso', order: 'DESC' }
    });

    const stats = useMemo(() => {
        if (!data) return null;

        const customerMap = {};
        let totalRevenue = 0;

        data.forEach(turno => {
            // Un cliente se identifica por su Patente (en la relación cliente)
            const patente = (turno.cliente?.Patente || 'S/N').toUpperCase();
            if (patente === 'S/N') return;

            if (!customerMap[patente]) {
                customerMap[patente] = {
                    patente: patente,
                    visits: 0,
                    revenue: 0,
                    lastVisit: null,
                    marca: turno.cliente?.Marca || '---'
                };
            }

            customerMap[patente].visits += 1;
            customerMap[patente].revenue += Number(turno.Total || 0);
            totalRevenue += Number(turno.Total || 0);

            if (!customerMap[patente].lastVisit || new Date(turno.Ingreso) > new Date(customerMap[patente].lastVisit)) {
                customerMap[patente].lastVisit = turno.Ingreso;
            }
        });

        const sortedCustomers = Object.values(customerMap)
            .sort((a, b) => b.visits - a.visits);

        const topXData = sortedCustomers.slice(0, topX);
        const totalUnique = sortedCustomers.length;
        const avgVisits = totalUnique ? (data.length / totalUnique).toFixed(1) : 0;
        const topCustomer = sortedCustomers[0]?.patente || 'N/A';

        return {
            totalUnique,
            avgVisits,
            topCustomer,
            topXData,
            allData: sortedCustomers
        };
    }, [data, topX]);

    if (isLoading) return <Loading />;
    if (error) return <Error />;

    const formatter = new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 0
    });

    return (
        <Box sx={{ p: 4, backgroundColor: '#f3f4f6', minHeight: '100vh' }}>
            <Title title={translate('pos.reports.customer_loyalty')} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 4, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827' }}>{translate('pos.reports.customer_loyalty')}</Typography>
                    <Typography variant="body1" color="textSecondary">{translate('pos.dashboard.strategic_subtitle')}</Typography>
                </Box>
                <Paper sx={{ p: 2, display: 'flex', gap: 2, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', alignItems: 'center' }}>
                    <TextField
                        type="date"
                        label={translate('pos.reports.date_from')}
                        value={desde}
                        onChange={(e) => setDesde(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                    />
                    <TextField
                        type="date"
                        label={translate('pos.reports.date_to')}
                        value={hasta}
                        onChange={(e) => setHasta(e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        size="small"
                    />
                    <FormControl size="small" sx={{ minWidth: 100 }}>
                        <InputLabel>Ver Top</InputLabel>
                        <Select
                            value={topX}
                            label="Ver Top"
                            onChange={(e) => setTopX(e.target.value)}
                        >
                            <MenuItem value={5}>Top 5</MenuItem>
                            <MenuItem value={10}>Top 10</MenuItem>
                            <MenuItem value={20}>Top 20</MenuItem>
                            <MenuItem value={50}>Top 50</MenuItem>
                        </Select>
                    </FormControl>
                </Paper>
            </Box>

            <Grid container spacing={3}>
                {/* KPIs */}
                <Grid item xs={12} md={4}>
                    <StatCard
                        title={translate('pos.reports.unique_customers')}
                        value={stats?.totalUnique}
                        icon={Users}
                        color="#6366f1"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatCard
                        title={translate('pos.reports.average_visits')}
                        value={`${stats?.avgVisits} ${translate('pos.reports.visits').toLowerCase()}/cli`}
                        icon={TrendingUp}
                        color="#10b981"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <StatCard
                        title={translate('pos.reports.top_customer')}
                        value={stats?.topCustomer}
                        icon={Award}
                        color="#f59e0b"
                    />
                </Grid>

                {/* Gráfico de Visitas */}
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 4, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                <Car color="#6366f1" />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>{translate('pos.reports.customer_loyalty')} ({translate('pos.reports.visits')})</Typography>
                            </Box>
                            <Box sx={{ height: 350 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={stats?.topXData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                        <XAxis dataKey="patente" axisLine={false} tickLine={false} />
                                        <YAxis axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            cursor={{ fill: '#f3f4f6' }}
                                        />
                                        <Bar dataKey="visits" name={translate('pos.reports.visits')} radius={[6, 6, 0, 0]}>
                                            {stats?.topXData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Tabla de Detalle */}
                <Grid item xs={12}>
                    <Card sx={{ borderRadius: 4, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <CardContent sx={{ p: 4 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
                                <Search color="#10b981" />
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>Detalle de Fidelización de Clientes</Typography>
                            </Box>
                            <TableContainer>
                                <Table>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f9fafb' }}>
                                            <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>{translate('pos.reports.license_plate')}</TableCell>
                                            <TableCell sx={{ fontWeight: 700 }}>{translate('pos.reports.vehicle')}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{translate('pos.reports.visits')}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{translate('pos.reports.revenue')}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 700 }}>{translate('pos.reports.last_visit')}</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {stats?.allData.slice(0, 100).map((row, index) => (
                                            <TableRow key={row.patente} hover>
                                                <TableCell sx={{ color: 'text.secondary', fontWeight: 500 }}>{index + 1}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar sx={{ bgcolor: index < 3 ? COLORS[index] : '#e5e7eb', width: 32, height: 32, fontSize: '0.875rem' }}>
                                                            {index < 3 ? <Award size={16} /> : row.patente[0]}
                                                        </Avatar>
                                                        <Typography sx={{ fontWeight: 700 }}>{row.patente}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell color="textSecondary">{row.marca}</TableCell>
                                                <TableCell align="right">
                                                    <Box sx={{ display: 'inline-flex', alignItems: 'center', px: 1.5, py: 0.5, borderRadius: 2, bgcolor: '#f3f4f6', fontWeight: 700 }}>
                                                        {row.visits}
                                                    </Box>
                                                </TableCell>
                                                <TableCell align="right" sx={{ fontWeight: 600 }}>{formatter.format(row.revenue)}</TableCell>
                                                <TableCell align="right">
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                                                        <Calendar size={14} color="#94a3b8" />
                                                        {new Date(row.lastVisit).toLocaleDateString()}
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
            </Grid>
        </Box>
    );
};

export default HistorialClientes;
