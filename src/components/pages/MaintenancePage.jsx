import React from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import ConstructionIcon from '@mui/icons-material/Construction';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../../context/AuthContext';

const MaintenancePage = ({ message }) => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        bgcolor: '#0f172a',
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(56,189,248,0.12), transparent 55%), radial-gradient(ellipse at bottom, rgba(248,113,113,0.1), transparent 50%)',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          textAlign: 'center',
          bgcolor: 'rgba(15, 23, 42, 0.85)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          color: '#e2e8f0',
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2,
            borderRadius: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(248, 113, 113, 0.14)',
            color: '#f87171',
          }}
        >
          <ConstructionIcon sx={{ fontSize: 34 }} />
        </Box>
        <Typography variant="h5" fontWeight={800} sx={{ mb: 1, color: '#f8fafc' }}>
          Hệ thống đang bảo trì
        </Typography>
        <Typography variant="body1" sx={{ color: '#94a3b8', mb: 3 }}>
          {message || 'Hệ thống đang bảo trì. Vui lòng quay lại sau.'}
        </Typography>
        {user && (
          <Button
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              color: '#e2e8f0',
              borderColor: 'rgba(148, 163, 184, 0.4)',
              textTransform: 'none',
              '&:hover': {
                borderColor: '#38bdf8',
                bgcolor: 'rgba(56, 189, 248, 0.08)',
              },
            }}
          >
            Đăng xuất
          </Button>
        )}
      </Paper>
    </Box>
  );
};

export default MaintenancePage;
