import { Create, Edit, SimpleForm, TextInput, ReferenceInput, AutocompleteInput, required, useRecordContext } from 'react-admin';
import { Datagrid, List, TextField, EditButton, TopToolbar, CreateButton, usePermissions } from 'react-admin';
import { Grid, Box, Typography, Paper, IconButton } from '@mui/material';
import {
    Business as BusinessIcon,
    ContactPhone as ContactPhoneIcon,
    Store as StoreIcon,
    Phone as PhoneIcon,
    Person as PersonIcon
} from '@mui/icons-material';
import CustomToolbar from '../layout/CustomToolbar';

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

const SupplierStatusBanner = () => {
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
            borderColor: `primary.main`,
            backgroundColor: `primary.light`,
            opacity: 0.9,
            borderRadius: '8px'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StoreIcon sx={{ fontSize: 40, color: `primary.dark` }} />
                <Box>
                    <Typography variant="overline" display="block" sx={{ color: 'text.secondary', fontWeight: 'bold', lineHeight: 1 }}>
                        Proveedor
                    </Typography>
                    <Typography variant="h5" fontWeight="900" color={`primary.dark`}>
                        {record.Nombre}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                {record.Telefono && (
                    <IconButton color="primary" href={`tel:${record.Telefono}`} sx={{ backgroundColor: 'white' }}>
                        <PhoneIcon titleAccess={record.Telefono} />
                    </IconButton>
                )}
            </Box>
        </Paper>
    );
};

const ProveedorListActions = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    return (
        <TopToolbar>
            {isSupervisor && <CreateButton />}
        </TopToolbar>
    );
};

export const ProveedorList = () => (
    <List actions={<ProveedorListActions />} sx={{ '& .RaList-main': { marginTop: 2 } }}>
        <Datagrid rowClick="edit" sx={{
            '& .RaDatagrid-rowCell': { padding: '16px 8px' },
            '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
        }}>
            <TextField source="Nombre" sx={{ fontWeight: 600, color: 'primary.main' }} />
            <TextField source="NombreContacto" label="Contacto" />
            <TextField source="Telefono" />
            <TextField label="Rubro" source="rubro.Nombre" />
            <EditButton />
        </Datagrid>
    </List>
);

export const ProveedorEdit = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';

    return (
        <Edit mutationMode="pessimistic">
            <SimpleForm toolbar={<CustomToolbar backTo="/proveedores" showDelete deleteRedirect="/proveedores" />}>
                <SupplierStatusBanner />

                <SectionHeader icon={BusinessIcon} title="Datos de la Empresa" />
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Nombre" validate={Requerido} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <ReferenceInput source="rubroId" reference="rubros" sort={{ field: 'Nombre', order: 'ASC' }}>
                                <AutocompleteInput label='Rubro / Categoría' optionText='Nombre' validate={Requerido} fullWidth />
                            </ReferenceInput>
                        </Grid>
                    </Grid>
                </Paper>

                <SectionHeader icon={ContactPhoneIcon} title="Datos de Contacto" />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TextInput source="NombreContacto" label="Nombre del Referente" fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextInput source="Telefono" label="Teléfono / WhatsApp" fullWidth />
                    </Grid>
                </Grid>
            </SimpleForm>
        </Edit>
    );
};

export const ProveedorCreate = () => (
    <Create redirect="list">
        <SimpleForm toolbar={<CustomToolbar backTo="/proveedores" />}>
            <SectionHeader icon={BusinessIcon} title="Nuevo Proveedor" />
            <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <TextInput source="Nombre" validate={Requerido} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <ReferenceInput source="rubroId" reference="rubros" sort={{ field: 'Nombre', order: 'ASC' }}>
                            <AutocompleteInput label='Rubro' optionText='Nombre' validate={Requerido} fullWidth />
                        </ReferenceInput>
                    </Grid>
                </Grid>
            </Paper>

            <SectionHeader icon={ContactPhoneIcon} title="Información de Contacto" />
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <TextInput source="NombreContacto" label="Nombre de Contacto" fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextInput source="Telefono" fullWidth />
                </Grid>
            </Grid>
        </SimpleForm>
    </Create>
);

const suppliers = {
    list: ProveedorList,
    edit: ProveedorEdit,
    create: ProveedorCreate,
};
export default suppliers;
