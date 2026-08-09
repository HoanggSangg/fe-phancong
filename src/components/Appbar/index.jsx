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
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Divider,
  Typography,
  useTheme,
  useMediaQuery,
  GlobalStyles,
  Button,
  Avatar,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import LogoutIcon from '@mui/icons-material/Logout';
import CloseIcon from '@mui/icons-material/Close';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CarRepairIcon from '@mui/icons-material/CarRepair';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import EngineeringIcon from '@mui/icons-material/Engineering';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import HistoryIcon from '@mui/icons-material/History';
import AssignmentIcon from '@mui/icons-material/Assignment';
import BarChartIcon from '@mui/icons-material/BarChart';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavGroupsForUser, ROLE_LABELS } from '../../utils/permissions';
import { LAYOUT } from '../../constants/layout';
import {
  BRAND,
  NAV,
  appBarSx,
  drawerPaperSx,
  drawerUserHeaderSx,
  drawerNavItemSx,
} from '../../constants/brand';
import useOverdueCarsMarquee, { formatOverdueMarqueeLabel } from '../../hooks/queries/useOverdueCarsMarquee';
import useDeferredReady from '../../hooks/useDeferredReady';

const NAV_ICONS = {
  'cars.today': <DirectionsCarIcon fontSize="small" />,
  'cars.manage': <CarRepairIcon fontSize="small" />,
  'cars.add': <AddCircleOutlineIcon fontSize="small" />,
  'cars.upload-image': <PhotoCameraIcon fontSize="small" />,
  'workers.woker': <AssignmentIcon fontSize="small" />,
  'workers.available': <PersonSearchIcon fontSize="small" />,
  'workers.repair-history': <HistoryIcon fontSize="small" />,
  'workers.main': <EngineeringIcon fontSize="small" />,
  'reports.revenue': <BarChartIcon fontSize="small" />,
  'reports.praise': <EmojiEventsIcon fontSize="small" />,
  'reports.warning': <WarningAmberIcon fontSize="small" />,
  'admin.area': <AdminPanelSettingsIcon fontSize="small" />,
};

