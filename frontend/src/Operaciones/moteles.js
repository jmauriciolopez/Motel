import {
    BooleanField, BooleanInput, Create, Datagrid, DateField,
    DateTimeInput, Edit, EditButton, FormDataConsumer, List, NumberField,
    NumberInput, SimpleForm, TextField, TextInput, TimeInput,
    useRecordContext, required, usePermissions, ReferenceInput, AutocompleteInput, TopToolbar, CreateButton,
    useInput
} from 'react-admin';
import { Divider, Typography, Box, Grid, Paper, Chip, TextField as MuiTextField, Button, Tooltip, FormGroup, FormControlLabel, Checkbox, FormLabel } from '@mui/material';
import CustomToolbar from '../layout/CustomToolbar';
import { useTrial } from '../helpers/useTrial';
import { useDeletedRowSx } from '../helpers/deletedRowSx';
import {
    Info as InfoIcon,
    Settings as SettingsIcon,
    AccessTime as AccessTimeIcon,
    VerifiedUser as VerifiedIcon,
    Stars as PremiumIcon,
    CalendarMonth as CalendarIcon,
} from '@mui/icons-material';

// -- Formats & Helpers --

/**
 * Offset en minutos del timezone local (positivo = detrás de UTC, ej. UTC-3 → 180).
 * Se calcula una vez al cargar.
 */
const TZ_OFFSET_MIN = new Date().getTimezoneOffset(); // ej: 180 para UTC-3

/**
 * Convierte un valor DateTime ISO UTC del servidor a "HH:mm" para el TimeInput.
 * Compensa el offset local para que "1970-01-01T11:00:00.000Z" muestre "11:00"
 * en lugar de "08:00" en UTC-3.
 */
const formatTime = (value) => {
    if (!value) return '';
    // Ya es "HH:mm" puro
    if (!value.includes('T') && value.includes(':')) return value.substring(0, 5);
    // Es ISO: construir Date y extraer la hora UTC manualmente (sin conversión local)
    const iso = value.endsWith('Z') ? value : value + 'Z';
    const d = new Date(iso);
    // getUTC* da la hora real almacenada, sin offset local
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
};

/**
 * Convierte "HH:mm" (valor del TimeInput) a ISO UTC.
 * El TimeInput puede devolver "HH:mm" o "YYYY-MM-DDTHH:mm" (local sin Z).
 * En ambos casos tomamos la hora tal como fue ingresada y la tratamos como UTC.
 */
const parseTime = (value) => {
    if (!value) return null;
    let hh, mm;
    if (value.includes('T')) {
        // React-admin TimeInput devuelve ISO local "1970-01-01T11:00" — tomar solo la hora
        const timePart = value.split('T')[1].substring(0, 5);
        [hh, mm] = timePart.split(':');
    } else {
        [hh, mm] = value.split(':');
    }
    return `1970-01-01T${(hh || '00').padStart(2, '0')}:${(mm || '00').padStart(2, '0')}:00.000Z`;
};

// HoraCierreCaja se guarda como "HH:mm" puro — no necesita conversión ISO
const formatHora = (value) => {
    if (!value) return '';
    if (value.includes('T')) return value.split('T')[1].substring(0, 5);
    if (value.includes(':')) return value.substring(0, 5);
    return value;
};
const parseHora = (value) => value || null;

// Días de la semana: índice 0=domingo, pero mostramos Lun–Dom como convención visual
const DIAS_SEMANA = [
    { value: 1, labelEs: 'Lun', labelPt: 'Seg' },
    { value: 2, labelEs: 'Mar', labelPt: 'Ter' },
    { value: 3, labelEs: 'Mié', labelPt: 'Qua' },
    { value: 4, labelEs: 'Jue', labelPt: 'Qui' },
    { value: 5, labelEs: 'Vie', labelPt: 'Sex' },
    { value: 6, labelEs: 'Sáb', labelPt: 'Sáb' },
    { value: 0, labelEs: 'Dom', labelPt: 'Dom' },
];

/**
 * Input personalizado para DiasEspeciales.
 * El campo se almacena en el form como array JSON de enteros (0–6).
 * Se renderiza como 7 checkboxes Lun–Dom.
 */
