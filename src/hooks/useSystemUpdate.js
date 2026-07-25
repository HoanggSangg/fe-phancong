import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getSystemVersion } from '../components/apis';
import { connectSocket, emitPresence } from '../config/socket';
import { useAuth } from '../context/AuthContext';
import { getStoredToken } from '../components/apis/axios';

export const APP_VERSION_KEY = 'appVersion';

const HIDDEN_CHECK_MIN_MS = 60_000;

const readLocalVersion = () => localStorage.getItem(APP_VERSION_KEY) || '';

const isNewerVersion = (serverVersion, localVersion) => {
  const remote = String(serverVersion || '').trim();
  if (!remote) return false;
  const local = String(localVersion || '').trim();
  if (!local) return true;
  return remote !== local;
};

/**
 * Lắng nghe cập nhật hệ thống (socket + check version khi reconnect/visible).
 * Chỉ gọi một lần ở root (App).
 */
const useSystemUpdate = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const [pendingUpdate, setPendingUpdate] = useState(null);
  const hiddenAtRef = useRef(0);
  const handlingRef = useRef(false);

  const applyUpdateIfNeeded = useCallback((payload) => {
    if (!payload?.version) return;
    if (!isNewerVersion(payload.version, readLocalVersion())) return;

    setPendingUpdate({
      version: payload.version,
      message: payload.message || 'Hệ thống vừa được cập nhật.',
      forceReload: Boolean(payload.forceReload),
      updatedAt: payload.updatedAt || null,
    });
  }, []);

  const checkVersion = useCallback(async () => {
    if (!getStoredToken()) return;
    try {
      const res = await getSystemVersion();
      applyUpdateIfNeeded(res.data);
    } catch {
      // ignore — offline / maintenance
    }
  }, [applyUpdateIfNeeded]);

  // Connect socket + listen update
  useEffect(() => {
    if (loading || !isAuthenticated) return undefined;

    const socket = connectSocket();

    const handleSystemUpdate = (payload) => {
      applyUpdateIfNeeded(payload);
    };

    const handleConnect = () => {
      emitPresence(window.location.pathname);
      checkVersion();
    };

    socket.on('system:update-available', handleSystemUpdate);
    socket.on('connect', handleConnect);

    if (socket.connected) {
      handleConnect();
    }

    // First boot check (covers offline during publish)
    checkVersion();

    return () => {
      socket.off('system:update-available', handleSystemUpdate);
      socket.off('connect', handleConnect);
    };
  }, [isAuthenticated, loading, applyUpdateIfNeeded, checkVersion]);

  // Presence path updates
  useEffect(() => {
    if (!isAuthenticated) return;
    emitPresence(location.pathname);
  }, [isAuthenticated, location.pathname]);

  // Visibility check (not continuous polling)
  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now();
        return;
      }
      if (document.visibilityState === 'visible') {
        const hiddenFor = Date.now() - (hiddenAtRef.current || 0);
        if (hiddenAtRef.current && hiddenFor >= HIDDEN_CHECK_MIN_MS) {
          checkVersion();
        }
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [isAuthenticated, checkVersion]);

  const dismissUpdate = useCallback(() => {
    setPendingUpdate(null);
  }, []);

  const reloadWithVersion = useCallback((version) => {
    if (handlingRef.current) return;
    handlingRef.current = true;
    if (version) {
      localStorage.setItem(APP_VERSION_KEY, version);
    }
    window.location.reload();
  }, []);

  return {
    pendingUpdate,
    dismissUpdate,
    reloadWithVersion,
    checkVersion,
  };
};

export default useSystemUpdate;
