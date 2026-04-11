import {
    Datagrid, List, TextField, EditButton, AutocompleteInput, required,
    Create, SimpleForm, TextInput, ReferenceInput, Edit, BooleanField,
    BooleanInput, useRecordContext, TopToolbar, CreateButton, usePermissions
} from 'react-admin';
import { Grid, Box, Typography, Paper, Chip } from '@mui/material';
import {
    Warehouse as WarehouseIcon,
    LocationOn as LocationIcon,
    Stars as StarsIcon
} from '@mui/icons-material';
import CustomToolbar from '../layout/CustomToolbar';
import { useMotel } from '../context/MotelContext';

const Requerido = [required()];

// -- Helper Components --
const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
        <Icon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight="700" color="primary">
            {title.toUpperCase()}
        </Typography>
    </Box>
);

const DepositoStatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    return (
        <Paper elevation={0} sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: `6px solid`,
            borderColor: record.EsPrincipal ? 'secondary.main' : 'primary.main',
            backgroundColor: record.EsPrincipal ? 'secondary.light' : 'primary.light',
            opacity: 0.9,
            borderRadius: '8px'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarehouseIcon sx={{ fontSize: 40, color: record.EsPrincipal ? 'secondary.dark' : 'primary.dark' }} />
                <Box>
                    <Typography variant="overline" display="block" sx={{ color: 'text.secondary', fontWeight: 'bold', lineHeight: 1 }}>
                        Depósito {record.EsPrincipal ? 'Principal' : 'Secundario'}
                    </Typography>
                    <Typography variant="h5" fontWeight="900" color={record.EsPrincipal ? 'secondary.dark' : 'primary.dark'}>
                        {record.Nombre}
                    </Typography>
                </Box>
            </Box>
            {record.EsPrincipal && (
                <Chip
                    icon={<StarsIcon />}
                    label="ACTIVO PRINCIPAL"
                    color="secondary"
                    sx={{ fontWeight: 'bold' }}
                />
            )}
        </Paper>
    );
};

export const DepositoCreate = () => (
    <Create redirect="list">
        <SimpleForm toolbar={<CustomToolbar backTo="/depositos" />}>
            <SectionHeader icon={WarehouseIcon} title="Nuevo Depósito" />
            <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <TextInput source="Nombre" validate={Requerido} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
                        <BooleanInput source="EsPrincipal" label="¿Es el Depósito Principal?" />
                    </Grid>
                </Grid>
            </Paper>

            <SectionHeader icon={LocationIcon} title="Ubicación y Asignación" />
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <ReferenceInput source="motelId" reference="moteles">
                        <AutocompleteInput label='Motel Asignado' optionText='Nombre' validate={Requerido} fullWidth />
                    </ReferenceInput>
                </Grid>
            </Grid>
        </SimpleForm>
    </Create>
);

const DepositoListActions = () => {
    const { permissions } = usePermissions();
    const canCreate = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {canCreate && <CreateButton />}
        </TopToolbar>
    );
};

export const DepositoList = () => {
    const { currentMotelId } = useMotel();
    return (
        <List
            actions={<DepositoListActions />}
            sx={{ '& .RaList-main': { marginTop: 2 } }}
            filter={{ motelId: currentMotelId }}
            queryOptions={{ meta: { include: { motel: true } } }}
        >
            <Datagrid rowClick="edit" sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
            }}>
                <TextField source="Nombre" sx={{ fontWeight: 600, color: 'primary.main' }} />
                <TextField label="Motel" source="motel.Nombre" />
                <BooleanField label="Principal" source="EsPrincipal" />
                <EditButton />
            </Datagrid>
        </List>
    );
};

export const DepositoEdit = () => {
    const { permissions } = usePermissions();
    const canEdit = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';

    return (
        <Edit
            mutationMode="pessimistic"
            queryOptions={{ meta: { include: { motel: true } } }}
        >
            <SimpleForm toolbar={<CustomToolbar backTo="/depositos" showDelete deleteRedirect="/depositos" />}>
                <DepositoStatusBanner />

                <SectionHeader icon={WarehouseIcon} title="Configuración del Depósito" />
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={8}>
                            <TextInput source="Nombre" validate={Requerido} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={4} sx={{ display: 'flex', alignItems: 'center' }}>
                            <BooleanInput source="EsPrincipal" label="Depósito Principal" />
                        </Grid>
                    </Grid>
                </Paper>

                <SectionHeader icon={LocationIcon} title="Asignación de Motel" />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <ReferenceInput source="motelId" reference="moteles">
                            <AutocompleteInput label='Motel' optionText='Nombre' validate={Requerido} fullWidth />
                        </ReferenceInput>
                    </Grid>
                </Grid>
            </SimpleForm>
        </Edit>
    );
};

const depositosResource = {
    list: DepositoList,
    edit: DepositoEdit,
    create: DepositoCreate,
};
export default depositosResource;
