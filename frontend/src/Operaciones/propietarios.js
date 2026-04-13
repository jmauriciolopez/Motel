import React, { useState } from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, SimpleForm, TextInput, Create, DateField,
    required, EmailField, FunctionField, useRecordContext, TopToolbar, CreateButton, usePermissions,
    useNotify, useRedirect, useDataProvider,
} from 'react-admin';
import { Grid, Box, Typography, Paper, InputAdornment, Chip, Button, CircularProgress, Tooltip } from '@mui/material';
import {
    Person as PersonIcon,
    Email as EmailIcon,
    Phone as PhoneIcon,
    Badge as BadgeIcon,
    LocationCity as CityIcon,
    Payment as PaymentIcon,
    CheckCircle as CheckIcon,
    AssignmentInd as PropietarioIcon,
    RestartAlt as ResetIcon,
} from '@mui/icons-material';
import CustomToolbar from '../layout/CustomToolbar';
import { http } from '../shared/api/HttpClient';
import { useMotel } from '../context/MotelContext';

const Requerido = [required()];

// -- Helper Components --
const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
        <Icon color="primary" sx={{ fontSize: 20 }} />
        <Typography variant="subtitle1" fontWeight="700" color="primary">
            {title.toUpperCase()}
        </Typography>
    </Box>
);

const PropietarioBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    return (
        <Paper elevation={0} sx={{
            p: 3,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            background: 'linear-gradient(45deg, #1a237e 30%, #534bae 90%)',
            color: 'white',
            borderRadius: '16px'
        }}>
            <PropietarioIcon sx={{ fontSize: 48, opacity: 0.8 }} />
            <Box>
                <Typography variant="overline" sx={{ fontWeight: 'bold', opacity: 0.8 }}>
                    Perfil del Propietario
                </Typography>
                <Typography variant="h4" fontWeight="900">
                    {record.Nombre}
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                    <Chip size="small" label={record.Activo ? "CUENTA ACTIVA" : "CUENTA INACTIVA"}
                        sx={{ bgcolor: record.Activo ? 'success.main' : 'error.main', color: 'white', fontWeight: 'bold' }} />
                    <Typography variant="body2" sx={{ opacity: 0.9, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CityIcon sx={{ fontSize: 16 }} /> {record.Ciudad || 'Sin ciudad'}
                    </Typography>
                </Box>
            </Box>
        </Paper>
    );
};

const ResetOnboardingButton = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const dataProvider = useDataProvider();
    const { setAvailableMoteles, setCurrentMotelId } = useMotel();
    const [loading, setLoading] = useState(false);

    if (!record) return null;

    const handleReset = async (e) => {
        e.stopPropagation();
        if (!window.confirm(`¿Resetear el onboarding de "${record.Nombre}"? Se eliminarán todos los datos del motel.`)) return;

        setLoading(true);
        try {
            const { data: moteles } = await dataProvider.getList('moteles', {
                filter: { propietarioId: record.id },
                pagination: { page: 1, perPage: 50 },
                sort: { field: 'id', order: 'ASC' },
            }).catch(() => ({ data: [] }));

            for (const motel of moteles) {
                const motelId = motel.id;

                const [
                    { data: habitaciones },
                    { data: tarifas },
                    { data: depositos },
                    { data: productos },
                    { data: rubros },
                ] = await Promise.all([
                    dataProvider.getList('habitaciones', { filter: { motelId }, pagination: { page: 1, perPage: 200 }, sort: { field: 'id', order: 'ASC' } }).catch(() => ({ data: [] })),
                    dataProvider.getList('tarifas', { filter: { motelId }, pagination: { page: 1, perPage: 50 }, sort: { field: 'id', order: 'ASC' } }).catch(() => ({ data: [] })),
                    dataProvider.getList('depositos', { filter: { motelId }, pagination: { page: 1, perPage: 20 }, sort: { field: 'id', order: 'ASC' } }).catch(() => ({ data: [] })),
                    dataProvider.getList('productos', { filter: { motelId }, pagination: { page: 1, perPage: 500 }, sort: { field: 'id', order: 'ASC' } }).catch(() => ({ data: [] })),
                    dataProvider.getList('rubros', { filter: { motelId }, pagination: { page: 1, perPage: 100 }, sort: { field: 'id', order: 'ASC' } }).catch(() => ({ data: [] })),
                ]);

                await Promise.all([
                    ...habitaciones.map(h => dataProvider.delete('habitaciones', { id: h.id }).catch(() => {})),
                    ...tarifas.map(t => dataProvider.delete('tarifas', { id: t.id }).catch(() => {})),
                    ...depositos.map(d => dataProvider.delete('depositos', { id: d.id }).catch(() => {})),
                    ...productos.map(p => dataProvider.delete('productos', { id: p.id }).catch(() => {})),
                    ...rubros.map(r => dataProvider.delete('rubros', { id: r.id }).catch(() => {})),
                ]);

                // Desvincular usuarios del motel
                const motelUsers = await http.get(`/usuarios/por-motel`, { params: { motelId } }).catch(() => []);
                for (const u of (motelUsers || [])) {
                    await http.patch(`/usuarios/${u.id}/desvincular-moteles`, {}).catch(() => {});
                }

                // Resetear OnboardingCompleto del motel
                await http.patch(`/moteles/${motelId}`, { OnboardingCompleto: false }).catch(() => {});

                await dataProvider.delete('moteles', { id: motelId }).catch(() => {});
            }

            await dataProvider.delete('propietarios', { id: record.id }).catch(() => {});

            // Refrescar lista de moteles en contexto
            const mJson = await http.get('/moteles', { params: { _limit: 100 } }).catch(() => null);
            const motelesActualizados = (mJson?.data || []).map(m => ({
                id: m.id,
                Nombre: m.Nombre,
                OnboardingCompleto: m.OnboardingCompleto,
            }));

            sessionStorage.setItem('moteles', JSON.stringify(motelesActualizados));
            setAvailableMoteles(motelesActualizados);
            if (motelesActualizados.length > 0) {
                setCurrentMotelId(motelesActualizados[0].id);
                sessionStorage.setItem('motelId', motelesActualizados[0].id);
            } else {
                setCurrentMotelId(null);
                sessionStorage.removeItem('motelId');
            }

            notify('Onboarding reseteado correctamente', { type: 'success' });
        } catch (err) {
            notify('Error en reset: ' + err.message, { type: 'warning' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Tooltip title="Resetear Onboarding">
            <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={loading ? <CircularProgress size={14} color="inherit" /> : <ResetIcon />}
                disabled={loading}
                onClick={handleReset}
                sx={{ minWidth: 0, fontSize: '0.75rem' }}
            >
                Reset
            </Button>
        </Tooltip>
    );
};

const PropietarioListActions = () => {
    const { permissions } = usePermissions();
    const canCreate = permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {canCreate && <CreateButton />}
        </TopToolbar>
    );
};

const PropietarioList = () => (
    <Box sx={{ mt: 2 }}>
        <List
            actions={<PropietarioListActions />}
            sort={{ field: 'Nombre', order: 'ASC' }}
            filters={[<TextInput key="q" label="Buscar" source="q" alwaysOn />]}
        >
            <Datagrid bulkActionButtons={false} rowClick="edit" sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' },
                borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden'
            }}>
                <TextField source="Nombre" sx={{ fontWeight: 600, color: 'primary.main' }} />
                <EmailField source="Email" />
                <TextField source="Telefono" label="Teléfono" />
                <TextField source="Cuit" label="CUIT" />
                <TextField source="Ciudad" />
                <TextField source="FormaPago" label="Forma de Pago" />
                <FunctionField
                    label="Estado"
                    render={record => (
                        <Chip
                            label={record.Activo ? "Activo" : "Inactivo"}
                            color={record.Activo ? "success" : "default"}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600 }}
                        />
                    )}
                />
                <EditButton />
                <ResetOnboardingButton />
            </Datagrid>
        </List>
    </Box>
);

