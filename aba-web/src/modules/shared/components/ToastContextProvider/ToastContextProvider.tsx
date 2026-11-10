// ToastContextProvider.tsx
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide } from '@mui/material';

// ----------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------

export enum ToastType {
  Success = 'success',
  Info = 'info',
  Warning = 'warning',
  Danger = 'error', // mapped to MUI 'error'
}

export interface ToastOptions {
  /** The message to display */
  message: string;
  /** Type/severity of the toast (default: Info) */
  type?: ToastType;
  /** Duration in milliseconds before auto-hide (default: 6000) */
  autoHideDuration?: number;
  /** Whether to show the close button (default: true) */
  dismissible?: boolean;
  /** Custom anchor origin (default: { vertical: 'bottom', horizontal: 'left' }) */
  anchorOrigin?: { vertical: 'bottom' | 'top'; horizontal: 'left' | 'center' | 'right' };
}

export interface ToastContextValue {
  /** Show a toast with the given options */
  createToast: (options: ToastOptions) => void;
  /** Dismiss a specific toast by its message (or you can extend with id) */
  deleteToast: (message: string) => void;
  /** Dismiss all currently visible toasts */
  deleteAllToasts: () => void;
}

// ----------------------------------------------------------------------
// Context
// ----------------------------------------------------------------------

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// ----------------------------------------------------------------------
// Provider Component
// ----------------------------------------------------------------------

interface ToastProviderProps {
  children: ReactNode;
}

/**
 * Provides toast functionality to its children.
 * Place this provider near the root of your application.
 */
export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // We manage a single toast at a time for simplicity.
  // If you need multiple concurrent toasts, extend this to an array.
  const [open, setOpen] = useState(false);
  const [toastOptions, setToastOptions] = useState<ToastOptions>({
    message: '',
    type: ToastType.Info,
    autoHideDuration: 6000,
    dismissible: true,
    anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
  });

  const createToast = useCallback((options: ToastOptions) => {
    setToastOptions({
      message: options.message,
      type: options.type ?? ToastType.Info,
      autoHideDuration: options.autoHideDuration ?? 6000,
      dismissible: options.dismissible ?? true,
      anchorOrigin: options.anchorOrigin ?? { vertical: 'bottom', horizontal: 'left' },
    });
    setOpen(true);
  }, []);

  const deleteToast = useCallback((message: string) => {
    // If the currently displayed toast matches the message, close it
    if (toastOptions.message === message) {
      setOpen(false);
    }
  }, [toastOptions.message]);

  const deleteAllToasts = useCallback(() => {
    setOpen(false);
  }, []);

  const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    // Prevent closing on clickaway if you want to keep it open (optional)
    if (reason === 'clickaway') return;
    setOpen(false);
  };

  // Map ToastType to MUI AlertColor
  const severityMap: Record<ToastType, AlertColor> = {
    [ToastType.Success]: 'success',
    [ToastType.Info]: 'info',
    [ToastType.Warning]: 'warning',
    [ToastType.Danger]: 'error',
  };

  return (
    <ToastContext.Provider value={{ createToast, deleteToast, deleteAllToasts }}>
      {children}
      <Snackbar
        open={open}
        autoHideDuration={toastOptions.autoHideDuration}
        onClose={handleClose}
        anchorOrigin={toastOptions.anchorOrigin}
        TransitionComponent={Slide} // Slide is not deprecated; using it directly is fine.
        // Alternatively, use TransitionProps: TransitionComponent={Slide} is still acceptable.
        // To avoid the deprecation warning, you can use slots={{ transition: Slide }} but that's MUI v6.
        // For MUI v5, TransitionComponent is still valid.
      >
        <Alert
          onClose={toastOptions.dismissible ? handleClose : undefined}
          severity={severityMap[toastOptions.type!]}
          variant="filled" // optional
          sx={{ width: '100%' }}
        >
          {toastOptions.message}
        </Alert>
      </Snackbar>
    </ToastContext.Provider>
  );
};

// ----------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------

/**
 * Hook to access the toast context.
 * Must be used within a ToastProvider.
 */
export const useToastContext = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};