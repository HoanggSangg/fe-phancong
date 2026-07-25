import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { Alert, Box, Slide, Snackbar } from '@mui/material';

const ToastContext = createContext(null);

const MAX_TOASTS = 5;
const DEFAULT_DURATION = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
};

let toastId = 0;

function SlideTransition(props) {
  return <Slide {...props} direction="left" />;
}

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const show = useCallback((message, severity = 'info', options = {}) => {
    const text = String(message || '').trim();
    if (!text) return null;

    const id = ++toastId;
    const nextSeverity = ['success', 'info', 'warning', 'error'].includes(severity)
      ? severity
      : 'info';
    const duration = options.duration ?? DEFAULT_DURATION[nextSeverity] ?? 4000;

    setToasts((prev) => {
      const next = [...prev, { id, message: text, severity: nextSeverity, duration }];
      return next.slice(-MAX_TOASTS);
    });

    return id;
  }, []);

  const toast = useMemo(
    () => ({
      show,
      success: (message, options) => show(message, 'success', options),
      info: (message, options) => show(message, 'info', options),
      warning: (message, options) => show(message, 'warning', options),
      error: (message, options) => show(message, 'error', options),
      /** Tương thích pattern setSnackbar cũ của ManageCars */
      fromSnackbar: ({ open = true, message, severity = 'info', duration } = {}) => {
        if (open === false || !message) return null;
        return show(message, severity, { duration });
      },
    }),
    [show],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Box
        sx={{
          position: 'fixed',
          top: 16,
          right: 16,
          zIndex: (theme) => theme.zIndex.snackbar + 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: 1,
          pointerEvents: 'none',
          maxWidth: 'min(420px, calc(100vw - 32px))',
        }}
      >
        {toasts.map((item) => (
          <Snackbar
            key={item.id}
            open
            autoHideDuration={item.duration}
            onClose={(_, reason) => {
              if (reason === 'clickaway') return;
              removeToast(item.id);
            }}
            TransitionComponent={SlideTransition}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            sx={{
              position: 'static',
              transform: 'none !important',
              pointerEvents: 'auto',
            }}
          >
            <Alert
              onClose={() => removeToast(item.id)}
              severity={item.severity}
              variant="filled"
              elevation={6}
              sx={{
                width: '100%',
                alignItems: 'center',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
              }}
            >
              {item.message}
            </Alert>
          </Snackbar>
        ))}
      </Box>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx.toast;
};

export default ToastContext;
