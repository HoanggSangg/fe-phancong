import React from 'react';
import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  Link,
  Paper,
  Stack,
  TextField,
  Typography,
  keyframes,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import {
  authFieldSx,
  authFormPaperSx,
  authLinkSx,
  authSubmitSx,
  BRAND,
} from '../../constants/brand';

const authCardEnter = keyframes`
  0% { opacity: 0; transform: translateY(28px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

export function AuthTextField({ icon, InputProps, sx, ...props }) {
  return (
    <TextField
      fullWidth
      required
      size="medium"
      {...props}
      sx={{ ...authFieldSx, ...sx }}
      InputProps={{
        startAdornment: icon ? (
          <InputAdornment position="start">{icon}</InputAdornment>
        ) : undefined,
        ...InputProps,
      }}
    />
  );
}

export function AuthPasswordField({ showPassword, onToggleShow, icon, InputProps, ...props }) {
  return (
    <AuthTextField
      {...props}
      type={showPassword ? 'text' : 'password'}
      icon={icon}
      InputProps={{
        ...InputProps,
        endAdornment: (
          <InputAdornment position="end">
            <IconButton
              edge="end"
              size="small"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              onClick={onToggleShow}
              sx={{ color: 'rgba(226,232,240,0.65)' }}
            >
              {showPassword ? (
                <VisibilityOffOutlinedIcon fontSize="small" />
              ) : (
                <VisibilityOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}

export function AuthSubmitButton({ loading, loadingLabel, children, ...props }) {
  return (
    <Button
      type="submit"
      variant="contained"
      size="large"
      disabled={loading}
      fullWidth
      sx={authSubmitSx}
      {...props}
    >
      {loading ? loadingLabel : children}
    </Button>
  );
}

export function AuthSwitchLink({ prompt, to, actionLabel }) {
  return (
    <Typography
      variant="body2"
      textAlign="center"
      sx={{ color: 'rgba(226,232,240,0.7)', pt: 0.25 }}
    >
      {prompt}{' '}
      <Link component={RouterLink} to={to} sx={authLinkSx}>
        {actionLabel}
      </Link>
    </Typography>
  );
}

const AuthFormPanel = ({
  title,
  subtitle,
  onSubmit,
  children,
  footer,
  maxWidth = 540,
}) => (
  <Box
    sx={{
      width: '100%',
      maxWidth,
      animation: `${authCardEnter} 0.55s cubic-bezier(0.22, 1, 0.36, 1) both`,
    }}
  >
    <Paper component="form" onSubmit={onSubmit} elevation={0} sx={authFormPaperSx}>
      <Stack spacing={2.75}>
        <Box>
          <Typography
            component="p"
            sx={{
              m: 0,
              mb: 0.85,
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: '#ef5350',
            }}
          >
            {BRAND.name}
          </Typography>
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontFamily: '"Sora", sans-serif',
              fontWeight: 800,
              fontSize: { xs: '2rem', sm: '2.35rem' },
              letterSpacing: '-0.03em',
              color: '#f8fafc',
              lineHeight: 1.15,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography sx={{ mt: 0.85, color: 'rgba(226, 232, 240, 0.72)', fontSize: '1rem', lineHeight: 1.45 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        <Stack spacing={2.1}>{children}</Stack>
        {footer}
      </Stack>
    </Paper>
  </Box>
);

export default AuthFormPanel;