const DiasEspecialesInput = ({ locale = 'es' }) => {
    const { field } = useInput({ source: 'DiasEspeciales' });

    // Normalizar: puede llegar como string JSON o como array
    const rawValue = field.value;
    const selected = Array.isArray(rawValue)
        ? rawValue.map(Number)
        : (typeof rawValue === 'string' && rawValue.startsWith('['))
            ? JSON.parse(rawValue)
            : [];

    const toggle = (dayValue) => {
        const current = selected.includes(dayValue)
            ? selected.filter((d) => d !== dayValue)
            : [...selected, dayValue];
        field.onChange(current);
    };

    return (
        <Box sx={{ mt: 1 }}>
            <FormLabel component="legend" sx={{ fontSize: '0.75rem', mb: 0.5, color: 'text.secondary' }}>
                {locale === 'pt' ? 'Dias especiais' : 'Días especiales'}
            </FormLabel>
            <FormGroup row>
                {DIAS_SEMANA.map((dia) => (
                    <FormControlLabel
                        key={dia.value}
                        control={
                            <Checkbox
                                size="small"
                                checked={selected.includes(dia.value)}
                                onChange={() => toggle(dia.value)}
                            />
                        }
                        label={
                            <Typography variant="caption">
                                {locale === 'pt' ? dia.labelPt : dia.labelEs}
                            </Typography>
                        }
                        sx={{ mr: 0.5 }}
                    />
                ))}
            </FormGroup>
        </Box>
    );
};

const StatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    const isExpired = record.propietario?.FechaVencimientoPrueba && new Date(record.propietario.FechaVencimientoPrueba) < new Date();
    const isPaid = record.propietario?.PagoActivo;

    return (
        <Paper elevation={0} sx={{
            p: 2, mb: 3, borderRadius: 2, backgroundColor: 'action.hover',
            borderLeft: '6px solid',
            borderColor: isPaid ? 'success.main' : (isExpired ? 'error.main' : 'warning.main')
        }}>
            <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={4}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PremiumIcon color={isPaid ? "success" : "action"} />
                        <Typography variant="h6" fontWeight="700">Estado de Suscripción</Typography>
                    </Box>
                </Grid>
                <Grid item xs={12} md={8} sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip
                        label={isPaid ? "CUENTA PRO" : "TRIAL"}
                        color={isPaid ? "success" : "warning"}
                        variant="filled"
                        sx={{ fontWeight: 'bold' }}
                    />
                    {record.propietario?.FechaVencimientoPrueba && (
                        <Chip
                            icon={<AccessTimeIcon />}
                            label={`Expira: ${new Date(record.propietario.FechaVencimientoPrueba).toLocaleDateString()}`}
                            color={isExpired ? "error" : "default"}
                            variant="outlined"
                        />
                    )}
                    {record.OnboardingCompleto && (
                        <Chip
                            icon={<VerifiedIcon />}
                            label="Configurado"
                            color="info"
                            variant="outlined"
                        />
                    )}
                </Grid>
            </Grid>
        </Paper>
    );
};

const PropietarioReadOnly = () => {
    const record = useRecordContext();
    const nombre = record?.propietario?.Nombre || '—';
    return (
        <MuiTextField
            label="Propietario / Dueño"
            value={nombre}
            disabled
            fullWidth
            variant="filled"
            size="small"
        />
    );
};

const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
        <Icon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight="700" color="primary">
            {title.toUpperCase()}
        </Typography>
    </Box>
);

const HorariosField = ({ label }) => {
    const record = useRecordContext();
    if (!record || record.HorarioUnico) return null;

    const displayTime = (time) => {
        if (!time) return '-';
        if (time.includes('T')) {
            return formatTime(time);
        }
        return time.substring(0, 5);
    };

    return (
        <span>{`${displayTime(record.InicioDia)} / ${displayTime(record.InicioNoche)}`}</span>
    );
};

const DuracionesField = ({ label }) => {
    const record = useRecordContext();
    if (!record) return null;
    if (record.HorarioUnico) return <span>{record.DuracionDiaria} hs</span>;
    return (
        <span>{`${record.DuracionDiaria} / ${record.DuracionNocturna} hs`}</span>
    );
};

const MotelListActions = () => {
    const { permissions } = usePermissions();
    const { isTrial } = useTrial();
    const isAdmin = permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {isAdmin && !isTrial && <CreateButton />}
            {isAdmin && isTrial && (
                <Tooltip title="Disponible en plan Pro — en modo trial solo podés tener un motel">
                    <span>
                        <Button variant="outlined" disabled size="small" sx={{ textTransform: 'none' }}>
                            Nuevo Motel (solo Pro)
                        </Button>
                    </span>
                </Tooltip>
            )}
        </TopToolbar>
    );
};

