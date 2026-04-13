import React, { useState, useEffect } from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, NumberField, NumberInput, AutocompleteInput, SimpleForm, ReferenceInput, Create,
    required, TopToolbar, useRecordContext
} from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomToolbar from '../layout/CustomToolbar';
import { Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useMotel } from '../context/MotelContext';
import { http } from '../shared/api/HttpClient';

const InsumoDetalleListActions = () => {
    const location = useLocation();
    const navigate = useNavigate();

    let insumoId = null;
    try {
        const f = JSON.parse(new URLSearchParams(location.search).get('filter') || '{}');
        insumoId = f['insumoId'] || null;
    } catch (_) {}

    if (!insumoId) return null;

    return (
        <TopToolbar>
            <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/insumos')}
            >
                Volver al Insumo
            </Button>
        </TopToolbar>
    );
};

const InsumoDetalleList = () => (
    <List actions={<InsumoDetalleListActions />}>
        <Datagrid bulkActionButtons={false} rowClick="edit">
            <TextField label="Producto" source="producto.Nombre" />
            <NumberField source="Cantidad" />
            <EditButton />
        </Datagrid>
    </List>
);

export const InsumoDetalleEdit = () => {
    const InsumoDetalleForm = () => {
        const record = useRecordContext();
        const backTo = '/insumos';
        return (
            <SimpleForm toolbar={<CustomToolbar backTo={backTo} />}>
                <ReferenceInput source="productoId" reference="productos">
                    <AutocompleteInput label="Producto" optionText="Nombre" validate={required()} />
                </ReferenceInput>
                <NumberInput source="Cantidad" validate={required()} />
            </SimpleForm>
        );
    };

    return (
        <Edit redirect="/insumos">
            <InsumoDetalleForm />
        </Edit>
    );
};

export const InsumoDetalleCreate = () => {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const insumoId = params.get('insumo');
    const { currentMotelId: motelId } = useMotel();

    const [productos, setProductos] = useState([]);
    useEffect(() => {
        if (!motelId) return;
        http.get('/productos/con-stock-secundario', { params: { facturable: false } })
            .then(d => setProductos(d.data || []))
            .catch(() => {});
    }, [motelId]);

    return (
        <Create redirect="/insumos">
            <SimpleForm
                defaultValues={{ insumoId: insumoId }}
                toolbar={<CustomToolbar backTo="/insumos" />}
            >
                <ReferenceInput source="insumoId" reference="insumos">
                   <AutocompleteInput sx={{ display: 'none' }} />
                </ReferenceInput>
                <AutocompleteInput
                    source="productoId"
                    label="Producto"
                    choices={productos}
                    optionText="Nombre"
                    optionValue="id"
                    validate={required()}
                />
                <NumberInput source="Cantidad" validate={required()} min={1} />
            </SimpleForm>
        </Create>
    );
};

const resourceInsumoDetalles = {
    list: InsumoDetalleList,
    edit: InsumoDetalleEdit,
    create: InsumoDetalleCreate,
};

export default resourceInsumoDetalles;
