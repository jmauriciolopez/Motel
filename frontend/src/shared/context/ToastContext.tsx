import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'warning';

interface Toast {
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
  toast: Toast | null;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<Toast | null>(null);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({ message, type });
    // Auto-hide after 5 seconds
    setTimeout(() => {
      setToast((current) => (current?.message === message ? null : current));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, toast }}>
      {children}
      {toast && (
        <div className={`global-toast global-toast--${toast.type}`}>
          <span>{toast.message}</span>
          <button
            onClick={hideToast}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              marginLeft: '10px',
              fontSize: '1.2rem',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      )}
    </ToastContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
