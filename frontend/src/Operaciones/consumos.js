import { Datagrid, List, TextField, Edit, NumberField, NumberInput, AutocompleteInput, SimpleForm, ReferenceInput, Create, required, FunctionField, TopToolbar, useListContext } from 'react-admin';
import { useMotel } from '../context/MotelContext';
import CustomToolbar from '../layout/CustomToolbar';
import { Button } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';

const Requerido = [required()];

const ConsumoListActions = () => {
    const location = useLocation();
    const navigate = useNavigate();

    const params = new URLSearchParams(location.search);
    let turnoid = null;
    try {
        const f = JSON.parse(params.get('filter') || '{}');
        turnoid = f['turnoId'] || null;
    } catch (_) {}

    if (!turnoid) return null;

    return (
        <TopToolbar>
            <Button
                size="small"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/turnos')}
            >
                Volver al Turno
            </Button>
        </TopToolbar>
    );
};

const ConsumoList = () => {
    const { currentMotelId: motelId } = useMotel();
    const filter = motelId ? { motelId: motelId } : {};

    return (
        <List actions={<ConsumoListActions />} sort={{ field: 'id', order: 'DESC' }} filter={filter} sx={{ '& .RaList-main': { marginTop: 2 } }}>
            <Datagrid rowClick="edit" sx={{
                '& .RaDatagrid-rowCell': { padding: '16px 8px' },
                '& .MuiTableCell-head': { fontWeight: 700, color: 'text.secondary' }
            }}>
                <TextField label="Producto" source="producto.Nombre" sx={{ fontWeight: 500 }} />
                <NumberField source="Cantidad" />
                <NumberField source="Monto" options={{ style: 'currency', currency: 'ARS' }} />
                <NumberField source="Importe" options={{ style: 'currency', currency: 'ARS' }} sx={{ fontWeight: 600, color: 'primary.main' }} />
                <FunctionField label="Turno" render={record => {
                    const ident = record.turno?.habitacion?.Identificador || '';
                    const hora = record.turno?.Salida ? new Date(record.turno.Salida).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                    return hora ? `${ident} - ${hora}` : ident;
                }} />
            </Datagrid>
        </List>
    );
};
const inputText = choice => choice?.habitacion?.Identificador || '';

export const ConsumoCreate = () => {
    const transform = async (data) => {
        const { habitacion, ...rest } = data;
        return rest;
    };

    return (
        <Create redirect="/turnos" transform={transform}>
            <SimpleForm toolbar={<CustomToolbar backTo="/turnos" />}>
                <ReferenceInput source="turnoId" reference="turnos" perPage={300}>
                    <AutocompleteInput
                        label='Habitacion'
                        readOnly={true}
                        inputText={inputText}
                        validate={Requerido}
                    />
                </ReferenceInput>
                <ReferenceInput
                    source="productoId"
                    reference="productos"
                    filter={{ Facturable: true }}
                >
                    <AutocompleteInput label='Producto' optionText='Nombre' validate={Requerido} />
                </ReferenceInput>
                <NumberInput source="Cantidad" defaultValue={1} />
            </SimpleForm>
        </Create>
    );
};

export const ConsumoEdit = () => (
    <Edit>
        <SimpleForm toolbar={<CustomToolbar backTo="/consumos" />}>
            <ReferenceInput source="productoId" reference="productos">
                <AutocompleteInput label='Producto' optionText='Nombre' />
            </ReferenceInput>
            <NumberInput source="Cantidad" />
        </SimpleForm>
    </Edit>
);
const myObject = {
    list: ConsumoList,
    edit: ConsumoEdit,
    create: ConsumoCreate
};
export default myObject;
