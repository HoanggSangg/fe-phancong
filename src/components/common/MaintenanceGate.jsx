import React, { useCallback, useEffect, useState } from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { getSystemStatus } from '../apis';
import { useAuth } from '../../context/AuthContext';
import { canAccessAdminArea } from '../../utils/permissions';
import MaintenancePage from '../pages/MaintenancePage';

const POLL_MS = 30_000;
const AUTH_PATHS = new Set(['/login', '/register']);

/**
 * Khi backend bật bảo trì: chặn mọi user không phải admin.
 * Admin vẫn vào được app (và trang Cài đặt để mở lại web).
 * /login và /register vẫn mở để admin đăng nhập khi đang bảo trì.
 */
const MaintenanceGate = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [message, setMessage] = useState('');

  const checkStatus = useCallback(async () => {
    try {
      const res = await getSystemStatus();
      setMaintenanceMode(Boolean(res.data?.maintenanceMode));
      setMessage(res.data?.maintenanceMessage || '');
    } catch {
      // Không chặn app nếu status check lỗi (backend tạm down)
      setMaintenanceMode(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
    const id = setInterval(checkStatus, POLL_MS);
    return () => clearInterval(id);
  }, [checkStatus]);

  if (authLoading || checking) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const onAuthPage = AUTH_PATHS.has(location.pathname);
  if (maintenanceMode && !canAccessAdminArea(user) && !onAuthPage) {
    return <MaintenancePage message={message} />;
  }

  return children;
};

export default MaintenanceGate;
