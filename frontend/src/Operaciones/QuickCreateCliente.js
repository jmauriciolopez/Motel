import React, { useState } from 'react';
import {
    useCreate,
    useNotify,
    SimpleForm,
    TextInput,
    ReferenceInput,
    AutocompleteInput,
    required,
    SaveButton,
    Toolbar,
    useGetList,
    usePermissions,
} from 'react-admin';
import { useFormContext } from 'react-hook-form';
import {
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    IconButton,
    Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

const Requerido = [required()];

const QuickCreateCliente = () => {
    const { permissions } = usePermissions();
    const isAdmin = permissions === 'Administrador' || permissions === 'SuperAdmin';
    const canCreate = isAdmin || permissions === 'Supervisor' || permissions === 'Recepcionista';

    const [showDialog, setShowDialog] = useState(false);
    const [create, { isLoading }] = useCreate();
    const notify = useNotify();
    const { setValue } = useFormContext();

    const handleClick = () => setShowDialog(true);
    const handleClose = () => setShowDialog(false);

    // Buscar el ID de 'automovil' para ponerlo por defecto
    const { data: movilidads } = useGetList('movilidads', {
        filter: { Tipo: 'automovil' },
        pagination: { page: 1, perPage: 1 },
        sort: { field: 'Tipo', order: 'ASC' }
    });
    const defaultMovilidadId = movilidads?.[0]?.id || movilidads?.[0]?.id;

    const handleSubmit = async (values) => {
        create(
            'clientes',
            { data: values },
            {
                onSuccess: (data) => {
                    setShowDialog(false);
                    // Actualizar el valor del campo 'cliente' en el formulario padre
                    setValue('cliente', data.id, { shouldDirty: true, shouldValidate: true });
                    notify('Cliente creado correctamente', { type: 'info' });
                },
                onError: (error) => {
                    notify(`Error: ${error.message}`, { type: 'warning' });
                },
            }
        );
    };

    if (!canCreate) return null;

    return (
        <>
            <Tooltip title="Nuevo Cliente">
                <IconButton
                    onClick={handleClick}
                    size="small"
                    sx={{
                        ml: 1,
                        bgcolor: 'primary.light',
                        color: 'primary.contrastText',
                        '&:hover': { bgcolor: 'primary.main' }
                    }}
                >
                    <AddIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Dialog
                open={showDialog}
                onClose={handleClose}
                aria-labelledby="form-dialog-title"
                fullWidth
                maxWidth="sm"
            >
                <DialogTitle id="form-dialog-title" sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Crear Nuevo Cliente
                    <IconButton
                        aria-label="close"
                        onClick={handleClose}
                        sx={{ color: (theme) => theme.palette.grey[500] }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    <SimpleForm
                        onSubmit={handleSubmit}
                        toolbar={<Toolbar><SaveButton label="Guardar Cliente" disabled={isLoading} /></Toolbar>}
                    >
                        <Grid container spacing={2} sx={{ mt: 1 }}>
                            <Grid item xs={6}>
                                <TextInput source="Patente" label="Patente / Matrícula" validate={Requerido} fullWidth />
                                <TextInput source="Color" fullWidth />
                            </Grid>
                            <Grid item xs={6}>
                                <TextInput source="Marca" fullWidth />
                                <ReferenceInput source="movilidadId" reference="movilidads" defaultValue={defaultMovilidadId} sort={{ field: 'Tipo', order: 'ASC' }}>
                                    <AutocompleteInput label='Tipo de Movilidad' optionText='Tipo' fullWidth />
                                </ReferenceInput>
                            </Grid>
                        </Grid>
                    </SimpleForm>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="inherit">
                        Cancelar
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default QuickCreateCliente;
