import React, { createContext, useContext, useState } from 'react';
import { Snackbar, Alert } from '@mui/material';

const SnackbarContext = createContext();

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export const SnackbarProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success', 'error', 'warning', 'info'
    duration: 6000,
  });

  const showSnackbar = (message, severity = 'info', duration = 6000) => {
    setSnackbar({
      open: true,
      message,
      severity,
      duration,
    });
  };

  const hideSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const value = {
    showSnackbar,
    hideSnackbar,
    // Convenience methods
    showSuccess: (message, duration) => showSnackbar(message, 'success', duration),
    showError: (message, duration) => showSnackbar(message, 'error', duration),
    showWarning: (message, duration) => showSnackbar(message, 'warning', duration),
    showInfo: (message, duration) => showSnackbar(message, 'info', duration),
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.duration}
        onClose={hideSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        sx={{
          '& .MuiSnackbar-root': {
            top: '80px !important',
          }
        }}
      >
        <Alert
          onClose={hideSnackbar}
          severity={snackbar.severity}
          variant="filled"
          sx={{
            width: '100%',
            borderRadius: '8px',
            fontWeight: 500,
            '& .MuiAlert-icon': {
              fontSize: '20px',
            },
            '& .MuiAlert-message': {
              fontSize: '14px',
            },
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
};
