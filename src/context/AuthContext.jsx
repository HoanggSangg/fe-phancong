import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { getMe, login as loginApi, register as registerApi } from '../components/apis';
import { connectSocket, disconnectSocket } from '../config/socket';

const AuthContext = createContext(null);

export const REMEMBER_USERNAME_KEY = 'rememberUsername';

const getActiveStorage = () => {
  if (localStorage.getItem('token')) return localStorage;
  if (sessionStorage.getItem('token')) return sessionStorage;
  return null;
};

const getStoredToken = () =>
  localStorage.getItem('token') || sessionStorage.getItem('token') || null;

const readStoredUser = () => {
  try {
    const storage = getActiveStorage();
    if (!storage) return null;
    const raw = storage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearAuthStorage = () => {
  ['token', 'user'].forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
};

const persistAuth = (token, authUser, rememberMe) => {
  clearAuthStorage();
  const storage = rememberMe ? localStorage : sessionStorage;
  storage.setItem('token', token);
  storage.setItem('user', JSON.stringify(authUser));

  if (rememberMe) {
    localStorage.setItem(REMEMBER_USERNAME_KEY, authUser.username || '');
  } else {
    localStorage.removeItem(REMEMBER_USERNAME_KEY);
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storage = getActiveStorage();
    const token = storage?.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    getMe()
      .then((res) => {
        setUser(res.data.user);
        storage.setItem('user', JSON.stringify(res.data.user));
      })
      .catch((error) => {
        // Chỉ xóa session khi backend từ chối auth — giữ đăng nhập nếu lỗi mạng/proxy.
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          clearAuthStorage();
          setUser(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (credentials, rememberMe = true) => {
    const res = await loginApi(credentials);
    persistAuth(res.data.token, res.data.user, rememberMe);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (payload) => {
    const res = await registerApi(payload);
    persistAuth(res.data.token, res.data.user, true);
    setUser(res.data.user);
    return res.data;
  };

  const refreshUser = useCallback(async () => {
    const storage = getActiveStorage();
    if (!storage?.getItem('token')) return null;

    try {
      const res = await getMe();
      setUser(res.data.user);
      storage.setItem('user', JSON.stringify(res.data.user));
      return res.data.user;
    } catch (error) {
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        clearAuthStorage();
        setUser(null);
      }
      return null;
    }
  }, []);

  const logout = () => {
    disconnectSocket();
    clearAuthStorage();
    setUser(null);
  };

  useEffect(() => {
    if (loading) return undefined;

    const token = getStoredToken();
    if (user && token) {
      connectSocket(token);
      return undefined;
    }

    if (!user) {
      disconnectSocket();
    }
    return undefined;
    // Chỉ reconnect khi đổi user id / loading — tránh connect lại mỗi lần getMe cập nhật object
  }, [loading, user?.id]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      refreshUser,
      isAuthenticated: !!user && !!getStoredToken(),
    }),
    [user, loading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
