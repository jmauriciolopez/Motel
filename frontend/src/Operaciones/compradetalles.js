import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    Datagrid, List, TextField, Edit, EditButton, NumberField, NumberInput, AutocompleteInput, SimpleForm, TextInput, ReferenceInput, Create, DateField,
    useRecordContext, required, useDataProvider, useNotify, ReferenceField, TopToolbar
} from 'react-admin';
import CustomToolbar from '../layout/CustomToolbar';
import { Grid, Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const Requerido = [required()];

const CompraDetalleListActions = () => {
    const location = useLocation();
    const navigate = useNavigate();

    let compraId = null;
    try {
        const f = JSON.parse(new URLSearchParams(location.search).get('filter') || '{}');
        compraId = f['compraId'] || null;
    } catch (_) {}

    if (!compraId) return null;

    return (
        <TopToolbar>
            <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/compras')}
            >
                Volver a la Compra
            </Button>
        </TopToolbar>
    );
};

const CompraDetalleList = () => {
    const postFilters = [
        <TextInput label="Buscar" source="q" alwaysOn />,
        <ReferenceInput label="Compra" source="compraId" reference="compras">
            <AutocompleteInput optionText={record => record && record.Fecha ? `${new Date(record.Fecha).toLocaleDateString()} - ${record.proveedor?.Nombre || ''}` : ''} />
        </ReferenceInput>,
        <ReferenceInput label="Producto" source="productoId" reference="productos">
            <AutocompleteInput optionText="Nombre" />
        </ReferenceInput>,
    ];
    return (
        <List hasCreate={false} actions={<CompraDetalleListActions />} sort={{ field: 'id', order: 'DESC' }} sx={{ '& .RaList-main': { marginTop: 2 } }}>
            <Datagrid rowClick="edit" sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
            }}>
                <TextField label="Producto" source="producto.Nombre" sx={{ fontWeight: 600, color: 'primary.main' }} />
                <NumberField source="Cantidad" />
                <NumberField source="Precio" options={{ style: 'currency', currency: 'ARS' }} />
                <NumberField source="Importe" options={{ style: 'currency', currency: 'ARS' }} sx={{ fontWeight: 600, color: 'success.main' }} />
                <EditButton />
            </Datagrid>
        </List>
    );
};

export const CompraDetalleEdit = () => {
    const CompraDetalleForm = () => {
        const record = useRecordContext();
        const compraId = record?.compra?.id;
        const backTo = compraId ? `/compras/${compraId}` : '/compras';

        return (
            <SimpleForm toolbar={<CustomToolbar backTo={backTo} />}>
                <ReferenceInput source="compraId" reference="compras" perPage={300} label='Compra' >
                    <AutocompleteInput
                        label='Compra'
                        optionText={record => record && record.Fecha ? `${new Date(record.Fecha).toLocaleDateString()} - ${record.proveedor?.Nombre || ''}` : ''}
                        readOnly={true}
                        validate={Requerido}
                    />
                </ReferenceInput>
                <ReferenceInput label="Producto" source="productoId" reference="productos" perPage={300} >
                    <AutocompleteInput label='Producto' optionText='Nombre' validate={Requerido} />
                </ReferenceInput>
                <NumberInput source="Cantidad" fullWidth={true} />
                <NumberInput source="Precio" fullWidth={true} />
            </SimpleForm>
        );
    };

    return (
        <Edit redirect={(resource, id, data) => `/compras/${data.compra?.id}`}>
            <CompraDetalleForm />
        </Edit>
    );
};

export const CompraDetalleCreate = () => {
    const location = useLocation();
    const query = new URLSearchParams(location.search);
    const compraId = query.get('compraId');

    const backUrl = '/compras';

    return (
        <Create redirect={backUrl}>
            <SimpleForm toolbar={<CustomToolbar backTo={backUrl} />} defaultValues={{ compraId: compraId }}>
                <Grid container spacing={2}>
                    <Grid item xs={12}>
                        <ReferenceInput source="compraId" reference="compras" perPage={300}>
                            <AutocompleteInput
                                label='Compra'
                                optionText={record => record && record.Fecha ? `${new Date(record.Fecha).toLocaleDateString()} - ${record.proveedor?.Nombre || ''}` : ''}
                                readOnly={true}
                                validate={Requerido}
                            />
                        </ReferenceInput>
                    </Grid>
                    <Grid item xs={4}>
                        <ReferenceInput label="Producto" source="productoId" reference="productos" perPage={300}>
                            <AutocompleteInput label='Producto' optionText='Nombre' validate={Requerido} />
                        </ReferenceInput>
                    </Grid>
                    <Grid item xs={4}>
                        <NumberInput source="Cantidad" label="Cantidad" />
                    </Grid>
                    <Grid item xs={4}>
                        <NumberInput source="Precio" label="Precio" />
                    </Grid>
                </Grid>
            </SimpleForm>
        </Create>
    );
};

const resource = {
    list: CompraDetalleList,
    edit: CompraDetalleEdit,
    create: CompraDetalleCreate,
};
export default resource;
