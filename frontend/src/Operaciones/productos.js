import { Datagrid, DateField, List, NumberField, TextField, EditButton, useRecordContext, BulkDeleteButton } from 'react-admin';
import { useDeletedRowSx } from '../helpers/deletedRowSx';
import {
    Create, Edit, NumberInput, SimpleForm, TextInput, ReferenceInput,
    AutocompleteInput, required, BooleanField, BooleanInput, TopToolbar, CreateButton, usePermissions
} from 'react-admin';
import { Grid, Box, Typography, Paper, Divider, Chip, Button } from '@mui/material';
import {
    Inventory as InventoryIcon,
    MonetizationOn as PriceIcon,
    Warning as WarningIcon,
    Category as CategoryIcon,
    ShoppingBag as ProductIcon,
    Sync as SyncIcon,
} from '@mui/icons-material';
import CustomToolbar from '../layout/CustomToolbar';
import SyncCatalogoDialog from './SyncCatalogoDialog';
import React, { useState } from 'react';
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

const ProductStatusBanner = () => {
    const record = useRecordContext();
    if (!record) return null;

    const isLowStock = record.StockActual <= record.StockMinimo;
    const color = isLowStock ? 'error' : 'success';

    return (
        <Paper elevation={0} sx={{
            p: 2,
            mb: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderLeft: `6px solid`,
            borderColor: `${color}.main`,
            backgroundColor: `${color}.light`,
            opacity: 0.9,
            borderRadius: '8px'
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <ProductIcon sx={{ fontSize: 40, color: `${color}.dark` }} />
                <Box>
                    <Typography variant="overline" display="block" sx={{ color: 'text.secondary', fontWeight: 'bold', lineHeight: 1 }}>
                        Producto
                    </Typography>
                    <Typography variant="h5" fontWeight="900" color={`${color}.dark`}>
                        {record.Nombre}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h6" fontWeight="bold" color="primary.dark">
                    {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(record.Precio)}
                </Typography>
                <Chip
                    label={isLowStock ? "STOCK BAJO" : "STOCK NORMAL"}
                    size="small"
                    color={color}
                    sx={{ fontWeight: 'bold' }}
                />
            </Box>
        </Paper>
    );
};

const postFilters = [
    <TextInput label="Buscar" source="q" alwaysOn />,
];

export const ProductoList = () => {
    const [syncOpen, setSyncOpen] = useState(false);

    const SyncToolbar = () => {
        const { permissions } = usePermissions();
        const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';

        return (
            <TopToolbar>
                {isSupervisor && (
                    <Button
                        variant="outlined" size="small" startIcon={<SyncIcon />}
                        onClick={() => setSyncOpen(true)}
                        sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600 }}
                    >
                        Sincronizar Catálogo
                    </Button>
                )}
                {isSupervisor && <CreateButton />}
            </TopToolbar>
        );
    };

    const EmptyList = () => {
        const { permissions } = usePermissions();
        const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';

        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <ProductIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>Sin productos aún</Typography>
                <Typography variant="body2" color="text.disabled" mb={3}>
                    {isSupervisor ? 'Sincronizá desde el catálogo o creá uno manualmente.' : 'No hay productos disponibles.'}
                </Typography>
                {isSupervisor && (
                    <>
                        <Button
                            variant="contained" startIcon={<SyncIcon />}
                            onClick={() => setSyncOpen(true)}
                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, mr: 1 }}
                        >
                            Sincronizar Catálogo
                        </Button>
                        <CreateButton variant="outlined" />
                    </>
                )}
            </Box>
        );
    };

    const { currentMotelId } = useMotel();
    const deletedRowSx = useDeletedRowSx();

    return (
        <>
            <List
                filters={postFilters}
                actions={<SyncToolbar />}
                filter={{ motelId: currentMotelId }}
                empty={<EmptyList />}
                sx={{ '& .RaList-main': { marginTop: 2 } }}
            >
                <Datagrid
                    bulkActionButtons={<BulkDeleteButton mutationMode="pessimistic" />}
                    rowSx={deletedRowSx}
                    sx={{
                        '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                        '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
                    }}>
                    <TextField source="Nombre" sx={{ fontWeight: 600, color: 'primary.main' }} />
                    <TextField label="Rubro" source="rubro.Nombre" />
                    <NumberField source="Precio" options={{ style: 'currency', currency: 'ARS' }} />
                    <NumberField source="Costo" options={{ style: 'currency', currency: 'ARS' }} />
                    <NumberField source="StockMinimo" label="Stock Mín" />
                    <BooleanField source="Facturable" />
                    <BooleanField source="EsComun" label="Frecuente" />
                    <DateField source="updatedAt" label="Actualizado" showTime />
                    <EditButtonWrapper />
                </Datagrid>
            </List>
            <SyncCatalogoDialog open={syncOpen} onClose={() => setSyncOpen(false)} />
        </>
    );
};

