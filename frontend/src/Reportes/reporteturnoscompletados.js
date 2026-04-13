import { List, TextField, Datagrid, NumberField, DateInput, DateField, Filter, FunctionField } from 'react-admin';
import { useRef } from 'react';
import { useMotel } from '../context/MotelContext';

const FiltroReporte = (props) => (
    <Filter {...props}>
      <DateInput label="Fecha Desde" source="fechaDesde" alwaysOn />
      <DateInput label="Fecha Hasta" source="fechaHasta" alwaysOn />
    </Filter>
);

const ReporteTurnosCompletados = () => {
    const { availableMoteles, currentMotelId } = useMotel();
    const horaCierre = availableMoteles?.[0]?.HoraCierreCaja || '06:00';

    const container = useRef(null);
    const maxWidth = container.current ? container.current.clientWidth : 0;

    const hoy = new Date().toISOString().split('T')[0];

    return (
        <div ref={container}>
          <List 
            resource='turnos/reporte-completados' 
            hasCreate={false} 
            filters={<FiltroReporte />} 
            filter={{ horaCierre, motelId: currentMotelId }}
            filterDefaultValues={{ fechaDesde: hoy, fechaHasta: hoy }}
            sort={{ field: 'Salida', order: 'DESC' }}
            style={{ minWidth: maxWidth * 0.8 }}
          >
            <Datagrid optimized bulkActionButtons={false}>
              <TextField label="Habitacion" source="habitacion.Identificador" />
              <TextField label="Cliente" source="cliente.Patente" />
              <FunctionField 
                label="Tarifa" 
                render={(record) => {
                    const t = record.tarifa || record.habitacion?.tarifa;
                    return t ? `${t.Nombre} (${t.Precio || record.Precio})` : '-';
                }} 
                sortable={false} 
              />
              <DateField source="Ingreso" showTime showDate={true} options={{ year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }} />
              <DateField source="Salida" showTime showDate={true} options={{ year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }} />
              <FunctionField 
                label="Estadía" 
                render={(record) => {
                    if (!record.Salida || !record.Ingreso) return '-';
                    const start = new Date(record.Ingreso);
                    const end = new Date(record.Salida);
                    const diff = Math.floor((end - start) / (1000 * 60));
                    if (diff < 0) return 'Error';
                    const h = Math.floor(diff / 60);
                    const m = diff % 60;
                    return h > 0 ? `${h}h ${m}m` : `${m}m`;
                }} 
              />
              <NumberField source="Precio" label="P. Turno" />
              <FunctionField 
                label="Consumos" 
                render={(record) => {
                    if (!record.consumos || record.consumos.length === 0) return '$0';
                    const total = record.consumos.reduce((sum, c) => sum + Number(c.Importe || 0), 0);
                    return `$${total.toFixed(2)}`;
                }} 
              />
              <NumberField source="Total" />
              <TextField label="Cerrado por" source="usuarioCierre.Username" />
              <TextField source="Observacion" />
              <TextField source="ObservacionSecundaria" />
            </Datagrid>
          </List>
        </div>
    );
}

export default ReporteTurnosCompletados;
