import React from 'react';
import {
    Datagrid, List, TextField, Edit, EditButton, AutocompleteInput, SimpleForm, ReferenceInput, Create, DateField,
    useRecordContext, required, DateTimeInput, TextInput, TopToolbar, CreateButton,
    useNotify, useRefresh, FormDataConsumer, usePermissions, useGetList
} from 'react-admin';
import { useDeletedRowSx } from '../helpers/deletedRowSx';
import { Link } from 'react-router-dom';
import { Grid, Button, Alert } from '@mui/material';
import CustomToolbar from '../layout/CustomToolbar';
import ListAltIcon from '@mui/icons-material/ListAlt';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { http } from '../shared/api/HttpClient';
import { canManageCompras } from '../helpers/roles';

const validateTransferenciaCabecera = (values) => {
    const errors = {};
    if (values.depositoOrigenId && values.depositoDestinoId &&
        values.depositoOrigenId === values.depositoDestinoId) {
        errors.depositoDestinoId = 'El depósito origen y destino no pueden ser el mismo';
    }
    if (!values.Fecha) {
        errors.Fecha = 'Completar fecha';
    }
    return errors;
};

const DetailsButton = () => {
    const record = useRecordContext();
    if (!record) return null;
    return (
        <Button
            variant="outlined"
            color="primary"
            size="small"
            startIcon={<ListAltIcon />}
            onClick={e => e.stopPropagation()}
            component={Link}
            title="Ver detalles"
            to={{
                pathname: '/transferenciadetalles',
                search: `?filter=${JSON.stringify({ "transferenciaId": record.id })}`
            }}
        >
            Detalles
        </Button>
    );
};

const AddDetailButton = () => {
    const { permissions } = usePermissions();
    const isSupervisor = canManageCompras(permissions);
    const record = useRecordContext();
    if (!record || record.Finalizada || !isSupervisor) return null;
    return (
        <Button
            variant="contained"
            color="success"
            size="small"
            startIcon={<AddCircleOutlineIcon />}
            onClick={e => e.stopPropagation()}
            title="Cargar productos"
            component={Link}
            to={{
                pathname: '/transferenciadetalles/create',
                search: `?transferenciaId=${record.id}`
            }}
        >
            Cargar
        </Button>
    );
};

const FinalizarButton = () => {
    const record = useRecordContext();
    const notify = useNotify();
    const refresh = useRefresh();

    if (!record) return null;
    if (record.Finalizada) return (
        <CheckCircleIcon color="success" titleAccess="Confirmada" sx={{ verticalAlign: 'middle' }} />
    );

    return (
        <Button
            variant="outlined"
            color="warning"
            size="small"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={async e => {
                e.stopPropagation();
                try {
                    await http.post(`/transferencias/${record.id}/confirmar`);
                    notify('Transferencia confirmada', { type: 'success' });
                    refresh();
                } catch (err) {
                    notify(err?.message || 'Error al confirmar', { type: 'error' });
                }
            }}
        >
            Confirmar
        </Button>
    );
};

const TransferenciaListActions = () => {
    const { permissions } = usePermissions();
    const isSupervisor = canManageCompras(permissions);

    return (
        <TopToolbar>
            {isSupervisor && <CreateButton />}
        </TopToolbar>
    );
};

const TransferenciaList = () => {
    const deletedRowSx = useDeletedRowSx();
    return (
        <List
            resource="transferencias"
            actions={<TransferenciaListActions />}
            sort={{ field: 'Fecha', order: 'DESC' }}
            sx={{ '& .RaList-main': { marginTop: 2 } }}
        >
            <Datagrid bulkActionButtons={false} rowClick={false} rowSx={deletedRowSx}>
                <DetailsButton />
                <AddDetailButton />
                <DateField
                    source="Fecha"
                    label="Fecha"
                    showTime
                    options={{ day: '2-digit', month: '2-digit', year: 'numeric', hour12: true, hour: '2-digit', minute: '2-digit' }}
                />
                <TextField label="Origen" source="depositoOrigen.Nombre" />
                <TextField label="Destino" source="depositoDestino.Nombre" />
                <TextField label="Observación" source="Observacion" />
                <TextField label="Personal" source="usuario.Username" />
                <FinalizarButton />
                <EditButtonWrapper />
            </Datagrid>
        </List>
    );
};

const EditButtonWrapper = () => {
    const { permissions } = usePermissions();
    const record = useRecordContext();
    const isSupervisor = canManageCompras(permissions);
    if (!isSupervisor || record?.Finalizada) return null;
    return <EditButton />;
};