const EditButtonWrapper = () => {
    const { permissions } = usePermissions();
    const isSupervisor = permissions === 'Supervisor' || permissions === 'Administrador' || permissions === 'SuperAdmin';
    if (!isSupervisor) return null;
    return <EditButton />;
};

export const ProductoEdit = () => {
    return (
        <Edit mutationMode="pessimistic">
            <SimpleForm toolbar={<CustomToolbar backTo="/productos" showDelete deleteRedirect="/productos" />}>
                <ProductStatusBanner />

                <SectionHeader icon={InventoryIcon} title="Información General" />
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <TextInput source="Nombre" validate={Requerido} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <ReferenceInput source="rubroId" reference="rubros">
                                <AutocompleteInput label='Rubro / Categoría' optionText='Nombre' validate={Requerido} fullWidth />
                            </ReferenceInput>
                        </Grid>
                        <Grid item xs={12} md={8}>
                            <TextInput source="CriterioBusqueda" label="Criterio de Búsqueda (tags para importar)" fullWidth helperText="Ej: bebida fria sin alcohol verano" />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <BooleanInput source="Facturable" label="Es Facturable" />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <BooleanInput source="EsComun" label="Producto Frecuente (Dashboard)" />
                        </Grid>
                    </Grid>
                </Paper>

                <SectionHeader icon={PriceIcon} title="Precios y Costos" />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <NumberInput source="Precio" label="Precio de Venta" validate={Requerido} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <NumberInput source="Costo" label="Costo de Compra" fullWidth />
                    </Grid>
                </Grid>

                <SectionHeader icon={WarningIcon} title="Control de Inventario" />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <NumberInput source="StockMinimo" label="Stock Mínimo para Alertas" defaultValue={5} fullWidth />
                    </Grid>
                </Grid>
            </SimpleForm>
        </Edit>
    );
};

export const ProductoCreate = () => {
    return (
        <Create redirect="list">
            <SimpleForm toolbar={<CustomToolbar backTo="/productos" />}>
                <SectionHeader icon={CategoryIcon} title="Nuevo Producto" />
                <Paper elevation={0} sx={{ p: 3, backgroundColor: 'action.hover', borderRadius: 2, mb: 3 }}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={8}>
                            <TextInput source="Nombre" validate={Requerido} fullWidth />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <ReferenceInput source="rubroId" reference="rubros">
                                <AutocompleteInput label='Rubro' optionText='Nombre' validate={Requerido} fullWidth />
                            </ReferenceInput>
                        </Grid>
                    </Grid>
                </Paper>

                <SectionHeader icon={PriceIcon} title="Finanzas" />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}><NumberInput source="Precio" label="Precio de Venta" validate={Requerido} fullWidth /></Grid>
                    <Grid item xs={12} md={6}><NumberInput source="Costo" label="Costo de Compra" fullWidth /></Grid>
                </Grid>

                <SectionHeader icon={WarningIcon} title="Alertas de Stock" />
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}><NumberInput source="StockMinimo" label="Stock Mínimo" defaultValue={5} fullWidth /></Grid>
                    <Grid item xs={12} md={3}><BooleanInput source="Facturable" /></Grid>
                    <Grid item xs={12} md={3}><BooleanInput source="EsComun" label="Frecuente" /></Grid>
                </Grid>
            </SimpleForm>
        </Create>
    );
};

const products = {
    list: ProductoList,
    edit: ProductoEdit,
    create: ProductoCreate,
};
export default products;
