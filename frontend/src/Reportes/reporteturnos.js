import { List, TextField, Datagrid, NumberField, DateInput, DateField, Filter, TextInput, FunctionField } from 'react-admin';
import { useRef } from 'react';
import { useMotel } from '../context/MotelContext';

const FiltroIngreso = (props) => (
    <Filter {...props}>
      <DateInput label="Salida Desde" source="r_Salida_desde" alwaysOn />
      <DateInput label="Salida Hasta" source="r_Salida_hasta" alwaysOn />
      <TextInput label="Habitación" source="habitacion.Identificador" />
    </Filter>
);

const ReportTurnos = () => {
    const { availableMoteles } = useMotel();
    const horaCierre = availableMoteles?.[0]?.HoraCierreCaja || '00:00';

    const container = useRef(null);
    const maxWidth = container.current ? container.current.clientWidth : 0;

    return (
        <div ref={container}>
          <List 
            resource='turnos' 
            hasCreate={false} 
            filters={<FiltroIngreso />} 
            filter={{ hora_cierre: horaCierre }}
            filterDefaultValues={{ mostrar_cerrados: true, r_Salida_desde: new Date().toISOString().split('T')[0], r_Salida_hasta: new Date().toISOString().split('T')[0] }}
            sort={{ field: 'id', order: 'DESC' }}
            style={{ minWidth: maxWidth * 0.8 }}
          >
            <Datagrid optimized bulkActionButtons={false}>
              <TextField label="Habitacion" source="habitacion.Identificador" />
              <TextField label="Cliente" source="cliente.Patente" />
              <FunctionField 
                label="Tarifa" 
                render={(record) => {
                    const t = record.tarifa || record.habitacion?.tarifa;
                    return t ? `${t.Nombre} ($${t.Precio || record.Precio})` : '-';
                }} 
                sortable={false} 
              />
              <DateField source="Ingreso" showTime showDate={true} options={{ year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }} />
              <FunctionField 
                label="Estadía" 
                render={(record) => {
                    if (!record.Salida || !record.Ingreso) return '-';
                    const start = new Date(record.Ingreso);
                    const end = new Date(record.Salida);
                    const diff = Math.floor((end - start) / (1000 * 60)); // Minutes
                    if (diff < 0) return 'Error';
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                }} 
              />
              <NumberField source="Precio" label="P. Turno" />
              <NumberField source="Total" />
              <TextField source="Observacion" />
              <TextField source="ObservacionSecundaria" />
            </Datagrid>
          </List>
        </div>
    );
}
export default ReportTurnos;
