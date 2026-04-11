import React from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, AutocompleteInput,
    SimpleForm, TextInput, ReferenceInput, Create, useGetList,
    useRecordContext, required, TopToolbar, CreateButton, usePermissions
} from 'react-admin';
import { useMotel } from '../context/MotelContext';
import { Grid, Box, Typography, Paper, InputAdornment } from '@mui/material';
import {
    DirectionsCar as CarIcon,
    Palette as ColorIcon,
    Label as LabelIcon,
    Badge as BadgeIcon,
    Category as TypeIcon
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

const ClienteStatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    return (
        <Paper elevation={0} sx={{
            p: 3,
            mb: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
            color: 'white',
            borderRadius: '16px'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CarIcon sx={{ fontSize: 40, opacity: 0.8 }} />
                <Box>
                    <Typography variant="overline" sx={{ fontWeight: 'bold', opacity: 0.9 }}>
                        Ficha del Vehículo
                    </Typography>
                    <Typography variant="h5" fontWeight="900">
                        {record.Patente}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>Marca / Modelo</Typography>
                <Typography variant="h5" fontWeight="700">
                    {record.Marca || 'Genérico'}
                </Typography>
            </Box>
        </Paper>
    );
};

const postFilters = [
    <TextInput label="Patente" source="Patente" alwaysOn />,
    <TextInput label="Marca" source="Marca" />
];

const ClienteListActions = () => {
    const { permissions } = usePermissions();
    const canCreate = permissions === 'Recepcionista' || permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {canCreate && <CreateButton />}
        </TopToolbar>
    );
};

const ClienteList = () => {
    const { currentMotelId } = useMotel();
    return (
        <Box sx={{ mt: 2 }}>
            <List
                actions={<ClienteListActions />}
                filters={postFilters}
                sort={{ field: 'id', order: 'DESC' }}
                filter={{ motelId: currentMotelId }}
            >
                <Datagrid rowClick="edit" sx={{
                    '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                    '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' },
                    borderRadius: '16px', border: '1px solid', borderColor: 'divider', overflow: 'hidden'
                }}>
                    <TextField source="Patente" label="Patente" sx={{ fontWeight: 800, color: 'primary.main' }} />
                    <TextField source="Marca" label="Marca" />
                    <TextField source="Color" label="Color" />
                    <TextField source="movilidad.Tipo" label="Movilidad" />
                    <EditButton />
                </Datagrid>
            </List>
        </Box>
    );
};

export const ClienteEdit = () => {
    const { permissions } = usePermissions();
    const canEdit = permissions === 'Recepcionista' || permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';

    return (
        <Edit mutationMode="pessimistic">
            <SimpleForm toolbar={<CustomToolbar backTo="/clientes" />}>
                <ClienteStatusBanner />
                <SectionHeader icon={BadgeIcon} title="Datos del Vehículo" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput
                                source="Patente"
                                fullWidth
                                validate={Requerido}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><BadgeIcon color="action" /></InputAdornment>,
                                    sx: { fontWeight: 700, fontSize: '1.1rem' }
                                }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <TextInput
                                    source="Color"
                                    fullWidth
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><ColorIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextInput
                                source="Marca"
                                fullWidth
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><LabelIcon color="action" /></InputAdornment>
                                }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <ReferenceInput source="movilidadId" reference="movilidads" sort={{ field: 'Tipo', order: 'ASC' }}>
                                    <AutocompleteInput
                                        label='Tipo de Movilidad'
                                        optionText='Tipo'
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><TypeIcon color="action" /></InputAdornment>
                                        }}
                                    />
                                </ReferenceInput>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Edit>
    );
};

const ClienteCreate = () => {
    const { data: movilidads } = useGetList('movilidads', {
        filter: { Tipo: 'automovil' },
        pagination: { page: 1, perPage: 1 },
        sort: { field: 'Tipo', order: 'ASC' }
    });
    const defaultMovilidadId = movilidads?.[0]?.id || movilidads?.[0]?.id;

    return (
        <Create redirect="list" sx={{ mt: 2 }}>
            <SimpleForm toolbar={<CustomToolbar backTo="/clientes" />}>
                <SectionHeader icon={CarIcon} title="Registrar Nuevo Cliente" />
                <Paper elevation={0} sx={{ p: 4, backgroundColor: 'action.hover', borderRadius: 4, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput
                                source="Patente"
                                fullWidth
                                validate={Requerido}
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><BadgeIcon color="action" /></InputAdornment>,
                                    sx: { fontWeight: 700, fontSize: '1.1rem' }
                                }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <TextInput
                                    source="Color"
                                    fullWidth
                                    InputProps={{
                                        startAdornment: <InputAdornment position="start"><ColorIcon color="action" /></InputAdornment>
                                    }}
                                />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextInput
                                source="Marca"
                                fullWidth
                                InputProps={{
                                    startAdornment: <InputAdornment position="start"><LabelIcon color="action" /></InputAdornment>
                                }}
                            />
                            <Box sx={{ mt: 2 }}>
                                <ReferenceInput source="movilidadId" reference="movilidads" defaultValue={defaultMovilidadId} sort={{ field: 'Tipo', order: 'ASC' }}>
                                    <AutocompleteInput
                                        label='Tipo de Movilidad'
                                        optionText='Tipo'
                                        fullWidth
                                        InputProps={{
                                            startAdornment: <InputAdornment position="start"><TypeIcon color="action" /></InputAdornment>
                                        }}
                                    />
                                </ReferenceInput>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            </SimpleForm>
        </Create>
    );
};

const resource = {
    list: ClienteList,
    edit: ClienteEdit,
    create: ClienteCreate
};

export default resource;
