import React, { useState, useEffect } from 'react';
import {
    List, Datagrid, TextField, NumberField, DateField,
    Edit, Create, SimpleForm, TextInput, NumberInput,
    ReferenceInput, AutocompleteInput, DateTimeInput,
    useRecordContext,
    RecordContextProvider,
    useTranslate,
    useListContext,
    useGetList,
    usePermissions,
    Button,
    useNotify,
    useRedirect,
    EditButton,
    Filter,
    BooleanInput,
    BooleanField,
    FunctionField,
    CreateButton,
    useUpdate,
    Confirm,
    required,
    TopToolbar,
    ListButton,
    DeleteButton,
    RadioButtonGroupInput,
    useCreate,
    useRefresh
} from 'react-admin';
import { Box, Chip, Stack, Grid, Typography, Paper, Tooltip, IconButton, Popover, TextField as MuiTextField, Autocomplete, CircularProgress, Divider } from '@mui/material';
import { Link, useLocation } from 'react-router-dom';
import {
    ShoppingCart as ShoppingCartIcon,
    ExitToApp as KeyOffIcon,
    Payments as PaymentIcon,
    CleaningServices as CleaningServicesIcon,
    RoomService as RoomServiceIcon,
    ArrowBack as ArrowBackIcon,
    ReceiptLong as BrunchDiningIcon,
    Edit as EditIcon,
    TableChart as TableChartIcon,
    GridView as GridViewIcon,
    ViewList as ViewListIcon,
    TimeToLeave as CarIcon,
    ExitToApp as ExitIcon,
    Schedule as ScheduleIcon,
    AttachMoney as MoneyIcon,
    Add as AddIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';
import { Sparkles } from 'lucide-react';
import { useMotel } from '../context/MotelContext';
import QuickCreateCliente from './QuickCreateCliente';
import CustomToolbar from '../layout/CustomToolbar';
import { useGetOne, FormDataConsumer } from 'react-admin';
import { Cookies, getApiUrl } from '../helpers/Utils';

const AZURE_BLUE = '#213894';
const TONAL_SURFACE = 'rgba(33, 56, 148, 0.04)';
const SOFT_HOVER = 'rgba(33, 56, 148, 0.08)';

const ClientExtraInfo = ({ clientId }) => {
    const { data: client, isLoading } = useGetOne('clientes', { id: clientId }, { enabled: !!clientId });
    if (isLoading || !client) return null;
    return (
        <Box sx={{ mt: 0.5, mb: 1, ml: 1, borderLeft: '3px solid', borderColor: 'primary.main', pl: 1.5 }}>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                {client.Movilidad?.Tipo || ''} {client.Marca || 'Sin marca'} {client.Color ? `(${client.Color})` : ''}
            </Typography>
        </Box>
    );
};

const RemainingTimeField = () => {
    const record = useRecordContext();
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        if (!record || record.Salida) return;
        const interval = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(interval);
    }, [record]);

    if (!record) return null;
    if (record.Salida) return <Typography variant="caption" color="text.disabled">Terminado</Typography>;

    const ingreso = new Date(record.Ingreso).getTime();
    const minutos = record.Minutos || 0;
    const finEstimado = ingreso + (minutos * 60000);
    const restante = finEstimado - now.getTime();
    const isLate = restante < 0;

    const absoluteDiff = Math.abs(restante);
    const h = Math.floor(absoluteDiff / 3600000);
    const m = Math.floor((absoluteDiff % 3600000) / 60000);

    const timeString = new Date(finEstimado).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <Tooltip title={`Inició: ${new Date(record.Ingreso).toLocaleTimeString()} | Duración: ${minutos} min | Debe salir: ${timeString}`}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, cursor: 'help' }}>
                <Typography
                    variant="body2"
                    sx={{
                        fontWeight: 800,
                        color: isLate ? 'error.main' : 'primary.main',
                        letterSpacing: '0.5px'
                    }}
                >
                    {isLate ? '-' : ''}{h > 0 ? `${h}h ` : ''}{m}m
                </Typography>
                {isLate && (
                    <Chip
                        label="EXC"
                        size="small"
                        color="error"
                        sx={{ height: 16, fontSize: '0.6rem', fontWeight: 900, px: 0 }}
                    />
                )}
            </Box>
        </Tooltip>
    );
};