const TransferenciaEditForm = () => {
    const record = useRecordContext();
    if (record?.Finalizada) {
        return (
            <Alert severity="info" sx={{ m: 1 }}>
                Esta transferencia está confirmada y no puede editarse.
            </Alert>
        );
    }
    return (
        <SimpleForm toolbar={<CustomToolbar backTo="/transferencias" />} validate={validateTransferenciaCabecera}>
            <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                    <DateTimeInput source="Fecha" label="Fecha" validate={required()} />
                    <ReferenceInput source="depositoOrigenId" reference="depositos" sort={{ field: 'Nombre', order: 'ASC' }}>
                        <AutocompleteInput label="Depósito origen" optionText="Nombre" validate={required()} />
                    </ReferenceInput>
                    <ReferenceInput source="depositoDestinoId" reference="depositos" sort={{ field: 'Nombre', order: 'ASC' }}>
                        <AutocompleteInput label="Depósito destino" optionText="Nombre" validate={required()} />
                    </ReferenceInput>
                </Grid>
                <Grid item xs={12} md={6}>
                    <TextInput source="Observacion" label="Observación" multiline fullWidth />
                </Grid>
                <Grid item xs={12}>
                    <FormDataConsumer>
                        {({ formData }) =>
                            formData.depositoOrigenId &&
                            formData.depositoDestinoId &&
                            formData.depositoOrigenId === formData.depositoDestinoId ? (
                                <Alert severity="error">
                                    El depósito origen y destino no pueden ser el mismo.
                                </Alert>
                            ) : null
                        }
                    </FormDataConsumer>
                </Grid>
            </Grid>
        </SimpleForm>
    );
};

export const TransferenciaEdit = () => (
    <Edit mutationMode="pessimistic">
        <TransferenciaEditForm />
    </Edit>
);

export const TransferenciaCreate = () => {
    const { data: depositos } = useGetList('depositos', {
        pagination: { page: 1, perPage: 100 },
        sort: { field: 'Nombre', order: 'ASC' },
    });

    const defaultValues = React.useMemo(() => {
        const base = { Fecha: new Date(), Finalizada: false };
        if (!depositos?.length) return base;
        base.depositoOrigenId = depositos[0].id;
        base.depositoDestinoId = depositos.length > 1 ? depositos[1].id : depositos[0].id;
        return base;
    }, [depositos]);

    return (
        <Create
            redirect={(resource, id) => `/transferenciadetalles/create?transferenciaId=${id}`}
            sx={{ mt: 2 }}
            transform={(data) => {
                const {
                    depositoOrigen,
                    depositoDestino,
                    usuario,
                    motel,
                    detalles,
                    ...clean
                } = data;
                const f = clean.Fecha;
                const fecha =
                    f instanceof Date ? f.toISOString() : typeof f === 'string' ? f : new Date(f).toISOString();
                return {
                    fecha,
                    observacion: clean.Observacion,
                    finalizada: false,
                    depositoOrigenId: clean.depositoOrigenId,
                    depositoDestinoId: clean.depositoDestinoId,
                    detalles: [],
                };
            }}
        >
            <SimpleForm
                defaultValues={defaultValues}
                toolbar={<CustomToolbar backTo="/transferencias" />}
                validate={validateTransferenciaCabecera}
            >
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <DateTimeInput source="Fecha" label="Fecha" validate={required()} fullWidth />
                        <ReferenceInput source="depositoOrigenId" reference="depositos" sort={{ field: 'Nombre', order: 'ASC' }}>
                            <AutocompleteInput label="Depósito origen" optionText="Nombre" validate={required()} fullWidth />
                        </ReferenceInput>
                        <ReferenceInput source="depositoDestinoId" reference="depositos" sort={{ field: 'Nombre', order: 'ASC' }}>
                            <AutocompleteInput label="Depósito destino" optionText="Nombre" validate={required()} fullWidth />
                        </ReferenceInput>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TextInput source="Observacion" label="Observación" multiline fullWidth rows={3} />
                    </Grid>
                    <Grid item xs={12}>
                        <FormDataConsumer>
                            {({ formData }) =>
                                formData.depositoOrigenId &&
                                formData.depositoDestinoId &&
                                formData.depositoOrigenId === formData.depositoDestinoId ? (
                                    <Alert severity="error">
                                        El depósito origen y destino no pueden ser el mismo.
                                    </Alert>
                                ) : null
                            }
                        </FormDataConsumer>
                    </Grid>
                </Grid>
            </SimpleForm>
        </Create>
    );
};

const resourceTransferencias = {
    list: TransferenciaList,
    edit: TransferenciaEdit,
    create: TransferenciaCreate,
};

export default resourceTransferencias;
