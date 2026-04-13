import React, { useState } from 'react';
import {
    List, Datagrid, TextField, NumberField, BooleanField,
    Edit, Create, SimpleForm, TextInput, NumberInput,
    ReferenceInput, AutocompleteInput, BooleanInput,
    EditButton, required, usePermissions, useNotify, useRefresh, useRecordContext,
} from 'react-admin';
import { Grid, Button, CircularProgress } from '@mui/material';
import { Sync as SyncIcon } from '@mui/icons-material';
import CustomToolbar from '../layout/CustomToolbar';
import { http } from '../shared/api/HttpClient';

const Requerido = [required()];

const SyncRowButton = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const refresh = useRefresh();
    const [loading, setLoading] = useState(false);

    if (!record) return null;

    const handleSync = async (e) => {
        e.stopPropagation();
        setLoading(true);
        try {
            const motelId = sessionStorage.getItem('motelId');
            const data = await http.post('/productos/sync-catalogo', {
                catalogoIds: [record.id],
                ...(motelId && { motelId }),
            });
            notify(data.message, { type: 'success' });
            refresh();
        } catch (err) {
            notify('Error: ' + err.message, { type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size="small" variant="outlined" color="primary"
            onClick={handleSync} disabled={loading}
            startIcon={loading ? <CircularProgress size={14} /> : <SyncIcon fontSize="small" />}
            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
        >
            Sync
        </Button>
    );
};

const catalogoFilters = [
    <TextInput label="Buscar" source="q" alwaysOn />,
    <ReferenceInput label="Rubro" source="rubroId" reference="rubros">
        <AutocompleteInput optionText="Nombre" />
    </ReferenceInput>,
];

const CatalogoProductoList = () => {
    const { permissions } = usePermissions();
    const isSuperAdmin = permissions === 'SuperAdmin' || permissions === 'SuperUser';

    return (
        <List
            filters={catalogoFilters}
            sort={{ field: 'Nombre', order: 'ASC' }}
            sx={{ '& .RaList-main': { marginTop: 2 } }}
            queryOptions={{ meta: { include: { rubro: true } } }}
        >
            <Datagrid rowClick={isSuperAdmin ? 'edit' : false} bulkActionButtons={false}>
                <TextField source="Nombre" sx={{ fontWeight: 600 }} />
                <TextField label="Rubro" source="rubro.Nombre" />
                <NumberField source="Precio" options={{ style: 'currency', currency: 'ARS' }} />
                <NumberField source="Costo" options={{ style: 'currency', currency: 'ARS' }} />
                <BooleanField source="Facturable" />
                <NumberField source="StockMinimo" label="Stock Mín" />
                <SyncRowButton />
                {isSuperAdmin && <EditButton />}
            </Datagrid>
        </List>
    );
};

export const CatalogoProductoEdit = () => (
    <Edit>
        <SimpleForm toolbar={<CustomToolbar backTo="/catalogo-productos" />}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                    <TextInput source="Nombre" validate={Requerido} fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                    <ReferenceInput source="rubroId" reference="rubros">
                        <AutocompleteInput label="Rubro" optionText="Nombre" fullWidth />
                    </ReferenceInput>
                </Grid>
                <Grid item xs={6} md={3}>
                    <NumberInput source="Precio" validate={Requerido} fullWidth />
                </Grid>
                <Grid item xs={6} md={3}>
                    <NumberInput source="Costo" fullWidth />
                </Grid>
                <Grid item xs={6} md={3}>
                    <NumberInput source="StockMinimo" defaultValue={5} fullWidth />
                </Grid>
                <Grid item xs={6} md={3}>
                    <BooleanInput source="Facturable" />
                </Grid>
                <Grid item xs={12}>
                    <TextInput source="Descripcion" multiline fullWidth />
                </Grid>
                <Grid item xs={12}>
                    <TextInput source="CriterioBusqueda" label="Criterio de Búsqueda (tags)" fullWidth helperText="Ej: bebida fria sin alcohol verano" />
                </Grid>
            </Grid>
        </SimpleForm>
    </Edit>
);

export const CatalogoProductoCreate = () => (
    <Create redirect="list">
        <SimpleForm toolbar={<CustomToolbar backTo="/catalogo-productos" />}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={8}>
                    <TextInput source="Nombre" validate={Requerido} fullWidth />
                </Grid>
                <Grid item xs={12} md={4}>
                    <ReferenceInput source="rubroId" reference="rubros">
                        <AutocompleteInput label="Rubro" optionText="Nombre" fullWidth />
                    </ReferenceInput>
                </Grid>
                <Grid item xs={6} md={3}>
                    <NumberInput source="Precio" validate={Requerido} fullWidth />
                </Grid>
                <Grid item xs={6} md={3}>
                    <NumberInput source="Costo" fullWidth />
                </Grid>
                <Grid item xs={6} md={3}>
                    <NumberInput source="StockMinimo" defaultValue={5} fullWidth />
                </Grid>
                <Grid item xs={6} md={3}>
                    <BooleanInput source="Facturable" />
                </Grid>
                <Grid item xs={12}>
                    <TextInput source="Descripcion" multiline fullWidth />
                </Grid>
                <Grid item xs={12}>
                    <TextInput source="CriterioBusqueda" label="Criterio de Búsqueda (tags)" fullWidth helperText="Ej: bebida fria sin alcohol verano" />
                </Grid>
            </Grid>
        </SimpleForm>
    </Create>
);

const resource = {
    list: CatalogoProductoList,
    edit: CatalogoProductoEdit,
    create: CatalogoProductoCreate,
};
export default resource;
