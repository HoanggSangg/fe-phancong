import React, { useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DashboardIcon from '@mui/icons-material/Dashboard';
import EngineeringIcon from '@mui/icons-material/Engineering';
import GroupsIcon from '@mui/icons-material/Groups';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';
import HistoryIcon from '@mui/icons-material/History';
import MessageIcon from '@mui/icons-material/Message';
import PaymentsIcon from '@mui/icons-material/Payments';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ROLE_LABELS,
  getAdminNavGroupsForUser,
} from '../../utils/permissions';

const SIDEBAR_WIDTH = 268;

const NAV_ICONS = {
  'reports.dashboard': <DashboardIcon fontSize="small" />,
  'workers.main': <EngineeringIcon fontSize="small" />,
  'teams.manage': <GroupsIcon fontSize="small" />,
  'system.locations': <LocationOnIcon fontSize="small" />,
  'system.supervisors': <SupervisorAccountIcon fontSize="small" />,
  'system.users': <PeopleIcon fontSize="small" />,
  'system.permissions': <SecurityIcon fontSize="small" />,
  'system.audit-logs': <HistoryIcon fontSize="small" />,
  'system.ktv-messages': <MessageIcon fontSize="small" />,
  'payroll.manage': <PaymentsIcon fontSize="small" />,
  'payroll.day-work': <EventAvailableIcon fontSize="small" />,
};

const AdminSidebarContent = ({ onNavigate, selectedPath }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navGroups = getAdminNavGroupsForUser(user);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ px: 2, py: 2.25 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 1.5,
              bgcolor: 'rgba(56, 189, 248, 0.16)',
              color: '#38bdf8',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AdminPanelSettingsIcon fontSize="small" />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '0.95rem', color: '#f8fafc', lineHeight: 1.2 }}>
              Khu vực quản trị
            </Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Chỉ dành cho Admin
            </Typography>
          </Box>
        </Box>
        {user && (
          <Box
            sx={{
              px: 1.25,
              py: 1,
              borderRadius: 1.5,
              bgcolor: 'rgba(148, 163, 184, 0.12)',
            }}
          >
            <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>
              {user.fullName}
            </Typography>
            <Typography sx={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {ROLE_LABELS[user.role]}
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />

      <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
        {navGroups.map((group) => (
          <List
            key={group.title}
            dense
            subheader={
              <ListSubheader
                sx={{
                  bgcolor: 'transparent',
                  color: '#64748b',
                  fontWeight: 700,
                  fontSize: '0.68rem',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  lineHeight: '28px',
                  px: 2,
                }}
              >
                {group.title}
              </ListSubheader>
            }
          >
            {group.items.map((item) => {
              const selected = selectedPath === item.path;
              return (
                <ListItemButton
                  key={item.path}
                  selected={selected}
                  onClick={() => onNavigate(item.path)}
                  sx={navItemSx}
                >
                  <ListItemIcon sx={navIconSx}>
                    {NAV_ICONS[item.key] || <AdminPanelSettingsIcon fontSize="small" />}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontSize: '0.88rem',
                      fontWeight: selected ? 700 : 500,
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        ))}
      </Box>

      <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.16)' }} />

      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => onNavigate('/cars/manage')}
          sx={{
            color: '#e2e8f0',
            borderColor: 'rgba(148, 163, 184, 0.35)',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              borderColor: '#38bdf8',
              bgcolor: 'rgba(56, 189, 248, 0.08)',
            },
          }}
        >
          Về phân công
        </Button>
        <Button
          fullWidth
          color="inherit"
          onClick={handleLogout}
          sx={{
            color: '#94a3b8',
            textTransform: 'none',
            fontSize: '0.85rem',
            '&:hover': { color: '#f87171', bgcolor: 'rgba(248, 113, 113, 0.08)' },
          }}
        >
          Đăng xuất
        </Button>
      </Box>
    </Box>
  );
};

const navItemSx = {
  mx: 1,
  mb: 0.25,
  borderRadius: 1.5,
  color: '#cbd5e1',
  '&.Mui-selected': {
    bgcolor: 'rgba(56, 189, 248, 0.16)',
    color: '#f0f9ff',
  },
  '&.Mui-selected:hover': {
    bgcolor: 'rgba(56, 189, 248, 0.22)',
  },
  '&:hover': {
    bgcolor: 'rgba(148, 163, 184, 0.1)',
  },
};

const navIconSx = {
  minWidth: 36,
  color: 'inherit',
};

const AdminLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const selectedPath = useMemo(() => {
    const groups = getAdminNavGroupsForUser(user);
    const allPaths = groups.flatMap((g) => g.items.map((i) => i.path));
    const matched = allPaths
      .sort((a, b) => b.length - a.length)
      .find(
        (path) =>
          location.pathname === path ||
          location.pathname.startsWith(`${path}/`)
      );
    return matched || '';
  }, [location.pathname, user]);

  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const sidebar = (
    <AdminSidebarContent onNavigate={handleNavigate} selectedPath={selectedPath} />
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f1f5f9' }}>
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            bgcolor: '#0f172a',
            borderRight: '1px solid rgba(148, 163, 184, 0.12)',
            position: 'fixed',
            inset: 0,
            right: 'auto',
            zIndex: 1200,
          }}
        >
          {sidebar}
        </Box>
      )}

      <Drawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            bgcolor: '#0f172a',
            backgroundImage: 'none',
          },
        }}
      >
        {sidebar}
      </Drawer>

      <Box
        sx={{
          flexGrow: 1,
          width: { xs: '100%', md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          ml: { md: `${SIDEBAR_WIDTH}px` },
          minWidth: 0,
        }}
      >
        {isMobile && (
          <AppBar
            position="sticky"
            elevation={0}
            sx={{
              bgcolor: '#0f172a',
              borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
            }}
          >
            <Toolbar sx={{ minHeight: 52, gap: 1 }}>
              <IconButton edge="start" color="inherit" onClick={() => setMobileOpen(true)}>
                <MenuIcon />
              </IconButton>
              <Typography fontWeight={700} sx={{ flex: 1 }}>
                Khu vực quản trị
              </Typography>
            </Toolbar>
          </AppBar>
        )}

        <Box component="main" sx={{ minHeight: { xs: 'calc(100vh - 52px)', md: '100vh' } }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default AdminLayout;
