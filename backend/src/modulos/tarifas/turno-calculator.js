'use strict';

/**
 * Utility for calculating turno-related values (durations, prices, extras).
 */

const calculateInitialValues = (habitacion, customIngreso = null, tipoEstancia = null) => {
    const { motel, tarifa } = habitacion;
    const date = customIngreso ? new Date(customIngreso) : new Date();
    const hours = date.getHours();

    // Función auxiliar para obtener la hora local de un campo datetime de Strapi
    const getHour = (d) => new Date(d).getHours();
    const getMin = (d) => new Date(d).getMinutes();

    const iniciodia = getHour(motel.InicioDia);
    const inicionoche = getHour(motel.InicioNoche);

    // Determinar si es horario de día o noche para la duración
    let isDayTime;
    if (tipoEstancia === 'Pernocte') {
        isDayTime = false; 
    } else if (tipoEstancia === 'Standard') {
        isDayTime = true;
    } else {
        if (motel.HorarioUnico) {
            isDayTime = true;
        } else {
            if (inicionoche > iniciodia) {
                isDayTime = hours >= iniciodia && hours < inicionoche;
            } else {
                isDayTime = hours >= iniciodia || hours < inicionoche;
            }
        }
    }

    // Duración base según el horario de inicio (4h día, 2h noche en el ejemplo)
    let totalMinutes;
    let basePrice;

    if (tipoEstancia === 'Pernocte') {
        const checkOutH = getHour(motel.CheckOutDia);
        const checkOutM = getMin(motel.CheckOutDia);

        const limitDate = new Date(date);
        limitDate.setHours(checkOutH, checkOutM, 0, 0);

        if (limitDate < date) {
            limitDate.setDate(limitDate.getDate() + 1);
        }

        totalMinutes = Math.floor((limitDate.getTime() - date.getTime()) / 60000);
        basePrice = tarifa.PrecioDiario || tarifa.PrecioTurno;
    } else {
        const baseDuration = isDayTime ? motel.DuracionDiaria : motel.DuracionNocturna;
        totalMinutes = baseDuration * 60;
        basePrice = isDayTime ? (tarifa.PrecioTurnoPromocional || tarifa.PrecioTurno) : tarifa.PrecioTurno;

        if (isDayTime) {
            const checkOutH = getHour(motel.CheckOutDia);
            const checkOutM = getMin(motel.CheckOutDia);

            const limitDate = new Date(date);
            limitDate.setHours(checkOutH, checkOutM, 0, 0);

            if (limitDate < date) {
                limitDate.setDate(limitDate.getDate() + 1);
            }

            const minutesUntilLimit = Math.floor((limitDate.getTime() - date.getTime()) / 60000);

            if (minutesUntilLimit < totalMinutes) {
                totalMinutes = minutesUntilLimit;
            }
        }
    }

    return {
        Minutos: totalMinutes,
        Precio: basePrice,
        PrecioCalculo: basePrice,
        Total: basePrice,
        Activo: true
    };
};

const calculateClosingValues = (elturno, habitacion) => {
    const { motel, tarifa } = habitacion;
    const salida = new Date();
    const hours = salida.getHours();

    const getHour = (d) => new Date(d).getHours();
    const iniciodia = getHour(motel.InicioDia);
    const inicionoche = getHour(motel.InicioNoche);

    let isDayTime;
    if (motel.HorarioUnico) {
        isDayTime = true;
    } else {
        if (inicionoche > iniciodia) {
            isDayTime = hours >= iniciodia && hours < inicionoche;
        } else {
            isDayTime = hours >= iniciodia || hours < inicionoche;
        }
    }

    const permanencia = salida.getTime() - new Date(elturno.Ingreso).getTime();
    const minutosPermanencia = Math.floor(permanencia / 60000);
    const demora = minutosPermanencia - elturno.Minutos;
    const tolerancia = motel.Tolerancia || 0;
    const maxdemora = (motel.MaxHrAdicional || 0) * 60;

    let extra = 0;
    let newPrecioCalculo = elturno.PrecioCalculo;
    let newTotal = elturno.Total;

    // Solo cobrar extra si la demora supera la tolerancia
    if (demora > tolerancia) {
        if (maxdemora > 0 && demora > maxdemora) {
            // Excede el máximo de horas adicionales permitidas -> Pasa a precio Diario/Full
            newPrecioCalculo = tarifa.PrecioDiario || tarifa.PrecioTurno;
            newTotal = elturno.Total - elturno.PrecioCalculo + newPrecioCalculo;
        } else {
            // Cobro por Hora Completa (Cualquier fracción de hora cuenta como hora íntegra)
            const hourlyRate = isDayTime ? tarifa.PrecioHrDiaExcede : (tarifa.PrecioHrNocheExcede || tarifa.PrecioHrDiaExcede);
            
            const cantHorasExtra = Math.ceil(demora / 60);
            extra = hourlyRate * cantHorasExtra;

            newPrecioCalculo = elturno.PrecioCalculo + extra;
            newTotal = elturno.Total + extra;
        }
    }

    return {
        Salida: salida,
        PrecioCalculo: newPrecioCalculo,
        Total: newTotal
    };
};

module.exports = {
    calculateInitialValues,
    calculateClosingValues
};
