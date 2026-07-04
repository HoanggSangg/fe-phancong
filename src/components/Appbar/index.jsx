import { useState } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getNavGroupsForUser, ROLE_LABELS } from '../../utils/permissions';
import { LAYOUT } from '../../constants/layout';
import useOverdueCarsMarquee, { formatOverdueMarqueeLabel } from '../../hooks/queries/useOverdueCarsMarquee';

const AppBarComponent = () => {
  const [openDrawer, setOpenDrawer] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { data: overdueCars = [] } = useOverdueCarsMarquee(!isMobile && !!user);
  const marqueeText = formatOverdueMarqueeLabel(overdueCars);
  const marqueeDuration = Math.max(12, Math.min(40, overdueCars.length * 4 + 8));

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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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

          <IconButton edge="end" color="inherit" aria-label="menu" onClick={() => setOpenDrawer((prev) => !prev)}>
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
        <Box sx={{ width: '100%', height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
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
                {group.items.map((item) => (
                  <ListItem key={item.path} disablePadding>
                    <ListItemButton onClick={() => handleNavigate(item.path)} sx={{ py: 0.8, pl: 3 }}>
                      <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: '0.92rem' }} />
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
