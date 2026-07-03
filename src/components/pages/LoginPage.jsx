import React, { useState } from 'react';
import { Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
  Alert,
  Link,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useAuth, REMEMBER_USERNAME_KEY } from '../../context/AuthContext';

const LoginPage = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBER_USERNAME_KEY) || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_USERNAME_KEY));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/cars" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login({ username, password }, rememberMe);
      navigate('/cars');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: '#f5f5f5',
      }}
    >
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{ p: { xs: 3, sm: 4 }, width: '100%', maxWidth: 420, borderRadius: 3 }}
      >
        <Stack spacing={2}>
          <Box textAlign="center">
            <Typography variant="h5" fontWeight="bold" color="#b71c1c">
              Đăng nhập
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Hệ thống phân công Oto Bá Thành
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Tên đăng nhập"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            fullWidth
            required
            autoComplete="username"
          />
          <TextField
            label="Mật khẩu"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            required
            autoComplete="current-password"
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                color="primary"
              />
            }
            label="Ghi nhớ đăng nhập"
          />

          <Button type="submit" variant="contained" size="large" disabled={loading} fullWidth>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Button>

          <Typography variant="body2" textAlign="center">
            Chưa có tài khoản?{' '}
            <Link component={RouterLink} to="/register">
              Đăng ký
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default LoginPage;