const HabitacionExtraInfo = ({ habitacionId }) => {
    // La habitación ya carga su tarifa por defecto via dataProvider config (populate[tarifa]=true)
    const { data: habitacion, isLoading } = useGetOne('habitaciones', { id: habitacionId }, { enabled: !!habitacionId });
    if (isLoading || !habitacion || !habitacion.tarifa) return null;

    return (
        <Box sx={{ mt: 0.5, mb: 1, ml: 1, borderLeft: '3px solid', borderColor: 'secondary.main', pl: 1.5 }}>
            <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
                {habitacion.tarifa.Nombre} - <strong>${habitacion.tarifa.PrecioTurno?.toLocaleString()}</strong>
            </Typography>
        </Box>
    );
};

const Requerido = [required()];

const QuickConsumoPopover = ({ anchorEl, onClose, open, turnoId }) => {
    const { currentMotelId: motelId } = useMotel();
    const [producto, setProducto] = useState(null);
    const [cantidad, setCantidad] = useState(1);
    const notify = useNotify();
    const refresh = useRefresh();
    const [create, { isLoading: isSaving }] = useCreate();

    // Obtener productos facturables con stock desde endpoint custom
    const [productos, setProductos] = useState([]);
    const [isLoadingProducts, setIsLoadingProducts] = useState(false);
    useEffect(() => {
        if (!motelId) return;
        setIsLoadingProducts(true);
        const token = Cookies.getCookie('token');
        fetch(getApiUrl('/productos/con-stock'), {
            headers: { Authorization: `Bearer ${token}`, 'x-motel-id': motelId },
        })
            .then(r => r.json())
            .then(d => setProductos(d.data || []))
            .catch(() => { })
            .finally(() => setIsLoadingProducts(false));
    }, [motelId]);

    const handleAdd = () => {
        if (!producto) return;
        create(
            'consumos',
            { data: { turnoId, productoId: producto.id, Cantidad: cantidad } },
            {
                onSuccess: () => {
                    notify('Consumo agregado', { type: 'success' });
                    refresh();
                    onClose();
                    setProducto(null);
                    setCantidad(1);
                },
                onError: (error) => notify(`Error: ${error.message}`, { type: 'warning' })
            }
        );
    };

    const handleQuickAdd = (prod) => {
        create(
            'consumos',
            { data: { turnoId, productoId: prod.id, Cantidad: 1 } },
            {
                onSuccess: () => {
                    notify(`${prod.Nombre} agregado`, { type: 'success' });
                    refresh();
                    onClose();
                }
            }
        );
    };

    const commonItems = productos?.filter(p => p.EsComun) || []; // Filtrar por propiedad EsComun del modelo

    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            PaperProps={{ sx: { p: 2, width: 300, borderRadius: 2, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' } }}
            onClick={e => e.stopPropagation()}
        >
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 700, color: 'primary.main' }}>
                Carga Rápida de Consumo
            </Typography>

            {/* Accesos Directos */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>Comunes:</Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {commonItems.map(item => (
                        <Chip
                            key={item.id}
                            label={item.Nombre}
                            size="small"
                            onClick={() => handleQuickAdd(item)}
                            sx={{ fontSize: '0.65rem' }}
                            icon={<AddIcon style={{ fontSize: '0.8rem' }} />}
                        />
                    ))}
                </Stack>
            </Box>

            <Divider sx={{ mb: 2 }} />

            <Stack spacing={2}>
                <Autocomplete
                    size="small"
                    options={productos || []}
                    getOptionLabel={(option) => option.Nombre}
                    loading={isLoadingProducts}
                    value={producto}
                    onChange={(e, newValue) => setProducto(newValue)}
                    renderInput={(params) => (
                        <MuiTextField
                            {...params}
                            label="Producto"
                            variant="outlined"
                            InputProps={{
                                ...params.InputProps,
                                endAdornment: (
                                    <React.Fragment>
                                        {isLoadingProducts ? <CircularProgress color="inherit" size={20} /> : null}
                                        {params.InputProps.endAdornment}
                                    </React.Fragment>
                                ),
                            }}
                        />
                    )}
                />

                <MuiTextField
                    size="small"
                    label="Cantidad"
                    type="number"
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
                    inputProps={{ min: 1 }}
                />

                <Button
                    fullWidth
                    variant="contained"
                    disabled={!producto || isSaving}
                    onClick={handleAdd}
                    startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
                    sx={{
                        backgroundColor: AZURE_BLUE,
                        '&:hover': { backgroundColor: '#1a2d75' },
                        borderRadius: '12px',
                        py: 1,
                        fontWeight: 700,
                        textTransform: 'none',
                        boxShadow: '0 4px 12px rgba(33, 56, 148, 0.2)'
                    }}
                >
                    {isSaving ? 'Agregando...' : 'Agregar Consumo'}
                </Button>
            </Stack>
        </Popover>
    );
};

const CreateConsumoButton = ({ showLabel = true }) => {
    const record = useRecordContext();
    const [anchorEl, setAnchorEl] = useState(null);

    if (!record) return null;
    const isPaid = record.PagoPendiente === false;

    const handleOpen = (event) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => setAnchorEl(null);
    const open = Boolean(anchorEl);

    return (
        <>
            <Button
                disabled={isPaid}
                variant="text"
                sx={{
                    padding: showLabel ? '6px 12px' : '6px',
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                    borderRadius: '8px',
                    color: AZURE_BLUE,
                    backgroundColor: TONAL_SURFACE,
                    '&:hover': { backgroundColor: SOFT_HOVER },
                    fontWeight: 700,
                    textTransform: 'none'
                }}
                startIcon={<ShoppingCartIcon sx={{ fontSize: '1.2rem', mr: showLabel ? 0 : -0.5 }} />}
                title={isPaid ? "Turno pagado" : "Cargar consumos"}
                onClick={handleOpen}
            >
                {showLabel ? 'Consumo' : null}
            </Button>
            <QuickConsumoPopover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                turnoId={record.id || record.id}
            />
        </>
    );
};

const DashboardButton = ({ showLabel = true }) => {
    const record = useRecordContext();
    return (
        <Button
            variant="text"
            sx={{
                padding: showLabel ? '6px 12px' : '6px',
                fontSize: '0.75rem',
                minWidth: 'auto',
                borderRadius: '8px',
                color: AZURE_BLUE,
                backgroundColor: TONAL_SURFACE,
                '&:hover': { backgroundColor: SOFT_HOVER },
                fontWeight: 700,
                textTransform: 'none'
            }}
            startIcon={<RoomServiceIcon sx={{ fontSize: '1.2rem', mr: showLabel ? 0 : -0.5 }} />}
            component={Link}
            title="Ver Consumos"
            onClick={e => e.stopPropagation()}
            to={{
                pathname: '/consumos',
                search: `?filter=${JSON.stringify({ "turnoId": record.id || record.id })}`
            }}
        >
            {showLabel ? 'Ver' : null}
        </Button>
    );
};

const LimpiezaButton = ({ label }) => {
    const record = useRecordContext();
    const { data } = useListContext();
    const translate = useTranslate();

    const habitacionEstado = record.habitacion?.Estado?.toLowerCase() || '';
    const isDirty = ['sucio', 'sucia', 'por limpiar', 'porlimpiar'].some(s => habitacionEstado.includes(s));
    const isClosed = !!record.Salida;

    // Solo habilitamos si es el turno más nuevo de esta habitación en la lista actual
    const isLatest = data?.find(r => r.habitacion?.id === record.habitacion?.id)?.id === record.id;
    const canClean = isClosed && isDirty && isLatest;

    return (
        <span onClick={e => e.stopPropagation()}>
            <Button
                disabled={!canClean}
                variant="text"
                sx={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    color: '#FF9800', // Un naranja suave para advertencia/limpieza
                    backgroundColor: 'rgba(255, 152, 0, 0.04)',
                    '&:hover': { backgroundColor: 'rgba(255, 152, 0, 0.08)' },
                    fontWeight: 700,
                    textTransform: 'none'
                }}
                startIcon={<CleaningServicesIcon />}
                component={Link}
                to={{ pathname: '/limpiezas/create' }}
                state={{ record: { turnoId: record.id || record.id } }}
            >
                {label ? translate(label) : 'Limpiar'}
            </Button>
        </span>
    );
};