export const PropietarioEdit = () => {
    const { permissions } = usePermissions();
    const canEdit = permissions === 'Administrador' || permissions === 'SuperAdmin';
    const notify = useNotify();

    return (
        <Edit
            mutationMode="pessimistic"
            mutationOptions={{
                onError: (error) => {
                    notify(friendlyCreateError(error), { type: 'error' });
                },
            }}
        >
            <SimpleForm toolbar={<CustomToolbar backTo="/propietarios" />}>
                <PropietarioBanner />
                <SectionHeader icon={BadgeIcon} title="Información Personal y Fiscal" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Nombre" label="Nombre Completo o Razón Social" fullWidth validate={Requerido}
                                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment> }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <TextInput source="Cuit" label="CUIT / CUIL" fullWidth
                                    InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon color="action" /></InputAdornment> }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Email" label="Correo Electrónico" fullWidth validate={Requerido}
                                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment> }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <TextInput source="Telefono" label="WhatsApp / Teléfono" fullWidth
                                    InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment> }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>

                <SectionHeader icon={CityIcon} title="Ubicación y Pagos" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Ciudad" label="Ciudad" fullWidth
                                InputProps={{ startAdornment: <InputAdornment position="start"><CityIcon color="action" /></InputAdornment> }}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextInput source="FormaPago" label="Forma de Pago del Servicio" fullWidth
                                InputProps={{ startAdornment: <InputAdornment position="start"><PaymentIcon color="action" /></InputAdornment> }}
                            />
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Edit>
    );
};

const friendlyCreateError = (error) => {
    const msg = error?.message || error?.body?.error?.message || '';
    const details = error?.body?.error?.details?.errors || [];
    if (msg.toLowerCase().includes('unique') || details.some(e => e.message?.toLowerCase().includes('unique'))) {
        const field = details[0]?.path?.[0];
        if (field === 'Email' || field === 'email') return 'Ya existe un propietario con ese email';
        if (field === 'CUIT' || field === 'cuit') return 'Ya existe un propietario con ese CUIT';
        if (field === 'Nombre' || field === 'nombre') return 'Ya existe un propietario con ese nombre';
        return 'Ya existe un propietario con esos datos (campo duplicado)';
    }
    return msg || 'Error al guardar el propietario';
};

export const PropietarioCreate = () => {
    const notify = useNotify();
    const redirect = useRedirect();

    return (
        <Create
            redirect="list"
            sx={{ mt: 2 }}
            mutationOptions={{
                onError: (error) => {
                    notify(friendlyCreateError(error), { type: 'error' });
                },
            }}
        >
            <SimpleForm toolbar={<CustomToolbar backTo="/propietarios" />}>
                <SectionHeader icon={PropietarioIcon} title="Nuevo Registro de Propietario" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Nombre" label="Nombre Completo / Razón Social" fullWidth validate={Requerido}
                                InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment> }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <TextInput source="Cuit" label="CUIT / CUIL" fullWidth
                                    InputProps={{ startAdornment: <InputAdornment position="start"><BadgeIcon color="action" /></InputAdornment> }}
                                />
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <TextInput source="Ciudad" label="Ciudad" fullWidth
                                    InputProps={{ startAdornment: <InputAdornment position="start"><CityIcon color="action" /></InputAdornment> }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Email" label="Correo Electrónico" fullWidth validate={Requerido}
                                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon color="action" /></InputAdornment> }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <TextInput source="Telefono" label="WhatsApp / Teléfono" fullWidth
                                    InputProps={{ startAdornment: <InputAdornment position="start"><PhoneIcon color="action" /></InputAdornment> }}
                                />
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <TextInput source="FormaPago" label="Forma de Pago preferida" fullWidth
                                    InputProps={{ startAdornment: <InputAdornment position="start"><PaymentIcon color="action" /></InputAdornment> }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Create>
    );
};

const resourcePropietario = {
    list: PropietarioList,
    edit: PropietarioEdit,
    create: PropietarioCreate,
    icon: PropietarioIcon,
};

export default resourcePropietario;
