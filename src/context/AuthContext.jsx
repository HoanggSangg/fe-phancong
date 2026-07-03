import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getMe, login as loginApi, register as registerApi } from '../components/apis';

const AuthContext = createContext(null);

export const REMEMBER_USERNAME_KEY = 'rememberUsername';

const getActiveStorage = () => {
  if (localStorage.getItem('token')) return localStorage;
  if (sessionStorage.getItem('token')) return sessionStorage;
  return null;
};

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
      .catch(() => {
        clearAuthStorage();
        setUser(null);
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

  const logout = () => {
    clearAuthStorage();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, login, register, logout, isAuthenticated: !!user }),
    [user, loading]
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
