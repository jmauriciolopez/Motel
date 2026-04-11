import {
    BooleanField, BooleanInput, Create, Datagrid, DateField,
    DateTimeInput, Edit, EditButton, FormDataConsumer, List, NumberField,
    NumberInput, SimpleForm, TextField, TextInput, TimeInput,
    useRecordContext, required, usePermissions, ReferenceInput, AutocompleteInput, TopToolbar, CreateButton
} from 'react-admin';
import { Divider, Typography, Box, Grid, Paper, Chip, TextField as MuiTextField, Button, Tooltip } from '@mui/material';
import CustomToolbar from '../layout/CustomToolbar';
import { useTrial } from '../helpers/useTrial';
import {
    Info as InfoIcon,
    Settings as SettingsIcon,
    AccessTime as AccessTimeIcon,
    VerifiedUser as VerifiedIcon,
    Stars as PremiumIcon
} from '@mui/icons-material';

// -- Formats & Helpers --
const formatTime = (value) => {
    if (!value) return '';
    if (value.includes('T')) return value.split('T')[1].substring(0, 5);
    if (value.includes(':')) return value.substring(0, 5);
    return value;
};

const parseTime = (value) => {
    if (!value) return null;
    const time = value.split(':').slice(0, 2).join(':');
    return `1970-01-01T${time}:00.000Z`;
};

// HoraCierreCaja se guarda como "HH:mm" puro — no necesita conversión ISO
const formatHora = (value) => {
    if (!value) return '';
    if (value.includes('T')) return value.split('T')[1].substring(0, 5);
    if (value.includes(':')) return value.substring(0, 5);
    return value;
};
const parseHora = (value) => value || null;

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
            return new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

    return (
        <List actions={<MotelListActions />} sx={{ '& .RaList-main': { marginTop: 2 } }}>
            <Datagrid rowClick="edit" sx={{
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
