import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import GarageAuthHero from '../common/GarageAuthHero';
import AuthFormPanel, {
  AuthPasswordField,
  AuthSubmitButton,
  AuthSwitchLink,
  AuthTextField,
} from '../common/AuthFormPanel';

const RegisterPage = () => {
  const { register, isAuthenticated } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/cars" replace />;
  }

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp');
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
      toast.error(err.response?.data?.message || 'Đăng ký thất bại');
    } finally {
      setLoading(false);
    }
  };

  const lockIcon = <LockOutlinedIcon fontSize="small" />;

  return (
    <GarageAuthHero>
      <AuthFormPanel
        title="Đăng ký"
        subtitle="Điền thông tin để tạo tài khoản làm việc."
        onSubmit={handleSubmit}
        maxWidth={560}
        footer={(
          <AuthSwitchLink prompt="Đã có tài khoản?" to="/login" actionLabel="Đăng nhập" />
        )}
      >
        <AuthTextField
          label="Họ tên"
          value={form.fullName}
          onChange={handleChange('fullName')}
          icon={<BadgeOutlinedIcon fontSize="small" />}
        />
        <AuthTextField
          label="Tên đăng nhập"
          value={form.username}
          onChange={handleChange('username')}
          autoComplete="username"
          icon={<PersonOutlineIcon fontSize="small" />}
        />
        <AuthPasswordField
          label="Mật khẩu"
          value={form.password}
          onChange={handleChange('password')}
          autoComplete="new-password"
          showPassword={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          icon={lockIcon}
        />
        <AuthTextField
          label="Xác nhận mật khẩu"
          type={showPassword ? 'text' : 'password'}
          value={form.confirmPassword}
          onChange={handleChange('confirmPassword')}
          autoComplete="new-password"
          icon={lockIcon}
        />
        <AuthSubmitButton loading={loading} loadingLabel="Đang đăng ký...">
          Đăng ký
        </AuthSubmitButton>
      </AuthFormPanel>
    </GarageAuthHero>
  );
};

export default RegisterPage;