export const MotelList = () => {
    const { permissions } = usePermissions();
    const isSuperAdmin = permissions === 'SuperAdmin' || permissions === 'SuperUser';
    const deletedRowSx = useDeletedRowSx();

    return (
        <List actions={<MotelListActions />} sx={{ '& .RaList-main': { marginTop: 2 } }}>
            <Datagrid
                rowClick="edit"
                rowSx={deletedRowSx}
                sx={{
                    '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
                }}>
                <TextField source="Nombre" sx={{ fontWeight: 600, color: 'primary.main' }} />
                <TextField label="Propietario" source="propietario.Nombre" />
                <TextField source="Direccion" />
                <TextField source="Telefono" />
                <BooleanField source="HorarioUnico" label="Único" />
                <HorariosField label="Horas (D/N)" />
                <DuracionesField label="Durac. (D/N)" />
                <DateField source="CheckOutDia" showTime showDate={false} options={{ hour: '2-digit', minute: '2-digit' }} label="CheckOut" />
                <NumberField source="Tolerancia" label="Tole." />
                <NumberField source="MaxHrAdicional" label="Hrs Ext." />
                <NumberField source="DescuentoEfectivo" label="Desc. Efec. (%)" />
                <TextField source="HoraCierreCaja" label="Cierre Caja" />
                {isSuperAdmin && <BooleanField source="OnboardingCompleto" label="Onboarding" />}
                {isSuperAdmin && <BooleanField source="propietario.PagoActivo" label="Pagado" />}
                <DateField source="propietario.FechaVencimientoPrueba" label="Trial Exp." options={{ day: '2-digit', month: '2-digit', hour12: true, hour: '2-digit', minute: '2-digit' }} />
                <EditButton />
            </Datagrid>
        </List>
    );
};

export const MotelCreate = () => (
    <Create redirect="list">
        <SimpleForm toolbar={<CustomToolbar backTo="/moteles" />}>
            <SectionHeader icon={InfoIcon} title="Información General" />
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}><TextInput source="Nombre" validate={required()} fullWidth /></Grid>
                <Grid item xs={12} md={6}>
                    <ReferenceInput source="propietarioId" reference="propietarios">
                        <AutocompleteInput label="Propietario / Dueño" optionText="Nombre" fullWidth filterToQuery={searchText => ({ Nombre: searchText })} />
                    </ReferenceInput>
                </Grid>
                <Grid item xs={12} md={6}><TextInput source="Direccion" fullWidth /></Grid>
                <Grid item xs={12} md={6}><TextInput source="Telefono" fullWidth /></Grid>
                <Grid item xs={12} md={6}><BooleanInput source="HorarioUnico" label="Usar Horario Único de Turnos" /></Grid>
            </Grid>

            <SectionHeader icon={SettingsIcon} title="Configuración de Turnos" />
            <FormDataConsumer>
                {({ formData, ...rest }) => (
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={3}>
                            <TimeInput source="InicioDia" label="Inicio Horario Día" disabled={formData.HorarioUnico} format={formatTime} parse={parseTime} fullWidth {...rest} />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <TimeInput source="InicioNoche" label="Inicio Horario Noche" disabled={formData.HorarioUnico} format={formatTime} parse={parseTime} fullWidth {...rest} />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <NumberInput source="DuracionDiaria" label={formData.HorarioUnico ? "Horas por Turno" : "H. Turno Día"} fullWidth {...rest} />
                        </Grid>
                        <Grid item xs={12} md={3}>
                            <NumberInput source="DuracionNocturna" label="H. Turno Noche" disabled={formData.HorarioUnico} fullWidth {...rest} />
                        </Grid>
                    </Grid>
                )}
            </FormDataConsumer>

            <SectionHeader icon={AccessTimeIcon} title="Políticas de Tiempo y Cierre" />
            <Grid container spacing={2}>
                <Grid item xs={12} md={3}><TimeInput source="CheckOutDia" label="Hora CheckOut Día" format={formatTime} parse={parseTime} fullWidth /></Grid>
                <Grid item xs={12} md={3}><NumberInput source="Tolerancia" label="Minutos Tolerancia" fullWidth /></Grid>
                <Grid item xs={12} md={3}><NumberInput source="MaxHrAdicional" label="Máx. Horas Extras" fullWidth /></Grid>
                <Grid item xs={12} md={3}>
                    <TimeInput source="HoraCierreCaja" label="Hora Cierre Contable" format={formatHora} parse={parseHora} fullWidth />
                </Grid>
                <Grid item xs={12} md={3}>
                    <BooleanInput source="AplicaCorteCheckout" label="Aplicar corte automático de checkout" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <NumberInput source="DescuentoEfectivo" label="Descuento efectivo (%)" min={0} max={100} step={0.5} fullWidth helperText="0 = Sin descuento" />
                </Grid>
            </Grid>

            <SectionHeader icon={CalendarIcon} title="Días Especiales" />
            <Box sx={{ mb: 1 }}>
                <Typography variant="caption" color="text.secondary">
                    Los días seleccionados tendrán la duración del turno extendida según las horas indicadas.
                </Typography>
            </Box>
            <Grid container spacing={2} alignItems="flex-start">
                <Grid item xs={12} md={6}>
                    <DiasEspecialesInput />
                </Grid>
                <Grid item xs={12} md={3}>
                    <NumberInput source="HorasExtraEspeciales" label="Horas extra" min={0} fullWidth helperText="Horas adicionales en días seleccionados" />
                </Grid>
                <Grid item xs={12} md={3}>
                    <BooleanInput source="CobroAlInicio" label="Permitir cobro al abrir turno" />
                </Grid>
            </Grid>
        </SimpleForm>
    </Create>
);

