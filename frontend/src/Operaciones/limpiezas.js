import React from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, AutocompleteInput, SimpleForm, TextInput, ReferenceInput, Create, useRecordContext, DateField,
    DateTimeInput, required, useDataProvider, useNotify, FunctionField,
    TopToolbar, CreateButton, usePermissions
} from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Grid, Box, Typography, Paper, InputAdornment } from '@mui/material';
import {
    CleaningServices as CleaningIcon,
    History as HistoryIcon,
    Comment as CommentIcon,
    MeetingRoom as RoomIcon,
    Person as PersonIcon
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

const LimpiezaStatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    return (
        <Paper elevation={0} sx={{
            p: 3,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(45deg, #4caf50 30%, #81c784 90%)',
            color: 'white',
            borderRadius: '16px'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CleaningIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 'bold', opacity: 0.9 }}>
                        Registro de Limpieza
                    </Typography>
                    <Typography variant="h5" fontWeight="900">
                        Habitación {record.habitacion?.Identificador || '---'}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>Realizada el</Typography>
                <Typography variant="h6" fontWeight="700">
                    {new Date(record.Cuando).toLocaleString()}
                </Typography>
            </Box>
        </Paper>
    );
};

const Filtros = [
    <TextInput label="Buscar Observación" source="q" alwaysOn />,
];

const LimpiezaListActions = () => {
    const { permissions } = usePermissions();
    const canCreate = permissions === 'Recepcionista' || permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {canCreate && <CreateButton />}
        </TopToolbar>
    );
};

const LimpiezaList = () => {
    const { currentMotelId: motelId } = useMotel();
    const filter = motelId ? { motelId: motelId } : {};

    return (
        <Box sx={{ mt: 2 }}>
            <List
                actions={<LimpiezaListActions />}
                filters={Filtros}
                sort={{ field: 'Cuando', order: 'DESC' }}
                filter={filter}
            >
                <Datagrid rowClick="edit" sx={{
                    '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' },
                    borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden'
                }}>
                    <TextField label="Habitación" source="habitacion.Identificador" sx={{ fontWeight: 600, color: 'primary.main' }} />
                    <DateField
                        source="Cuando"
                        label="Fecha/Hora"
                        showTime
                        options={{ day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }}
                    />
                    <TextField label="Personal" source="usuario.Username" />
                    <TextField source="Observacion" label="Observaciones" />
                    <EditButton />
                </Datagrid>
            </List>
        </Box>
    );
};

export const LimpiezaEdit = () => (
    <Edit>
        <SimpleForm toolbar={<CustomToolbar backTo="/limpiezas" />}>
            <LimpiezaStatusBanner />
            <SectionHeader icon={HistoryIcon} title="Detalles del Registro" />
            <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <DateTimeInput source="Cuando" label="Fecha y Hora" fullWidth disabled />
                        <Box sx={{ mt: 2 }}>
                            <ReferenceInput source="habitacionId" reference="habitaciones">
                                <AutocompleteInput label='Habitación' optionText='Identificador' fullWidth disabled />
                            </ReferenceInput>
                        </Box>
                        <Box sx={{ mt: 2 }}>
                            <TextField source="usuario.Username" label="Personal asignado" />
                        </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextInput
                            source="Observacion"
                            label="Observaciones de la Limpieza"
                            fullWidth
                            multiline
                            rows={8}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><CommentIcon color="action" /></InputAdornment>
                            }}
                        />
                    </Grid>
                </Grid>
            </Paper>
        </SimpleForm>
    </Edit>
);

const inputText = choice => choice?.habitacion?.Identificador || '';

const LimpiezaCreate = () => {
    const transform = data => {
        return {
            turnoId: data.turnoId,
            Cuando: data.Cuando,
            Observacion: data.Observacion
        };
    };

    return (
        <Create redirect="/turnos" transform={transform} sx={{ mt: 2 }}>
            <SimpleForm toolbar={<CustomToolbar backTo="/turnos" />}>
                <SectionHeader icon={CleaningIcon} title="Nuevo Registro de Limpieza" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <ReferenceInput source="turnoId" reference="turnos" perPage={300}>
                                <AutocompleteInput
                                    label='Habitación (desde Turno)'
                                    validate={Requerido}
                                    inputText={inputText}
                                    readOnly={true}
                                    fullWidth
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><RoomIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </ReferenceInput>
                            <Box sx={{ mt: 2 }}>
                                <DateTimeInput source="Cuando" label="Fecha y Hora" defaultValue={new Date()} fullWidth validate={Requerido} />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextInput
                                source="Observacion"
                                label="Observaciones / Novedades"
                                fullWidth
                                multiline
                                rows={8}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><CommentIcon color="action" /></InputAdornment>
                                }}
                            />
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Create>
    );
};

const resourceLimpieza = {
    list: LimpiezaList,
    edit: LimpiezaEdit,
    create: LimpiezaCreate,
    icon: CleaningIcon,
};

export default resourceLimpieza;
