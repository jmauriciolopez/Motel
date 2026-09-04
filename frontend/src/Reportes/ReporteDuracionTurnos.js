import React, { useMemo } from 'react';
import { useGetList, useGetOne, Loading, useTranslate } from 'react-admin';
import {
    Box,
    Typography,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Alert
} from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useMotel } from '../context/MotelContext';

const minutesLabel = (minutes) => {
    const value = Number(minutes) || 0;
    const hours = Math.floor(value / 60);
    const remainingMinutes = value % 60;
    if (!hours) return `${remainingMinutes} min`;
    if (!remainingMinutes) return `${hours} h`;
    return `${hours} h ${remainingMinutes} min`;
};

const formatTime = (value) => {
    if (!value) return '-';
    if (typeof value === 'string' && value.length <= 8) return value.substring(0, 5);
    return new Date(value).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
    });
};

const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const dayColumns = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' }
];

const ReporteDuracionTurnos = () => {
    const translate = useTranslate();
    const { currentMotelId, availableMoteles } = useMotel();
    const motelFromList = availableMoteles?.find((motel) => motel.id === currentMotelId);
    const { data: motel, isLoading: loadingMotel } = useGetOne('moteles', { id: currentMotelId });
    const { data: tarifas = [], isLoading: loadingTarifas } = useGetList('tarifas', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'Nombre', order: 'ASC' }
    });
    const horasEspeciales = Number(motel?.HorasExtraEspeciales) || 0;

    const filas = useMemo(() => {
        if (!motel) return [];
        const duracionDia = Number(motel.DuracionDiaria) || 0;
        const duracionNoche = Number(motel.DuracionNocturna) || 0;
        const diasEspeciales = Array.isArray(motel.DiasEspeciales)
            ? motel.DiasEspeciales.map(Number)
            : [];

        return tarifas.map((tarifa) => ({
            ...tarifa,
            duracionesPorDia: dayColumns.reduce((duraciones, day) => {
                const especial = diasEspeciales.includes(day.value);
                const minutosExtra = Number(tarifa.MinutosExtra ?? tarifa.minutosExtra) || 0;
                duraciones[day.value] = {
                    dia: (duracionDia + (especial ? horasEspeciales : 0)) * 60 + minutosExtra,
                    noche: motel.HorarioUnico
                        ? null
                        : (duracionNoche + (especial ? horasEspeciales : 0)) * 60 + minutosExtra,
                    especial
                };
                return duraciones;
            }, {})
        }));
    }, [motel, tarifas]);

    if (loadingMotel || loadingTarifas) return <Loading />;

    const currentMotelName = motel?.Nombre || motelFromList?.Nombre || 'Motel';
    const aplicaCorte = motel?.AplicaCorteCheckout !== false;
    const diasEspeciales = Array.isArray(motel?.DiasEspeciales)
        ? motel.DiasEspeciales.map(Number).filter((dia) => dia >= 0 && dia <= 6)
        : [];
    const diasEspecialesLabel = diasEspeciales.length
        ? diasEspeciales.map((dia) => dayNames[dia]).join(', ')
        : 'No configurados';
    const rangoEspecial = motel?.HorarioUnico
        ? 'Todo el día'
        : `Día: ${formatTime(motel?.InicioDia)} a ${formatTime(motel?.InicioNoche)}; noche: solo entre días especiales contiguos`;
    const inicioDia = formatTime(motel?.InicioDia);
    const inicioNoche = formatTime(motel?.InicioNoche);

    return (
        <Box p={3}>
            <Box display="flex" alignItems="center" gap={1.5} mb={1}>
                <AccessTimeIcon color="primary" />
                <Typography variant="h4" fontWeight="800">
                    {translate('pos.reports.shift_duration_report', { defaultValue: 'Duración de turnos' })}
                </Typography>
            </Box>
            <Typography variant="subtitle1" color="text.secondary" mb={3}>
                {currentMotelName}
            </Typography>

            <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                <TableContainer>
                    <Table sx={{ minWidth: 1450 }}>
                        <TableHead>
                            <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 800 }}>Tarifa</TableCell>
                                {dayColumns.map((day) => (
                                    <TableCell key={day.value} align="center" sx={{ fontWeight: 800, minWidth: 120 }}>
                                        {day.label}
                                    </TableCell>
                                ))}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filas.map((fila) => (
                                <TableRow key={fila.id} hover>
                                    <TableCell><Typography fontWeight={700}>{fila.Nombre}</Typography></TableCell>
                                    {dayColumns.map((day) => {
                                        const duracion = fila.duracionesPorDia[day.value];
                                        return (
                                            <TableCell key={day.value} align="center" sx={{ bgcolor: duracion.especial ? '#fff7ed' : undefined }}>
                                                <Typography variant="body2" fontWeight={700}>{minutesLabel(duracion.dia)}</Typography>
                                                {!motel.HorarioUnico && (
                                                    <Typography variant="caption" color="text.secondary">N: {minutesLabel(duracion.noche)}</Typography>
                                                )}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Paper elevation={0} sx={{ mt: 2, p: 2.5, border: '1px solid #e2e8f0', borderRadius: '16px' }}>
                <Typography variant="h6" fontWeight={800} mb={1.5}>
                    Días especiales y rango de aplicación
                </Typography>
                <Box display="grid" gridTemplateColumns={{ xs: '1fr', md: '1fr 1fr' }} gap={2}>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Inicio tarifa diurna</Typography>
                        <Typography fontWeight={700}>{inicioDia} hs</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Inicio tarifa nocturna</Typography>
                        <Typography fontWeight={700}>{inicioNoche} hs</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Días configurados</Typography>
                        <Typography fontWeight={700}>{diasEspecialesLabel}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Rango horario</Typography>
                        <Typography fontWeight={700}>{rangoEspecial}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary" display="block">Horas adicionales</Typography>
                        <Typography fontWeight={700}>{horasEspeciales ? `${horasEspeciales} h` : 'Sin horas adicionales'}</Typography>
                    </Box>
                    <Box gridColumn={{ xs: 'auto', md: '1 / -1' }}>
                        <Typography variant="caption" color="text.secondary" display="block">Referencia de la tabla</Typography>
                        <Typography variant="body2">Cada día muestra D = diurno y N = nocturno. D suma horas extra si el día es especial; N las suma solo cuando el día actual y el siguiente son especiales.</Typography>
                    </Box>
                </Box>
            </Paper>

            <Alert severity="info" sx={{ mt: 2, borderRadius: '12px' }}>
                Configuración del motel: día {motel.DuracionDiaria} h, noche {motel.DuracionNocturna} h,
                tolerancia {motel.Tolerancia} min. El pernocte se calcula desde el ingreso hasta el checkout ({formatTime(motel.CheckOutDia)}), por eso no tiene una duración fija.
                {aplicaCorte ? ' El turno diurno puede limitarse al checkout.' : ''}
            </Alert>
        </Box>
    );
};

export default ReporteDuracionTurnos;