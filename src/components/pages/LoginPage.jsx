import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Checkbox, FormControlLabel } from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth, REMEMBER_USERNAME_KEY } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import GarageAuthHero from '../common/GarageAuthHero';
import AuthFormPanel, {
  AuthPasswordField,
  AuthSubmitButton,
  AuthSwitchLink,
  AuthTextField,
} from '../common/AuthFormPanel';
import { authRememberSx } from '../../constants/brand';
import { getFirstAllowedPath } from '../../utils/permissions';

const LoginPage = () => {
  const { login, isAuthenticated, user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [username, setUsername] = useState(() => localStorage.getItem(REMEMBER_USERNAME_KEY) || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => !!localStorage.getItem(REMEMBER_USERNAME_KEY));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={getFirstAllowedPath(user)} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login({ username, password }, rememberMe);
      navigate(getFirstAllowedPath(result?.user));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <GarageAuthHero>
      <AuthFormPanel
        title="Đăng nhập"
        subtitle="Nhập tài khoản để vào hệ thống phân công."
        onSubmit={handleSubmit}
        footer={(
          <AuthSwitchLink prompt="Chưa có tài khoản?" to="/register" actionLabel="Đăng ký" />
        )}
      >
        <AuthTextField
          label="Tên đăng nhập"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          icon={<PersonOutlineIcon fontSize="small" />}
        />
        <AuthPasswordField
          label="Mật khẩu"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          showPassword={showPassword}
          onToggleShow={() => setShowPassword((v) => !v)}
          icon={<LockOutlinedIcon fontSize="small" />}
        />
        <FormControlLabel
          sx={authRememberSx}
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              size="medium"
            />
          }
          label="Ghi nhớ đăng nhập"
        />
        <AuthSubmitButton loading={loading} loadingLabel="Đang đăng nhập...">
          Đăng nhập
        </AuthSubmitButton>
      </AuthFormPanel>
    </GarageAuthHero>
  );
};

export default LoginPage;
