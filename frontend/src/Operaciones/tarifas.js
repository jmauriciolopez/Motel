import {
    Create, Edit, SimpleForm, TextInput, NumberField, CreateButton,
    CloneButton, TopToolbar, Datagrid, List, TextField, EditButton,
    NumberInput, required, usePermissions
} from 'react-admin';
import { Grid, Button, Box, Typography, Paper } from '@mui/material';
import {
    TableChart as TableChartIcon,
    PriceChange as PriceIcon,
    Label as LabelIcon,
    EventNote as EventIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import CustomToolbar from '../layout/CustomToolbar';
import { useMotel } from '../context/MotelContext';
import { useDeletedRowSx } from '../helpers/deletedRowSx';

// -- Helper Components --
const SectionHeader = ({ icon: Icon, title }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 3, mb: 2 }}>
        <Icon color="primary" fontSize="small" />
        <Typography variant="subtitle1" fontWeight="700" color="primary">
            {title.toUpperCase()}
        </Typography>
    </Box>
);

// -- Actions --
const TarifaListActions = () => {
    const { permissions } = usePermissions();
    const isAdmin = permissions === 'Administrador' || permissions === 'SuperAdmin';

    return (
        <TopToolbar>
            {isAdmin && <CreateButton />}
            <Button
                component={Link}
                to="/CuadroTarifario"
                variant="outlined"
                size="small"
                sx={{ ml: 1, textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}
                startIcon={<TableChartIcon />}
            >
                Imprimir Tarifario
            </Button>
        </TopToolbar>
    );
};

const TarifaEditActions = () => {
    const { permissions } = usePermissions();
    const isAdmin = permissions === 'Administrador' || permissions === 'SuperAdmin';

    return (
        <TopToolbar>
            {isAdmin && <CloneButton label="Copiar esta tarifa" />}
        </TopToolbar>
    );
};

// -- Components --

export const TarifaList = () => {
    const deletedRowSx = useDeletedRowSx();
    return (
        <List
            actions={<TarifaListActions />}
            sx={{ '& .RaList-main': { marginTop: 2 } }}
        >
            <Datagrid rowClick="edit" rowSx={deletedRowSx} sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
            }}>
                <TextField source="Nombre" sx={{ fontWeight: 600, color: 'primary.main' }} />
                <NumberField source="PrecioTurno" options={{ style: 'currency', currency: 'ARS' }} label="P. Turno" />
                <NumberField source="PrecioTurnoPromocional" options={{ style: 'currency', currency: 'ARS' }} label='Promoción' />
                <NumberField source="PrecioDiario" options={{ style: 'currency', currency: 'ARS' }} label="P. Diario" />
                <NumberField source="PrecioHrDiaExcede" options={{ style: 'currency', currency: 'ARS' }} label="Exc. Día" />
                <NumberField source="PrecioHrNocheExcede" options={{ style: 'currency', currency: 'ARS' }} label="Exc. Noche" />
                <EditButton />
                <CloneButton label="Copiar" />
            </Datagrid>
        </List>
    );
};

export const TarifaCreate = () => (
    <Create redirect="list">
        <SimpleForm>
            <SectionHeader icon={LabelIcon} title="Información de la Tarifa" />
            <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <TextInput source="Nombre" validate={required()} fullWidth />
                    </Grid>
                </Grid>
            </Paper>

            <SectionHeader icon={PriceIcon} title="Configuración de Precios" />
            <Grid container spacing={2}>
                <Grid item xs={12} md={4}><NumberInput source="PrecioTurno" label="Precio Turno" validate={required()} fullWidth /></Grid>
                <Grid item xs={12} md={4}><NumberInput source="PrecioTurnoPromocional" label="Precio Promo" fullWidth /></Grid>
                <Grid item xs={12} md={4}><NumberInput source="PrecioDiario" label="Precio Día (24hs)" fullWidth /></Grid>
            </Grid>

            <SectionHeader icon={EventIcon} title="Excedentes y Recargos" />
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}><NumberInput source="PrecioHrDiaExcede" label="Precio Hora Excedente Día" fullWidth /></Grid>
                <Grid item xs={12} md={6}><NumberInput source="PrecioHrNocheExcede" label="Precio Hora Excedente Noche" fullWidth /></Grid>
            </Grid>
        </SimpleForm>
    </Create>
);

export const TarifaEdit = () => (
    <Edit mutationMode="pessimistic" actions={<TarifaEditActions />}>
        <SimpleForm toolbar={<CustomToolbar backTo="/tarifas" />}>
            <SectionHeader icon={LabelIcon} title="Identificación" />
            <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <TextInput source="Nombre" validate={required()} fullWidth />
                    </Grid>
                </Grid>
            </Paper>

            <SectionHeader icon={PriceIcon} title="Estructura de Precios" />
            <Grid container spacing={2}>
                <Grid item xs={12} md={4}><NumberInput source="PrecioTurno" label="Precio Turno" validate={required()} fullWidth /></Grid>
                <Grid item xs={12} md={4}><NumberInput source="PrecioTurnoPromocional" label="Precio Promo" fullWidth /></Grid>
                <Grid item xs={12} md={4}><NumberInput source="PrecioDiario" label="Precio Día (24hs)" fullWidth /></Grid>
            </Grid>

            <SectionHeader icon={EventIcon} title="Excedentes (Por Hora)" />
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}><NumberInput source="PrecioHrDiaExcede" label="Hora Excedente Día" fullWidth /></Grid>
                <Grid item xs={12} md={6}><NumberInput source="PrecioHrNocheExcede" label="Hora Excedente Noche" fullWidth /></Grid>
            </Grid>
        </SimpleForm>
    </Edit>
);

const tarifas = {
    list: TarifaList,
    edit: TarifaEdit,
    create: TarifaCreate,
};

export default tarifas;
