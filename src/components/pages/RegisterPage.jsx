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
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/cars" replace />;
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      await register({
        username: form.username,
        password: form.password,
        fullName: form.fullName,
      });
      navigate('/cars');
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
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
        elevation={1}
        sx={{ p: { xs: 2.5, sm: 3 }, width: '100%', maxWidth: 420 }}
      >
        <Stack spacing={1.5}>
          <Box textAlign="center">
            <Typography variant="h5" color="primary">
              Đăng ký
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Tài khoản đầu tiên sẽ là Admin. Các tài khoản sau mặc định là KTV.
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}

          <TextField label="Họ tên" value={form.fullName} onChange={handleChange('fullName')} required fullWidth />
          <TextField label="Tên đăng nhập" value={form.username} onChange={handleChange('username')} required fullWidth />
          <TextField label="Mật khẩu" type="password" value={form.password} onChange={handleChange('password')} required fullWidth />
          <TextField label="Xác nhận mật khẩu" type="password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} required fullWidth />

          <Button type="submit" variant="contained" disabled={loading} fullWidth>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </Button>

          <Typography variant="body2" textAlign="center">
            Đã có tài khoản?{' '}
            <Link component={RouterLink} to="/login">
              Đăng nhập
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
};

export default RegisterPage;