export const MotelEdit = () => {
    const { permissions } = usePermissions();
    const isSuperAdmin = permissions === 'SuperAdmin' || permissions === 'SuperUser';

    return (
        <Edit mutationMode="pessimistic">
            <SimpleForm toolbar={<CustomToolbar backTo="/moteles" />}>
                <StatusBanner />

                <SectionHeader icon={InfoIcon} title="Información General" />
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}><TextInput source="Nombre" validate={required()} fullWidth /></Grid>
                    <Grid item xs={12} md={6}>
                        <PropietarioReadOnly />
                    </Grid>
                    <Grid item xs={12} md={6}><TextInput source="Direccion" fullWidth /></Grid>
                    <Grid item xs={12} md={6}><TextInput source="Telefono" fullWidth /></Grid>
                    <Grid item xs={12} md={6}><BooleanInput source="HorarioUnico" label="Usar Horario Único" /></Grid>
                </Grid>

                <SectionHeader icon={SettingsIcon} title="Configuración Operativa" />
                <FormDataConsumer>
                    {({ formData, ...rest }) => (
                        <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                                <TimeInput source="InicioDia" disabled={formData.HorarioUnico} format={formatTime} parse={parseTime} fullWidth {...rest} />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <TimeInput source="InicioNoche" disabled={formData.HorarioUnico} format={formatTime} parse={parseTime} fullWidth {...rest} />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <NumberInput source="DuracionDiaria" label={formData.HorarioUnico ? "Horas por Turno" : "H. Turno Día"} fullWidth {...rest} />
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <NumberInput source="DuracionNocturna" label="H. Turno Noche" disabled={formData.HorarioUnico} fullWidth {...rest} />
                            </Grid>
                        </Grid>
                    )}
                </FormDataConsumer>

                <SectionHeader icon={AccessTimeIcon} title="Tiempos y Cierres" />
                <Grid container spacing={2}>
                    <Grid item xs={6} md={3}><TimeInput source="CheckOutDia" format={formatTime} parse={parseTime} fullWidth /></Grid>
                    <Grid item xs={6} md={3}><NumberInput source="Tolerancia" fullWidth /></Grid>
                    <Grid item xs={6} md={3}><NumberInput source="MaxHrAdicional" fullWidth /></Grid>
                    <Grid item xs={6} md={3}>
                        <TimeInput source="HoraCierreCaja" label="Hora Cierre Contable" format={formatHora} parse={parseHora} fullWidth />
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <BooleanInput source="AplicaCorteCheckout" label="Aplicar corte automático de checkout" />
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <NumberInput source="DescuentoEfectivo" label="Descuento efectivo (%)" min={0} max={100} step={0.5} fullWidth helperText="0 = Sin descuento" />
                    </Grid>
                </Grid>

                <SectionHeader icon={CalendarIcon} title="Días Especiales" />
                <Box sx={{ mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        Días con duración de turno extendida. No aplica a Pernocte.
                    </Typography>
                </Box>
                <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} md={6}>
                        <DiasEspecialesInput />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <NumberInput source="HorasExtraEspeciales" label="Horas extra" min={0} fullWidth helperText="Horas adicionales en días seleccionados" />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <BooleanInput source="CobroAlInicio" label="Permitir cobro al abrir turno" />
                    </Grid>
                </Grid>

                {isSuperAdmin && (
                    <>
                        <Divider sx={{ my: 4 }} />
                        <Typography variant="overline" color="text.secondary">Administración de Plataforma</Typography>
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={12} md={4}><BooleanInput source="OnboardingCompleto" fullWidth /></Grid>
                            <Grid item xs={12} md={4}><BooleanInput source="propietario.PagoActivo" fullWidth /></Grid>
                            <Grid item xs={12} md={4}><DateTimeInput source="propietario.FechaVencimientoPrueba" fullWidth /></Grid>
                        </Grid>
                    </>
                )}
            </SimpleForm>
        </Edit>
    );
};

const moteles = {
    list: MotelList,
    edit: MotelEdit,
    create: MotelCreate,
};

export default moteles;
