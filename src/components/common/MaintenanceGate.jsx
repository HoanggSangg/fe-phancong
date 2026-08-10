import React from 'react';
import { Box, CircularProgress } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessAdminArea } from '../../utils/permissions';
import useSystemStatus from '../../hooks/queries/useSystemStatus';
import MaintenancePage from '../pages/MaintenancePage';

const AUTH_PATHS = new Set(['/login', '/register', '/upload-image']);

/**
 * Khi backend bật bảo trì: chặn mọi user không phải admin.
 * Dùng useSystemStatus chung với NoticeListener (dedupe poll).
 * Không chặn paint nếu status lỗi / chưa có — chỉ chặn khi chắc chắn đang bảo trì.
 */
const MaintenanceGate = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const location = useLocation();
  const { data, isLoading, isError } = useSystemStatus({ refetchInterval: 30_000 });

  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // Lần đầu chưa có data: chờ ngắn; lỗi status thì cho vào app
  if (isLoading && !data && !isError) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const maintenanceMode = Boolean(data?.maintenanceMode);
  const message = data?.maintenanceMessage || '';
  const onAuthPage = AUTH_PATHS.has(location.pathname);

  if (maintenanceMode && !canAccessAdminArea(user) && !onAuthPage) {
    return <MaintenancePage message={message} />;
  }

  return children;
};

export default MaintenanceGate;
