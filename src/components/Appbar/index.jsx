import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Divider,
  Typography,
  useTheme,
  useMediaQuery,
  GlobalStyles,
  Button,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavGroupsForUser, ROLE_LABELS } from '../../utils/permissions';

const AppBarComponent = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const navGroups = getNavGroupsForUser(user);

  const handleNavigate = (path) => {
    navigate(path);
    setOpenDrawer(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    setOpenDrawer(false);
  };

  return (
    <>
      <GlobalStyles
        styles={{
          '@keyframes marquee': {
            '0%': { transform: 'translateX(100%)' },
            '100%': { transform: 'translateX(-100%)' },
          },
        }}
      />

      <AppBar
        position="fixed"
        sx={{
          backgroundColor: '#b71c1c',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between', position: 'relative', minHeight: '64px' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              component="img"
              src="https://res.cloudinary.com/drbjrsm0s/image/upload/v1745463450/logo_ulbaie.png"
              alt="Bá Thành Logo"
              sx={{ height: 40, width: 80, cursor: 'pointer' }}
              onClick={() => navigate('/cars')}
            />
          </Box>

          {!isMobile && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  animation: 'marquee 10s linear infinite',
                  backgroundColor: '#ffeb3b',
                  color: '#000',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  fontWeight: 500,
                  fontSize: '1.5rem',
                }}
              >
                🚨 <strong>THÔNG BÁO:</strong> PHẦN MỀM ĐÃ TRỞ LẠI 🚗🛠️
              </Typography>
            </Box>
          )}

          <IconButton edge="end" color="inherit" aria-label="menu" onClick={() => setOpenDrawer((prev) => !prev)}>
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Toolbar sx={{ minHeight: isMobile ? '85px' : '64px' }} />

      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            backgroundColor: '#ffeb3b',
            overflow: 'hidden',
            py: 0.5,
            zIndex: theme.zIndex.drawer + 1,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              whiteSpace: 'nowrap',
              display: 'inline-block',
              animation: 'marquee 10s linear infinite',
              color: '#000',
              px: 2,
              fontWeight: 500,
              fontSize: '1rem',
            }}
          >
            🚨 <strong>THÔNG BÁO:</strong> Phần mềm đã quay trở lại 🚗🛠️
          </Typography>
        </Box>
      )}

      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        PaperProps={{
          sx: {
            width: { xs: '85vw', sm: 280 },
            height: 'calc(100% - 64px)',
            top: '64px',
          },
        }}
      >
        <Box sx={{ width: '100%', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          {user && (
            <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
              <Typography fontWeight="bold">{user.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">{ROLE_LABELS[user.role]}</Typography>
            </Box>
          )}

          <Box sx={{ flex: 1 }}>
            {navGroups.map((group) => (
              <List
                key={group.title}
                dense
                subheader={
                  <ListSubheader
                    sx={{
                      bgcolor: '#fff',
                      color: '#b71c1c',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      lineHeight: '32px',
                    }}
                  >
                    {group.title}
                  </ListSubheader>
                }
              >
                {group.items.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton onClick={() => handleNavigate(item.path)} sx={{ py: 0.8, pl: 3 }}>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.92rem' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ))}
          </Box>

          <Divider />
          <Box sx={{ p: 2 }}>
            <Button fullWidth variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleLogout}>
              Đăng xuất
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default AppBarComponent;
