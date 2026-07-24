import { useMemo, useState } from 'react';
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
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavGroupsForUser, ROLE_LABELS } from '../../utils/permissions';
import { LAYOUT } from '../../constants/layout';
import useOverdueCarsMarquee, { formatOverdueMarqueeLabel } from '../../hooks/queries/useOverdueCarsMarquee';
import useDeferredReady from '../../hooks/useDeferredReady';

const AppBarComponent = () => {
  const [openDrawer, setOpenDrawer] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout, isAuthenticated, loading } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Marquee không chặn first paint — tải sau khi trang chính load xong
  const marqueeEnabled = useDeferredReady(!isMobile && isAuthenticated && !loading, 900);
  const { data: overdueCars = [] } = useOverdueCarsMarquee(marqueeEnabled);
  const marqueeText = formatOverdueMarqueeLabel(overdueCars);
  const marqueeDuration = Math.max(12, Math.min(40, overdueCars.length * 4 + 8));

  const navGroups = getNavGroupsForUser(user);

  // ✅ Chỉ lấy 1 menu đang chọn, ưu tiên path dài nhất
  // Ví dụ: /cars/manage sẽ chọn /cars/manage, không chọn /cars
  // Khu vực quản trị: activePaths gồm /admin và các trang con
  const selectedNavPath = useMemo(() => {
    const allItems = navGroups.flatMap((group) => group.items);

    const matchedItem = allItems
      .sort((a, b) => b.path.length - a.path.length)
      .find((item) => {
        if (item.activePaths?.length) {
          return item.activePaths.some(
            (path) =>
              location.pathname === path ||
              location.pathname.startsWith(`${path}/`)
          );
        }

        if (item.path === '/') return location.pathname === '/';

        return (
          location.pathname === item.path ||
          location.pathname.startsWith(`${item.path}/`)
        );
      });

    return matchedItem?.path || '';
  }, [navGroups, location.pathname]);

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

      <AppBar position="fixed" elevation={1} sx={{ backgroundColor: '#b71c1c' }}>
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            minHeight: 48,
            px: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, zIndex: 2 }}>
            <Box
              component="img"
              src="https://res.cloudinary.com/drbjrsm0s/image/upload/v1745463450/logo_ulbaie.png"
              alt="Bá Thành Logo"
              sx={{ height: 34, width: 68, cursor: 'pointer' }}
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
                width: '72%',
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            >
              <Typography
                variant="body2"
                component="div"
                sx={{
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  animation: `marquee ${marqueeDuration}s linear infinite`,
                  backgroundColor: '#ffeb3b',
                  color: '#000',
                  px: 1.5,
                  py: 0.25,
                  borderRadius: 1,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}
              >
                <Box component="span" sx={{ color: '#b71c1c', fontWeight: 800, mr: 1 }}>
                  ⏰ TRỄ HẸN:
                </Box>
                {marqueeText}
              </Typography>
            </Box>
          )}

          <IconButton
            edge="end"
            color="inherit"
            aria-label="menu"
            onClick={() => setOpenDrawer((prev) => !prev)}
            sx={{ zIndex: 2 }}
          >
            <MenuIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Toolbar sx={{ minHeight: LAYOUT.appBarHeight }} />

      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        PaperProps={{
          sx: {
            width: { xs: '85vw', sm: 280 },
            height: `calc(100% - ${LAYOUT.appBarHeight}px)`,
            top: LAYOUT.appBarHeight,
          },
        }}
      >
        <Box
          sx={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {user && (
            <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
              <Typography fontWeight="bold">{user.fullName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {ROLE_LABELS[user.role]}
              </Typography>
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
                {group.items.map((item) => {
                  const isSelected = selectedNavPath === item.path;

                  return (
                    <ListItem key={item.path} disablePadding>
                      <ListItemButton
                        selected={isSelected}
                        onClick={() => handleNavigate(item.path)}
                        sx={{
                          py: 0.8,
                          pl: 3,
                          '&.Mui-selected': {
                            bgcolor: '#ffebee',
                            color: '#b71c1c',
                          },
                          '&.Mui-selected:hover': {
                            bgcolor: '#ffcdd2',
                          },
                        }}
                      >
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.92rem',
                            fontWeight: isSelected ? 700 : 400,
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            ))}
          </Box>

          <Divider />

          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
            >
              Đăng xuất
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

export default AppBarComponent;