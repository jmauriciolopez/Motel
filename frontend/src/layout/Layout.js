import React from 'react';
import { Layout, useRefresh, useDataProvider } from 'react-admin';
import ModernAppBar from './ModernAppBar';
import ModernMenu from './ModernMenu';
import TrialGuard from '../components/TrialGuard';
import OnboardingWizard from '../components/OnboardingWizard';
import { useMotel } from '../context/MotelContext';
import { Cookies, getApiUrl } from '../helpers/Utils';

const DevResetOnboarding = React.lazy(() => import('../components/DevResetOnboarding'));

export const ModernLayout = (props) => {
    const { currentMotelId, availableMoteles, setAvailableMoteles } = useMotel();
    const refresh = useRefresh();
    const dataProvider = useDataProvider();
    const role = localStorage.getItem('role');
    const isSuperUser = role === 'SuperAdmin' || role === 'SuperUser';
    const isOwner = role === 'Administrador';
    const [shouldShow, setShouldShow] = React.useState(false);
    const [wizardDismissed, setWizardDismissed] = React.useState(false);
    const [wizardMode, setWizardMode] = React.useState('full'); // 'full' | 'tarifa-only'

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
                const token = Cookies.getCookie('token');
                const headers = {
                    'Authorization': `Bearer ${token}`,
                    'x-motel-id': currentMotelId,
                };
                const tarifasUrl = getApiUrl(`/tarifas?_page=1&_limit=1&motelId=${encodeURIComponent(currentMotelId)}`);
                const habitacionesUrl = getApiUrl(`/habitaciones?_page=1&_limit=1&motelId=${encodeURIComponent(currentMotelId)}`);

                const [tarifasRes, habitacionesRes] = await Promise.all([
                    fetch(tarifasUrl, { headers }).then(r => r.json()),
                    fetch(habitacionesUrl, { headers }).then(r => r.json()),
                ]);

                const hasTarifas = Array.isArray(tarifasRes)
                    ? tarifasRes.length > 0
                    : (tarifasRes?.data?.length ?? 0) > 0 || (tarifasRes?.total ?? 0) > 0;
                const hasHabitaciones = Array.isArray(habitacionesRes)
                    ? habitacionesRes.length > 0
                    : (habitacionesRes?.data?.length ?? 0) > 0 || (habitacionesRes?.total ?? 0) > 0;

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