const PagoButton = ({ label }) => {
    const record = useRecordContext();
    const translate = useTranslate();
    const isCerrado = !!record.Salida;
    const isPaid = record.PagoPendiente === false;
    const canPay = isCerrado && !isPaid;

    return (
        <span onClick={e => e.stopPropagation()}>
            <Button
                disabled={!canPay}
                variant="text"
                sx={{
                    padding: '6px 12px',
                    fontSize: '0.75rem',
                    borderRadius: '8px',
                    color: '#4CAF50', // Verde semántico suave
                    backgroundColor: 'rgba(76, 175, 80, 0.04)',
                    '&:hover': { backgroundColor: 'rgba(76, 175, 80, 0.08)' },
                    fontWeight: 700,
                    textTransform: 'none'
                }}
                startIcon={<PaymentIcon />}
                component={Link}
                to={{ pathname: '/pagos/create' }}
                state={{ record: { turnoId: record.id || record.id, importe: record.Total } }}
            >
                {label ? translate(label) : 'Pago'}
            </Button>
        </span>
    );
};

const CerrarTurnoButton = ({ showLabel = true }) => {
    const record = useRecordContext();
    const notify = useNotify();
    const [update, { isLoading }] = useUpdate();
    const [open, setOpen] = React.useState(false);

    const handleConfirm = () => {
        update(
            'turnos',
            {
                id: record.id,
                data: { Salida: new Date().toISOString() }
            },
            {
                onSuccess: () => {
                    notify('Turno cerrado correctamente', { type: 'success' });
                    setOpen(false);
                },
                onError: (error) => {
                    notify(`Error al cerrar: ${error.message}`, { type: 'warning' });
                    setOpen(false);
                },
            }
        );
    };

    if (!record || record.Salida) return null;

    return (
        <>
            <Button
                variant="text"
                size="small"
                startIcon={<KeyOffIcon sx={{ mr: showLabel ? 0 : -0.5 }} />}
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                disabled={isLoading}
                sx={{
                    padding: showLabel ? '6px 12px' : '6px',
                    fontSize: '0.75rem',
                    minWidth: 'auto',
                    fontWeight: 700,
                    borderRadius: '8px',
                    color: '#C62828', // Rojo semántico suave
                    backgroundColor: 'rgba(198, 40, 40, 0.04)',
                    '&:hover': { backgroundColor: 'rgba(198, 40, 40, 0.08)' },
                    textTransform: 'none'
                }}
            >
                {showLabel ? 'Cerrar' : null}
            </Button>
            <Confirm
                isOpen={open}
                loading={isLoading}
                title="Confirmar Cierre"
                content="¿Cerrar este turno ahora?"
                onConfirm={handleConfirm}
                onClose={(e) => { e.stopPropagation(); setOpen(false); }}
                confirmColor="warning"
                ConfirmIcon={KeyOffIcon}
                sx={{
                    '& .MuiDialog-paper': { borderRadius: '24px', padding: '16px', minWidth: '300px', textAlign: 'center' },
                    '& .MuiDialogTitle-root': { fontSize: '1.2rem', fontWeight: 800 }
                }}
            />
        </>
    );
};

