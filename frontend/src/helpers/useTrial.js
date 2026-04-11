import { useMotel } from '../context/MotelContext';

/**
 * Devuelve info del estado trial del motel activo.
 * isTrial: true si no está pagado o el trial no expiró
 * isExpired: true si el trial venció
 * isPaid: true si está pagado
 */
export const useTrial = () => {
    const { currentMotelId, availableMoteles } = useMotel();
    const motel = availableMoteles.find(
        m => m.id === currentMotelId || m.id === currentMotelId
    );

    const isPaid = motel?.Is_Paid ?? false;
    const trialExpires = motel?.Trial_Expires_At ? new Date(motel.Trial_Expires_At) : null;
    const isExpired = trialExpires ? trialExpires < new Date() : false;
    const isTrial = !isPaid;

    return { isTrial, isExpired, isPaid, motel };
};
