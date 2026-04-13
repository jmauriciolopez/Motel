import React from 'react';
import { Layout, useRefresh, useDataProvider } from 'react-admin';
import ModernAppBar from './ModernAppBar';
import ModernMenu from './ModernMenu';
import TrialGuard from '../components/TrialGuard';
import OnboardingWizard from '../components/OnboardingWizard';
import { useMotel } from '../context/MotelContext';
import { http } from '../shared/api/HttpClient';

const DevResetOnboarding = React.lazy(() => import('../components/DevResetOnboarding'));

export const ModernLayout = (props) => {
    const { currentMotelId, availableMoteles, setAvailableMoteles } = useMotel();
    const refresh = useRefresh();
    const dataProvider = useDataProvider();
    const role = sessionStorage.getItem('role');
    const isSuperUser = role === 'SuperAdmin' || role === 'SuperUser';
    const isOwner = role === 'Administrador';
    const [shouldShow, setShouldShow] = React.useState(false);
    const [wizardDismissed, setWizardDismissed] = React.useState(false);
    const [wizardMode, setWizardMode] = React.useState('full'); // 'full' | 'tarifa-only'

    React.useEffect(() => {
        const handler = () => refresh();
        window.addEventListener('motel-changed', handler);
        return () => window.removeEventListener('motel-changed', handler);
    }, [refresh]);

    // Bypassing layout for signup
    const isSignup = window.location.hash.startsWith('#/signup');
    
    const currentMotel = availableMoteles.find(m => 
        (m.id && m.id === currentMotelId) || 
        (m.id && (m.id === currentMotelId || String(m.id) === String(currentMotelId)))
    ) || availableMoteles[0]; // Fallback al primero si hay lista pero el ID no cuadra
    
    React.useEffect(() => {
        if (isSignup || isSuperUser || !isOwner || wizardDismissed) { setShouldShow(false); return; }

        // Usuario sin motel: es nuevo, mostrar wizard
        if (!currentMotelId || availableMoteles.length === 0) {
            setShouldShow(true);
            return;
        }

        const onboardingListo =
            currentMotel?.OnboardingCompleto === true ||
            currentMotel?.Onboardingcompleto === true ||
            currentMotel?.Onboarding_Completed === true ||
            currentMotel?.onboardingCompleto === true;

        if (onboardingListo) {
            setShouldShow(false);
            return;
        }

        // Motel existe pero Onboarding_Completed es false: verificar si ya tiene datos
        const checkBypass = async () => {
            try {
                const [tarifasData, habitacionesData] = await Promise.all([
                    http.get(`/tarifas`, { params: { _page: 1, _limit: 1, motelId: currentMotelId } }),
                    http.get(`/habitaciones`, { params: { _page: 1, _limit: 1, motelId: currentMotelId } }),
                ]);

                const hasTarifas = Array.isArray(tarifasData)
                    ? tarifasData.length > 0
                    : (tarifasData?.data?.length ?? 0) > 0 || (tarifasData?.total ?? 0) > 0;
                const hasHabitaciones = Array.isArray(habitacionesData)
                    ? habitacionesData.length > 0
                    : (habitacionesData?.data?.length ?? 0) > 0 || (habitacionesData?.total ?? 0) > 0;

                if (hasTarifas || hasHabitaciones) {
                    await dataProvider.update('moteles', { id: currentMotelId, data: { onboardingCompleto: true } });
                    setAvailableMoteles(availableMoteles.map(m =>
                        (m.id === currentMotelId || m.id === currentMotelId) ? { ...m, Onboardingcompleto: true } : m
                    ));
                    setShouldShow(false);
                } else {
                    const isExistingOwner = availableMoteles.length > 1;
                    setWizardMode(isExistingOwner ? 'tarifa-only' : 'full');
                    setShouldShow(true);
                }
            } catch (e) {
                setShouldShow(!onboardingListo);
            }
        };
        checkBypass();
    }, [currentMotelId, availableMoteles.length, currentMotel?.Onboardingcompleto, currentMotel?.Onboarding_Completed, isSuperUser, isOwner, isSignup, wizardDismissed]);

    const handleOnboardingFinish = () => {
        setWizardDismissed(true);
        setShouldShow(false);
    };

    if (isSignup) {
        return <>{props.children}</>;
    }

    return (
        <>
            <Layout 
                {...props} 
                appBar={ModernAppBar} 
                menu={ModernMenu} 
                sx={{
                    '& .RaLayout-content': {
                        padding: '24px',
                        backgroundColor: '#f8fafc',
                    }
                }}
            >
                <TrialGuard>
                    {props.children}
                </TrialGuard>
            </Layout>
            {shouldShow && <OnboardingWizard mode={wizardMode} onFinish={handleOnboardingFinish} />}
            {import.meta.env.DEV && (
                <React.Suspense fallback={null}>
                    <DevResetOnboarding />
                </React.Suspense>
            )}
        </>
    );
};
