import React, { useState, useEffect } from 'react';
import {
    Datagrid, List, TextField, TextInput, Edit, EditButton, NumberField, NumberInput, AutocompleteInput, SimpleForm, ReferenceInput, Create,
    required, TopToolbar, useRecordContext, useGetOne, useGetList, FormDataConsumer, Toolbar, Button as RaButton, useRedirect
} from 'react-admin';
import { useLocation, useNavigate } from 'react-router-dom';
import CustomToolbar from '../layout/CustomToolbar';
import { Button, Typography } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { http } from '../shared/api/HttpClient';
import { useMotel } from '../context/MotelContext';

const StockDisponibleEnOrigen = ({ transferenciaId, productoId }) => {
    const { data: tr, isPending: loadingT } = useGetOne(
        'transferencias',
        { id: transferenciaId },
        { enabled: Boolean(transferenciaId) },
    );
    const originId = tr?.depositoOrigenId;
    const { data: stocks, isPending: loadingS } = useGetList(
        'stocks',
        {
            pagination: { page: 1, perPage: 25 },
            filter: originId && productoId ? { productoId, depositoId: originId } : {},
        },
        { enabled: Boolean(originId && productoId) },
    );

    if (!transferenciaId || !productoId) return null;
    if (loadingT || loadingS) {
        return (
            <Typography variant="body2" color="text.secondary">
                Consultando stock en origen…
            </Typography>
        );
    }
    const row = stocks?.[0];
    const n = row != null ? Number(row.Cantidad ?? row.cantidad ?? 0) : 0;
    return (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Stock disponible en origen: <strong>{n}</strong>
        </Typography>
    );
};

const TransferenciaDetalleListActions = () => {
    const location = useLocation();
    const navigate = useNavigate();

    let transferenciaId = null;
    try {
        const f = JSON.parse(new URLSearchParams(location.search).get('filter') || '{}');
        transferenciaId = f['transferenciaId'] || null;
    } catch (_) { }

    if (!transferenciaId) return null;

    return (
        <TopToolbar>
            <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/transferencias')}
            >
                Volver a la transferencia
            </Button>
        </TopToolbar>
    );
};

const DetalleEditButton = () => {
    const record = useRecordContext();
    if (record?.transferencia?.Finalizada) return null;
    return <EditButton />;
};

const TransferenciaDetalleList = () => (
    <List actions={<TransferenciaDetalleListActions />}>
        <Datagrid bulkActionButtons={false} rowClick="edit">
            <TextField label="Producto" source="producto.Nombre" />
            <NumberField source="Cantidad" />
            <DetalleEditButton />
        </Datagrid>
    </List>
);

export const TransferenciaDetalleEdit = () => {
    const TransferenciaDetalleForm = () => {
        const record = useRecordContext();
        const locked = record?.transferencia?.Finalizada;
        if (locked) {
            const BackToolbar = () => {
                const redirect = useRedirect();
                return (
                    <Toolbar>
                        <RaButton
                            label="Volver"
                            onClick={() => redirect('/transferencias')}
                            startIcon={<ArrowBackIcon />}
                        />
                    </Toolbar>
                );
            };
            return (
                <SimpleForm toolbar={<BackToolbar />}>
                    <Typography color="text.secondary" sx={{ m: 1 }}>
                        Esta transferencia ya está confirmada; no se pueden editar los ítems.
                    </Typography>
                    <TextInput source="id" sx={{ display: 'none' }} />
                </SimpleForm>
            );
        }
        return (
            <SimpleForm toolbar={<CustomToolbar backTo="/transferencias" />}>
                <ReferenceInput source="productoId" reference="productos">
                    <AutocompleteInput label="Producto" optionText="Nombre" validate={required()} readOnly />
                </ReferenceInput>
                <NumberInput source="Cantidad" validate={required()} min={1} />
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
    const transferenciaId = params.get('transferenciaId') || params.get('transferencia');
    const { currentMotelId: motelId } = useMotel();

    const [productos, setProductos] = useState([]);
    useEffect(() => {
        if (!motelId) return;
        http.get('/productos/con-stock-primario')
            .then(d => setProductos(d.data || []))
            .catch(() => {});
    }, [motelId]);

    return (
        <Create
            redirect="/transferencias"
            transform={(data) => {
                const { producto, transferencia, ...clean } = data;
                return {
                    transferenciaId: clean.transferenciaId,
                    productoId: clean.productoId,
                    cantidad: Number(clean.Cantidad ?? clean.cantidad),
                };
            }}
        >
            <SimpleForm
                defaultValues={{ transferenciaId }}
                toolbar={<CustomToolbar backTo="/transferencias" />}
            >
                <ReferenceInput source="transferenciaId" reference="transferencias">
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
                <FormDataConsumer>
                    {({ formData }) => (
                        <StockDisponibleEnOrigen
                            transferenciaId={formData.transferenciaId}
                            productoId={formData.productoId}
                        />
                    )}
                </FormDataConsumer>
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
