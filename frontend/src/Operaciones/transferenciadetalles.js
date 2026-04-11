import React from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, NumberField, NumberInput, AutocompleteInput, SimpleForm, ReferenceInput, Create,
    required, TopToolbar, useRecordContext
} from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomToolbar from '../layout/CustomToolbar';
import { Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const TransferenciaDetalleListActions = () => {
    const location = useLocation();
    const navigate = useNavigate();

    let transferenciaId = null;
    try {
        const f = JSON.parse(new URLSearchParams(location.search).get('filter') || '{}');
        transferenciaId = f['transferenciaId'] || null;
    } catch (_) {}

    if (!transferenciaId) return null;

    return (
        <TopToolbar>
            <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/transferencias')}
            >
                Volver a la Transferencia
            </Button>
        </TopToolbar>
    );
};

const TransferenciaDetalleList = () => (
    <List actions={<TransferenciaDetalleListActions />}>
        <Datagrid bulkActionButtons={false} rowClick="edit">
            <TextField label="Producto" source="producto.Nombre" />
            <NumberField source="Cantidad" />
            <EditButton />
        </Datagrid>
    </List>
);

export const TransferenciaDetalleEdit = () => {
    const TransferenciaDetalleForm = () => {
        const record = useRecordContext();
        return (
            <SimpleForm toolbar={<CustomToolbar backTo="/transferencias" />}>
                <ReferenceInput source="productoId" reference="productos" filter={{ 'stocks.Cantidad': { $gt: 0 } }}>
                    <AutocompleteInput label="Producto" optionText="Nombre" validate={required()} readOnly={true} />
                </ReferenceInput>
                <NumberInput source="Cantidad" validate={required()} />
            </SimpleForm>
        );
    };

    return (
        <Edit redirect="/transferencias">
            <TransferenciaDetalleForm />
        </Edit>
    );
};

export const TransferenciaDetalleCreate = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const transferenciaId = params.get('transferencia') || params.get('transferenciaId');

    return (
        <Create redirect="/transferencias">
            <SimpleForm
                defaultValues={{ transferenciaId: transferenciaId }}
                toolbar={<CustomToolbar backTo="/transferencias" />}
            >
                <ReferenceInput source="transferenciaId" reference="transferencias">
                    <AutocompleteInput sx={{ display: 'none' }} />
                </ReferenceInput>
                <ReferenceInput source="productoId" reference="productos" filter={{ 'stocks.Cantidad': { $gt: 0 } }}>
                    <AutocompleteInput label="Producto" optionText="Nombre" validate={required()} />
                </ReferenceInput>
                <NumberInput source="Cantidad" validate={required()} min={1} />
            </SimpleForm>
        </Create>
    );
};

const resourceTransferenciaDetalles = {
    list: TransferenciaDetalleList,
    edit: TransferenciaDetalleEdit,
    create: TransferenciaDetalleCreate,
};

export default resourceTransferenciaDetalles;