const initialsOf = (name = '') => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const AppBarComponent = () => {
  const [openDrawer, setOpenDrawer] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const { user, logout, isAuthenticated, loading } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const marqueeEnabled = useDeferredReady(!isMobile && isAuthenticated && !loading, 900);
  const { data: overdueCars = [] } = useOverdueCarsMarquee(marqueeEnabled);
  const marqueeText = formatOverdueMarqueeLabel(overdueCars);
  const marqueeDuration = Math.max(12, Math.min(40, overdueCars.length * 4 + 8));

  const navGroups = getNavGroupsForUser(user);

  const selectedNavPath = useMemo(() => {
    const allItems = navGroups.flatMap((group) => group.items);

    const matchedItem = allItems
      .sort((a, b) => b.path.length - a.path.length)
      .find((item) => {
        if (item.activePaths?.length) {
          return item.activePaths.some(
            (path) =>
              location.pathname === path ||
              location.pathname.startsWith(`${path}/`),
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

      <AppBar position="fixed" elevation={0} sx={appBarSx}>
        <Toolbar
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            position: 'relative',
            minHeight: LAYOUT.appBarHeight,
            px: { xs: 1, sm: 2 },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, zIndex: 2 }}>
            <Box
              component="img"
              src={BRAND.logoUrl}
              alt={BRAND.name}
              sx={{
                height: 34,
                width: 68,
                cursor: 'pointer',
                bgcolor: 'rgba(255,255,255,0.95)',
                borderRadius: 1,
                p: 0.25,
                boxSizing: 'content-box',
              }}
              onClick={() => navigate('/cars')}
            />
            {!isMobile && (
              <Box>
                <Typography
                  sx={{
                    fontFamily: '"Sora", sans-serif',
                    fontWeight: 800,
                    fontSize: '0.95rem',
                    letterSpacing: '-0.02em',
                    color: '#fff',
                    lineHeight: 1.15,
                  }}
                >
                  {BRAND.name}
                </Typography>
              </Box>
            )}
          </Box>

          {!isMobile && (
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '58%',
                overflow: 'hidden',
                pointerEvents: 'none',
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.2)',
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
                  py: 0.35,
                  fontWeight: 600,
                  fontSize: '0.85rem',
                }}
              >
                <Box component="span" sx={{ color: NAV.main, fontWeight: 800, mr: 1 }}>
                  TRỄ HẸN:
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
            sx={{
              zIndex: 2,
              bgcolor: 'rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            {openDrawer ? <CloseIcon /> : <MenuIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Toolbar sx={{ minHeight: LAYOUT.appBarHeight }} />

      <Drawer
        anchor="right"
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        PaperProps={{ sx: drawerPaperSx }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {user && (
            <Box sx={drawerUserHeaderSx}>
              <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar
                  sx={{
                    width: 46,
                    height: 46,
                    fontWeight: 800,
                    fontFamily: '"Sora", sans-serif',
                    bgcolor: 'rgba(255,255,255,0.18)',
                    border: '2px solid rgba(255,255,255,0.45)',
                  }}
                >
                  {initialsOf(user.fullName)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    fontWeight={800}
                    noWrap
                    sx={{ fontFamily: '"Sora", sans-serif', fontSize: '1.05rem' }}
                  >
                    {user.fullName}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.88 }}>
                    {ROLE_LABELS[user.role]}
                  </Typography>
                </Box>
              </Box>
            </Box>
          )}

          <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
            {navGroups.map((group) => (
              <List
                key={group.title}
                dense
                disablePadding
                subheader={
                  <ListSubheader
                    disableSticky
                    sx={{
                      bgcolor: 'transparent',
                      color: NAV.main,
                      fontFamily: '"Sora", sans-serif',
                      fontWeight: 800,
                      fontSize: '0.72rem',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      lineHeight: '28px',
                      mt: 0.75,
                      px: 2.25,
                    }}
                  >
                    {group.title}
                  </ListSubheader>
                }
              >
                {group.items.map((item) => {
                  const isSelected = selectedNavPath === item.path;
                  const icon = NAV_ICONS[item.permission] || <DirectionsCarIcon fontSize="small" />;

                  return (
                    <ListItem key={`${group.title}-${item.path}`} disablePadding>
                      <ListItemButton
                        selected={isSelected}
                        onClick={() => handleNavigate(item.path)}
                        sx={drawerNavItemSx(isSelected)}
                      >
                        <ListItemIcon
                          sx={{
                            minWidth: 34,
                            color: isSelected ? NAV.main : ACCENT_ICON,
                          }}
                        >
                          {icon}
                        </ListItemIcon>
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            fontSize: '0.92rem',
                            fontWeight: isSelected ? 700 : 500,
                            fontFamily: isSelected ? '"Sora", sans-serif' : 'inherit',
                          }}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            ))}
          </Box>

          <Divider sx={{ borderColor: 'rgba(15, 23, 42, 0.08)' }} />

          <Box sx={{ p: 2 }}>
            <Button
              fullWidth
              variant="contained"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                py: 1.1,
                borderRadius: 2,
                fontWeight: 800,
                textTransform: 'none',
                background: `linear-gradient(105deg, ${NAV.dark} 0%, ${NAV.main} 100%)`,
                boxShadow: '0 8px 18px rgba(183, 28, 28, 0.28)',
                '&:hover': {
                  background: `linear-gradient(105deg, ${NAV.main} 0%, #d32f2f 100%)`,
                },
              }}
            >
              Đăng xuất
            </Button>
          </Box>
        </Box>
      </Drawer>
    </>
  );
};

const ACCENT_ICON = '#64748b';

export default AppBarComponent;