const StatusField = () => {
    const record = useRecordContext();
    if (!record) return null;
    const isCerrado = !!record.Salida;
    return (
        <Chip
            label={isCerrado ? "CERRADO" : "ACTIVO"}
            color={isCerrado ? "default" : "success"}
            variant={isCerrado ? "outlined" : "filled"}
            size="small"
            sx={{ fontWeight: 'bold' }}
        />
    );
};

const TurnoFilter = (props) => (
    <Filter {...props}>
        <BooleanInput
            label="resources.turnos.fields.mostrar_cerrados"
            source="mostrar_cerrados"
            alwaysOn
        />
    </Filter>
);

const TurnoCard = ({ record }) => {
    const translate = useTranslate();
    const isReserva = record.__type === 'reserva';
    const isCerrado = !isReserva && !!record.Salida;
    const isPaid = !isReserva && record.PagoPendiente === false;
    const habitacionEstado = record.habitacion?.Estado?.toLowerCase() || '';
    const isDirty = !isReserva && ['sucio', 'sucia', 'por limpiar', 'porlimpiar'].some(s => habitacionEstado.includes(s));

    // Colores del sistema Azure Hospitality
    const deepBlue = '#213894';
    const activeGreen = '#4CAF50';
    const errorRed = '#C62828'; // Un rojo más elegante para reservas
    const cleaningGray = '#9e9e9e';

    const getStatusInfo = () => {
        if (isReserva) return { label: 'RESERVADO', color: errorRed };
        if (isCerrado) {
            if (isDirty) return { label: 'LIMPIEZA', color: cleaningGray };
            return { label: 'CERRADO', color: '#757575' };
        }
        return { label: 'ACTIVO', color: activeGreen };
    };

    const status = getStatusInfo();

    return (
        <RecordContextProvider value={record}>
            <Paper
                elevation={2}
                sx={{
                    borderRadius: '16px',
                    overflow: 'hidden',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                    },
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    border: isReserva ? `2px dashed ${errorRed}` : '1px solid',
                    borderColor: isReserva ? errorRed : 'divider',
                    backgroundColor: isReserva ? 'rgba(198, 40, 40, 0.02)' : '#fff'
                }}
            >
                {/* Header */}
                <Box sx={{ p: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography
                            variant="h4"
                            sx={{
                                fontWeight: 800,
                                color: isReserva ? errorRed : AZURE_BLUE,
                                fontFamily: 'Manrope, sans-serif',
                                lineHeight: 1
                            }}
                        >
                            {record.habitacion?.Identificador || '---'}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                            {isReserva ? (
                                <ScheduleIcon sx={{ fontSize: '0.9rem', color: errorRed, mr: 0.5 }} />
                            ) : (
                                <CarIcon sx={{ fontSize: '0.9rem', color: 'text.secondary', mr: 0.5 }} />
                            )}
                            <Typography
                                variant="body2"
                                sx={{
                                    fontWeight: 600,
                                    letterSpacing: 1,
                                    color: isReserva ? errorRed : 'text.secondary',
                                    fontSize: '0.7rem'
                                }}
                            >
                                {isReserva ? 'RESERVA' : (record.cliente?.Patente || '------')}
                            </Typography>
                        </Box>
                    </Box>
                    <Chip
                        label={status.label}
                        size="small"
                        sx={{
                            backgroundColor: 'white',
                            color: status.color,
                            border: `1.5px solid ${status.color}`,
                            fontWeight: 900,
                            fontSize: '0.6rem',
                            borderRadius: '8px',
                            height: '24px'
                        }}
                    />
                </Box>

                {/* Content Info Box */}
                <Box sx={{ p: 2, pt: 1, flexGrow: 1 }}>
                    <Box
                        sx={{
                            backgroundColor: isReserva ? 'rgba(198, 40, 40, 0.05)' : 'rgba(0,0,0,0.02)',
                            borderRadius: '12px',
                            p: 1.5,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1
                        }}
                    >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                {isReserva ? 'Check-in previsto:' : 'Entrada:'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {new Date(record.Ingreso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </Typography>
                        </Box>
                        {!isReserva && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                                    {isCerrado ? 'Salida:' : 'Restante/Exc:'}
                                </Typography>
                                {isCerrado ? (
                                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                        {new Date(record.Salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </Typography>
                                ) : (
                                    <RemainingTimeField />
                                )}
                            </Box>
                        )}
                        {isReserva && (
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>Cliente:</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>{record.cliente?.Patente || 'S/P'}</Typography>
                            </Box>
                        )}
                    </Box>
                </Box>

                {/* Financial Info */}
                {!isReserva ? (
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.65rem', textTransform: 'uppercase' }}>Total Acumulado</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                            <Typography variant="h5" sx={{ color: AZURE_BLUE, fontWeight: 900, mt: -0.5 }}>
                                ${record.Total?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Typography>
                        </Box>
                    </Box>
                ) : (
                    <Box sx={{ px: 2, py: 1.5, display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="caption" sx={{ color: errorRed, fontWeight: 700 }}>PROXIMO INGRESO</Typography>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            Asegurar habitación {record.habitacion?.Identificador}
                        </Typography>
                    </Box>
                )}

                {/* Footer Actions */}
                <Box
                    sx={{
                        p: 1.5,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: isReserva ? 'rgba(198, 40, 40, 0.05)' : 'rgba(0,0,0,0.01)'
                    }}
                >
                    <Box>
                        <IconButton
                            component={Link}
                            to={isReserva ? `/reservas/${record.id}` : `/turnos/${record.id}`}
                            size="small"
                            sx={{
                                color: isReserva ? errorRed : deepBlue,
                                backgroundColor: TONAL_SURFACE,
                                borderRadius: '8px',
                                '&:hover': { backgroundColor: SOFT_HOVER }
                            }}
                            title="Editar"
                        >
                            <EditIcon fontSize="small" />
                        </IconButton>
                    </Box>

                    <Stack direction="row" spacing={1}>
                        {isReserva ? (
                            <Button
                                variant="text"
                                sx={{
                                    padding: '6px 12px',
                                    fontSize: '0.75rem',
                                    borderRadius: '8px',
                                    color: errorRed,
                                    backgroundColor: 'rgba(198, 40, 40, 0.04)',
                                    '&:hover': { backgroundColor: 'rgba(198, 40, 40, 0.08)' },
                                    fontWeight: 700,
                                    textTransform: 'none'
                                }}
                                startIcon={<AddIcon />}
                                component={Link}
                                to="/turnos/create"
                                state={{
                                    record: {
                                        habitacionId: record.habitacion?.id,
                                        clienteId: record.cliente?.id,
                                        reservaReference: record.id
                                    }
                                }}
                            >
                                Check-In
                            </Button>
                        ) : (
                            isCerrado ? (
                                <>
                                    {!isPaid && <PagoButton label={false} />}
                                    {isDirty && <LimpiezaButton label={false} />}
                                    <DashboardButton showLabel={false} />
                                </>
                            ) : (
                                <>
                                    <DashboardButton showLabel={false} />
                                    <CreateConsumoButton showLabel={false} />
                                    <CerrarTurnoButton showLabel={false} />
                                </>
                            )
                        )}
                    </Stack>
                </Box>
            </Paper>
        </RecordContextProvider>
    );
};

const TurnoCardGrid = () => {
    const { data: turnos, isPending: isTurnosPending } = useListContext();

    // Memorizar el filtro para evitar loops (el objeto filter es parte de la key de la query)
    const filter = React.useMemo(() => {
        // Redondear a los 10 minutos anteriores para estabilizar la key de la cache
        const now = new Date();
        now.setSeconds(0, 0);
        const minutes = now.getMinutes();
        now.setMinutes(minutes - (minutes % 10));

        const fourHoursLater = new Date(now.getTime() + 4 * 60 * 60 * 1000);

        return {
            Estado: ['Pendiente', 'Confirmada'],
            'Ingreso[$gte]': now.toISOString(),
            'Ingreso[$lte]': fourHoursLater.toISOString()
        };
    }, []);

    const { data: reservas } = useGetList('reservas', {
        pagination: { page: 1, perPage: 20 },
        sort: { field: 'Ingreso', order: 'ASC' },
        filter
    });

    if (isTurnosPending) return null;

    // Combinar y ordenar: primero turnos activos, luego reservas por hora de ingreso
    const mixedData = [
        ...(turnos || []).map(t => ({ ...t, __type: 'turno' })),
        ...(reservas || []).map(r => ({ ...r, __type: 'reserva' }))
    ].sort((a, b) => {
        // Reservas al final, ordenadas por tiempo de ingreso
        if (a.__type === 'reserva' && b.__type === 'turno') return 1;
        if (a.__type === 'turno' && b.__type === 'reserva') return -1;
        if (a.__type === 'reserva' && b.__type === 'reserva') {
            return new Date(a.Ingreso) - new Date(b.Ingreso);
        }
        return 0; // Turnos mantienen su orden del ListContext
    });

    return (
        <Grid container spacing={3} sx={{ p: 1, mt: 1 }}>
            {mixedData.map(record => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={`${record.__type}-${record.id}`}>
                    <TurnoCard record={record} />
                </Grid>
            ))}
        </Grid>
    );
};

// Contenido de la lista con lógica de empty state contextual
const TurnoListContent = ({ viewMode }) => {
    const { total, isPending, filterValues } = useListContext();
    const translate = useTranslate();
    const { permissions } = usePermissions();
    const isAdmin = permissions === 'Administrador' || permissions === 'SuperAdmin';
    const canCreate = isAdmin || permissions === 'Supervisor' || permissions === 'Recepcionista';

    if (isPending) return null;

    if (total === 0) {

        // [Existing empty state logic...]
        const mostrarCerrados = filterValues?.mostrar_cerrados;
        if (!mostrarCerrados) {
            return (
                <Box sx={{ mt: 4, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        {translate('resources.turnos.empty')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        Activá "Ver Cerrados" para ver el historial de turnos.
                    </Typography>
                    {canCreate && <CreateButton variant="contained" label="Crear nuevo turno" />}
                </Box>
            );
        }

        return (
            <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>
                    No hay turnos para mostrar con los filtros aplicados.
                </Typography>
                {canCreate && <CreateButton variant="contained" label="Crear nuevo turno" />}
            </Box>
        );
    }

    if (viewMode === 'cards') {
        return <TurnoCardGrid />;
    }

    return (
        <Datagrid
            rowClick="edit"
            bulkActionButtons={false}
            size="medium"
            sx={{
                '& .RaDatagrid-headerCell': {
                    fontWeight: 800,
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    color: 'text.secondary',
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(0,0,0,0.05)'
                },
                '& .RaDatagrid-row:hover': { backgroundColor: 'rgba(33, 56, 148, 0.02)' },
                '& .MuiTableCell-root': { borderBottom: '1px solid rgba(0,0,0,0.03)' }
            }}
        >
            <TextField label="Hab" source="habitacion.Identificador" sx={{ fontWeight: 800, color: AZURE_BLUE }} />
            <TextField label="Patente" source="cliente.Patente" />
            <StatusField label="Estado" />
            <TextField label="Personal" source="usuario.Username" />
            <FunctionField
                label="Pagado"
                render={record => (
                    <BooleanField
                        record={{ ...record, Pagado: !record.PagoPendiente }}
                        source="Pagado"
                    />
                )}
            />
            <Stack direction="row" spacing={1} label="Acciones">
                <DashboardButton />
                <CreateConsumoButton />
                <CerrarTurnoButton />
                <EditButton
                    label={false}
                    startIcon={<EditIcon />}
                    variant="text"
                    sx={{
                        minWidth: 'auto',
                        color: 'text.secondary',
                        '&:hover': { color: AZURE_BLUE, backgroundColor: TONAL_SURFACE }
                    }}
                />
            </Stack>

            <DateField source="Ingreso" label="Ingreso" showTime showDate={false} options={{ hour: '2-digit', minute: '2-digit' }} />
            <RemainingTimeField label="Resta" />
            <DateField source="Salida" label="Salida" showTime showDate={false} options={{ hour: '2-digit', minute: '2-digit' }} />
            <NumberField source="Total" options={{ style: 'currency', currency: 'ARS' }} sx={{ fontWeight: 800, color: AZURE_BLUE }} />
            <Stack direction="row" spacing={1} label="Otros">
                <PagoButton label={false} />
                <LimpiezaButton label={false} />
            </Stack>
        </Datagrid>
    );
};

const TurnoListActions = ({ viewMode, setViewMode }) => {
    const { permissions } = usePermissions();
    const isAdmin = permissions === 'Administrador' || permissions === 'SuperAdmin';
    const canCreate = isAdmin || permissions === 'Supervisor' || permissions === 'Recepcionista';

    return (
        <TopToolbar>
            {canCreate && <CreateButton />}
            <Button
                onClick={() => setViewMode(viewMode === 'list' ? 'cards' : 'list')}
                variant="outlined"
                size="small"
                sx={{ ml: 1, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                startIcon={viewMode === 'list' ? <GridViewIcon /> : <ViewListIcon />}
            >
                {viewMode === 'list' ? 'Vista Panel' : 'Vista Lista'}
            </Button>
            <Button
                component={Link}
                to="/CuadroTarifario"
                variant="outlined"
                size="small"
                sx={{ ml: 1, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                startIcon={<TableChartIcon />}
            >
                Ver Tarifario
            </Button>
        </TopToolbar>
    );
};

export const TurnoList = props => {
    const translate = useTranslate();

    // Persistencia de la vista preferida
    const [viewMode, setViewMode] = useState(() => {
        return localStorage.getItem('turnos_view_mode') || 'cards';
    });

    useEffect(() => {
        localStorage.setItem('turnos_view_mode', viewMode);
    }, [viewMode]);

    return (
        <List
            actions={<TurnoListActions viewMode={viewMode} setViewMode={setViewMode} />}
            filters={<TurnoFilter />}
            filterDefaultValues={{ mostrar_cerrados: false }}
            sort={{ field: 'id', order: 'DESC' }}
            perPage={viewMode === 'cards' ? 48 : 25} // Más items en vista tarjetas
            sx={{ mt: 2 }}
            empty={false}
            title="Turnos"
        >
            <TurnoListContent viewMode={viewMode} />
        </List>
    );
};

const TurnoEditActions = () => {
    const { permissions } = usePermissions();
    const isAdmin = permissions === 'Administrador';
    const isSupervisor = isAdmin || permissions === 'Supervisor';

    const record = useRecordContext();
    if (!record) return null;

    // Un turno se considera cerrado si tiene fecha de Salida
    const isClosed = !!record.Salida;

    return (
        <TopToolbar>
            <ListButton />
            {isSupervisor && !isClosed && <DeleteButton />}
        </TopToolbar>
    );
};

const TurnoEdit = () => (
    <Edit actions={<TurnoEditActions />} mutationMode="pessimistic">
        <SimpleForm toolbar={<CustomToolbar />}>
            <Grid container spacing={1}>
                <Grid item xs={4}>
                    <DateTimeInput source="Ingreso" readOnly />
                    <DateTimeInput source="Salida" defaultValue={new Date()} readOnly />
                    <NumberInput source="PrecioCalculo" readOnly />
                </Grid>
                <Grid item xs={4}>
                    <ReferenceInput source="habitacionId" reference="habitaciones">
                        <AutocompleteInput label='Habitacion' optionText='Identificador' readOnly />
                    </ReferenceInput>
                    <NumberInput source="Precio" step="100" readOnly />
                </Grid>
                <Grid item xs={4}>
                    <ReferenceInput source="clienteId" reference="clientes">
                        <AutocompleteInput label='Cliente' optionText='Patente' readOnly />
                    </ReferenceInput>
                    <NumberInput source="Total" step="100" readOnly />
                </Grid>
            </Grid>
            <Grid container spacing={1}>
                <Grid item xs={12}>
                    <TextInput source="Observacion" multiline fullWidth />
                </Grid>
                <Grid item xs={12}>
                    <TextInput source="ObservacionSecundaria" multiline fullWidth />
                </Grid>
            </Grid>
        </SimpleForm>
    </Edit>
);

const TurnoCreate = () => {
    const location = useLocation();
    const prefilledData = location.state?.record || {};
    const notify = useNotify();
    const [update] = useUpdate();

    // Si viene de una reserva, permitimos seleccionar esa habitación aunque esté 'Reservada'
    const filterHabitacion = {
        $or: [
            { Estado: 'DISPONIBLE' },
            ...(prefilledData.habitacionId ? [{ id: prefilledData.habitacionId }] : [])
        ]
    };

    const navigate = useRedirect();
    const handleSuccess = (data) => {
        // Si hay una reserva asociada, la marcamos como Finalizada
        if (prefilledData.reservaReference) {
            update(
                'reservas',
                { id: prefilledData.reservaReference, data: { Estado: 'Finalizada' } },
                {
                    onSuccess: () => {
                        notify('Turno creado y reserva finalizada', { type: 'success' });
                    },
                    onError: () => {
                        notify('Turno creado, pero hubo un error al finalizar la reserva', { type: 'warning' });
                    }
                }
            );
        }
        navigate('/turnos');
    };

    const transform = (data) => {
        // Extraer IDs: soportar tanto habitacionId directo como objeto anidado (legacy)
        const habitacionId = data.habitacionId || (typeof data.habitacion === 'object' ? data.habitacion?.id : data.habitacion);
        const clienteId = data.clienteId || (typeof data.cliente === 'object' ? data.cliente?.id : data.cliente);
        const tarifaId = data.tarifaId || (typeof data.tarifa === 'object' ? data.tarifa?.id : data.tarifa);

        // userId del usuario logueado
        let usuarioAperturaId = null;
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            usuarioAperturaId = u?.id || null;
        } catch { /* ignore */ }

        return {
            habitacionId,
            clienteId,
            tarifaId,
            usuarioAperturaId,
            TipoEstadia: data.TipoEstadia || 'Standard',
            Observacion: data.Observacion,
            ObservacionSecundaria: data.ObservacionSecundaria
        };
    };

    return (
        <Create resource="turnos-abrir" redirect="/turnos" transform={transform} mutationOptions={{ onSuccess: handleSuccess }}>
            <SimpleForm toolbar={<CustomToolbar />} defaultValues={prefilledData}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <ReferenceInput source="clienteId" reference="clientes" sx={{ flexGrow: 1 }}>
                                    <AutocompleteInput label='Cliente (Patente)' optionText='Patente' validate={Requerido} fullWidth />
                                </ReferenceInput>
                                <QuickCreateCliente />
                            </Box>
                            <FormDataConsumer>
                                {({ formData }) => {
                                    const clientId = formData.clienteId || (typeof formData.cliente === 'object' ? formData.cliente?.id : formData.cliente);
                                    return clientId ? <ClientExtraInfo clientId={clientId} /> : null;
                                }}
                            </FormDataConsumer>
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <ReferenceInput
                            source="habitacionId"
                            reference="habitaciones"
                            filter={filterHabitacion}
                        >
                            <AutocompleteInput label='Habitacion' optionText='Identificador' validate={Requerido} fullWidth />
                        </ReferenceInput>
                        <FormDataConsumer>
                            {({ formData }) => {
                                const habId = formData.habitacionId || (typeof formData.habitacion === 'object' ? formData.habitacion?.id : formData.habitacion);
                                return habId ? <HabitacionExtraInfo habitacionId={habId} /> : null;
                            }}
                        </FormDataConsumer>
                    </Grid>
                    <Grid item xs={12} md={12}>
                        <Box sx={{
                            p: 2,
                            borderRadius: '16px',
                            bgcolor: 'rgba(99, 102, 241, 0.05)',
                            border: '1px solid rgba(99, 102, 241, 0.1)',
                            mb: 1
                        }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#4f46e5', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Sparkles size={16} /> SELECCIONAR TIPO DE ESTANCIA
                            </Typography>
                            <RadioButtonGroupInput
                                source="TipoEstadia"
                                label={false}
                                choices={[
                                    { id: 'Standard', name: 'Turno Normal (2hs / 3hs)' },
                                    { id: 'Pernocte', name: 'Pernocte / Diario (Hasta Checkout)' },
                                ]}
                                defaultValue="Standard"
                                row
                            />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <DateTimeInput source="Ingreso" defaultValue={new Date()} readOnly fullWidth />
                    </Grid>
                    <Grid item xs={12} md={12}>
                        <TextInput source="Observacion" label="Notas de Ingreso" multiline fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                        <TextInput source="ObservacionSecundaria" label="Notas Internas" multiline fullWidth />
                    </Grid>
                </Grid>
            </SimpleForm>
        </Create>
    );
};

export default {
    list: TurnoList,
    edit: TurnoEdit,
    create: TurnoCreate
};
