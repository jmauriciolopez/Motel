import React from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, NumberInput, AutocompleteInput, SimpleForm, TextInput, ReferenceInput, Create, DateField,
    useRecordContext, required, DateTimeInput, BooleanInput, BooleanField, useRefresh, useRedirect, useNotify, FunctionField,
    TopToolbar, CreateButton, usePermissions
} from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Grid, Box, Typography, Paper, InputAdornment, Chip } from '@mui/material';
import {
    Engineering as MaintenanceIcon,
    Build as BuildIcon,
    ReportProblem as IssueIcon,
    MeetingRoom as RoomIcon,
    Person as PersonIcon,
    CheckCircle as CheckIcon,
    Pending as PendingIcon
} from '@mui/icons-material';
import CustomToolbar from '../layout/CustomToolbar';

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

const MantenimientoStatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    const isFinalizado = record.Finalizado;

    return (
        <Paper elevation={0} sx={{
            p: 3,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: isFinalizado
                ? 'linear-gradient(45deg, #2e7d32 30%, #4caf50 90%)'
                : 'linear-gradient(45deg, #ed6c02 30%, #ff9800 90%)',
            color: 'white',
            borderRadius: '16px'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <MaintenanceIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 'bold', opacity: 0.9 }}>
                        Estado de Mantenimiento
                    </Typography>
                    <Typography variant="h5" fontWeight="900">
                        Habitación {record.habitacion?.Identificador || '---'}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>Estado Actual</Typography>
                <Chip
                    label={isFinalizado ? "FINALIZADO" : "EN PROCESO"}
                    size="small"
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.2)',
                        color: 'white',
                        fontWeight: 'bold',
                        px: 1
                    }}
                />
            </Box>
        </Paper>
    );
};

const MantenimientoListActions = () => {
    const { permissions } = usePermissions();
    const canCreate = permissions === 'Recepcionista' || permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {canCreate && <CreateButton />}
        </TopToolbar>
    );
};

const MantenimientoList = () => {
    const { currentMotelId: motelId } = useMotel();
    const filter = motelId ? { motelId: motelId } : {};

    return (
        <Box sx={{ mt: 2 }}>
            <List
                actions={<MantenimientoListActions />}
                filter={filter}
                sort={{ field: 'Cuando', order: 'DESC' }}
            >
                <Datagrid rowClick="edit" sx={{
                    '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' },
                    borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden'
                }}>
                    <DateField
                        source="Cuando"
                        label="Fecha/Hora"
                        showTime
                        options={{ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }}
                    />
                    <TextField label="Habitación" source="habitacion.Identificador" sx={{ fontWeight: 600, color: 'primary.main' }} />
                    <TextField label="Proveedor" source="proveedor.Nombre" />
                    <FunctionField
                        label="Estado"
                        render={record => (
                            <Chip
                                icon={record.Finalizado ? <CheckIcon style={{ color: 'green' }} /> : <PendingIcon style={{ color: 'orange' }} />}
                                label={record.Finalizado ? "Listo" : "Pendiente"}
                                variant="outlined"
                                size="small"
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                    />
                    <TextField label="Personal" source="usuario.Username" />
                    <TextField source="Observacion" label="Resumen" />
                    <EditButton />
                </Datagrid>
            </List>
        </Box>
    );
};

export const MantenimientoEdit = () => {
    const refresh = useRefresh();
    const redirect = useRedirect();
    const notify = useNotify();

    const onSuccess = () => {
        refresh();
        notify('Mantenimiento actualizado exitosamente', { type: 'success' });
        redirect('list', 'mantenimientos');
    };

    return (
        <Edit mutationMode="pessimistic" mutationOptions={{ onSuccess }}>
            <SimpleForm toolbar={<CustomToolbar backTo="/mantenimientos" />}>
                <MantenimientoStatusBanner />
                <SectionHeader icon={BuildIcon} title="Detalles del Servicio" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <DateTimeInput source="Cuando" label="Fecha y Hora de Reporte" fullWidth validate={Requerido} />
                            <Box sx={{ mt: 2 }}>
                                <ReferenceInput source="habitacionId" reference="habitaciones">
                                    <AutocompleteInput
                                        label='Habitación'
                                        optionText='Identificador'
                                        validate={Requerido}
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><RoomIcon color="action" /></InputAdornment>
                                        }}
                                    />
                                </ReferenceInput>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <BooleanInput source="Finalizado" label="Mantenimiento Finalizado" sx={{ '& .MuiFormControlLabel-label': { fontWeight: 700 } }} />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <ReferenceInput source="proveedorId" reference="proveedores">
                                <AutocompleteInput
                                    label='Proveedor Responsable'
                                    optionText='Nombre'
                                    validate={Requerido}
                                    fullWidth
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </ReferenceInput>
                            <Box sx={{ mt: 2 }}>
                                <TextInput
                                    source="Observacion"
                                    label="Observaciones Técnicas"
                                    fullWidth
                                    multiline
                                    rows={8}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><IssueIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Edit>
    );
};

const MantenimientoCreate = () => {
    const { currentMotelId: motelId } = useMotel();
    const refresh = useRefresh();
    const redirect = useRedirect();
    const notify = useNotify();

    const onSuccess = () => {
        refresh();
        notify('Registro de mantenimiento creado', { type: 'success' });
        redirect('list', 'mantenimientos');
    };

    return (
        <Create redirect="list" mutationOptions={{ onSuccess }} sx={{ mt: 2 }}>
            <SimpleForm
                toolbar={<CustomToolbar backTo="/mantenimientos" />}
                defaultValues={{
                    Cuando: new Date(),
                    Finalizado: false
                }}
            >
                <SectionHeader icon={MaintenanceIcon} title="Nuevo Registro de Mantenimiento" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <DateTimeInput source="Cuando" label="Fecha y Hora inicial" validate={required()} fullWidth />
                            <Box sx={{ mt: 2 }}>
                                <ReferenceInput
                                    source="habitacionId"
                                    reference="habitaciones"
                                    filter={motelId ? { motelId: motelId } : {}}
                                >
                                    <AutocompleteInput
                                        label='Habitación'
                                        optionText='Identificador'
                                        validate={required()}
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><RoomIcon color="action" /></InputAdornment>
                                        }}
                                    />
                                </ReferenceInput>
                            </Box>
                            <Box sx={{ mt: 2 }}>
                                <BooleanInput source="Finalizado" label="Marcar como Finalizado" />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <ReferenceInput source="proveedorId" reference="proveedores">
                                <AutocompleteInput
                                    label='Proveedor'
                                    optionText='Nombre'
                                    validate={required()}
                                    fullWidth
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><PersonIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </ReferenceInput>
                            <Box sx={{ mt: 2 }}>
                                <TextInput
                                    source="Observacion"
                                    label="Detalle del Problema / Trabajo"
                                    fullWidth
                                    multiline
                                    rows={8}
                                    validate={required()}
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><IssueIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Create>
    );
};

const resourceMantenimiento = {
    list: MantenimientoList,
    edit: MantenimientoEdit,
    create: MantenimientoCreate,
    icon: MaintenanceIcon,
};

export default resourceMantenimiento;
