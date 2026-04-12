import React, { createContext, useContext, useState, useEffect } from 'react';

export const MotelContext = createContext();

export const MotelProvider = ({ children }) => {
    const [currentMotelId, setCurrentMotelId] = useState(() => {
        return localStorage.getItem('motelId') || null;
    });

    const [availableMoteles, setAvailableMoteles] = useState(() => {
        const saved = localStorage.getItem('moteles');
        try {
            const list = saved ? JSON.parse(saved) : [];
            // Normalizar y filtrar moteles válidos
            return list.filter(m => (m.Nombre || m.nombre));
        } catch (e) {
            return [];
        }
    });

    // Sincronizar desde localStorage cuando el token cambia o en el montaje
    useEffect(() => {
        const syncFromStorage = () => {
            const saved = localStorage.getItem('moteles');
            try {
                const list = saved ? JSON.parse(saved) : [];
                const filtered = list.filter(m => (m.Nombre || m.nombre));
                setAvailableMoteles(filtered);
                
                const savedId = localStorage.getItem('motelId');
                if (savedId) {
                    setCurrentMotelId(savedId);
                } else if (filtered.length > 0) {
                    const firstId = filtered[0].id || filtered[0].motelId;
                    setCurrentMotelId(firstId);
                    localStorage.setItem('motelId', firstId);
                }
            } catch (e) {}
        };

        window.addEventListener('storage', syncFromStorage);
        syncFromStorage();
        return () => window.removeEventListener('storage', syncFromStorage);
    }, []);

    // Persistir cambios de motelId
    useEffect(() => {
        if (currentMotelId) {
            localStorage.setItem('motelId', currentMotelId);
        }
    }, [currentMotelId]);

    // Persistir cambios de la lista de moteles
    useEffect(() => {
        if (availableMoteles && availableMoteles.length > 0) {
            localStorage.setItem('moteles', JSON.stringify(availableMoteles));
        }
    }, [availableMoteles]);

    const changeMotel = (id) => {
        setCurrentMotelId(id);
        localStorage.setItem('motelId', id);
        // Forzar recarga para que el dataProvider y HttpClient usen el nuevo x-motel-id
       // window.location.reload();
       window.dispatchEvent(new CustomEvent('motel-changed', { detail: { motelId: id } }));
    };

    const contextValue = React.useMemo(() => ({
        currentMotelId,
        availableMoteles,
        changeMotel,
        setAvailableMoteles,
        setCurrentMotelId
    }), [currentMotelId, availableMoteles]);

    return (
        <MotelContext.Provider value={contextValue}>
            {children}
        </MotelContext.Provider>
    );
};

export const useMotel = () => {
    const context = useContext(MotelContext);
    if (!context) {
        throw new Error('useMotel debe usarse dentro de un MotelProvider');
    }
    return context;
};
