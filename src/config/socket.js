import { io } from 'socket.io-client';
import { getStoredToken } from '../components/apis/axios';

const GLOBAL_SOCKET_KEY = '__phancongSocket';

let socketInstance = null;

const resolveSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.DEV) {
    return window.location.origin;
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000`;
  }
  return 'http://localhost:3000';
};

const readGlobalSocket = () => {
  if (typeof window === 'undefined') return null;
  const existing = window[GLOBAL_SOCKET_KEY];
  if (existing && !existing.disconnected) {
    return existing;
  }
  return null;
};

const storeGlobalSocket = (socket) => {
  if (typeof window !== 'undefined') {
    window[GLOBAL_SOCKET_KEY] = socket;
  }
};

const clearGlobalSocket = () => {
  if (typeof window !== 'undefined') {
    delete window[GLOBAL_SOCKET_KEY];
  }
};

const syncSocketAuth = (socket, token) => {
  const accessToken = token || getStoredToken() || '';
  socket.auth = { token: accessToken };
  return accessToken;
};

const bindAuthListeners = (socket) => {
  if (socket.__phancongAuthBound) return;
  socket.__phancongAuthBound = true;

  socket.io.on('reconnect_attempt', () => {
    syncSocketAuth(socket);
  });

  socket.on('connect_error', (err) => {
    const message = String(err?.message || '');
    if (message.includes('UNAUTHORIZED')) {
      socket.disconnect();
    }
  });
};

const createSocket = () => {
  const socket = io(resolveSocketUrl(), {
    autoConnect: false,
    path: '/socket.io',
    transports: import.meta.env.DEV ? ['websocket'] : ['websocket', 'polling'],
    auth: {
      token: getStoredToken() || '',
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10000,
    timeout: 20000,
  });
  bindAuthListeners(socket);
  storeGlobalSocket(socket);
  return socket;
};

/** Lấy socket hiện có — không tạo mới nếu chưa đăng nhập. */
export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = readGlobalSocket();
  }
  if (!socketInstance) {
    socketInstance = createSocket();
  }
  return socketInstance;
};

/** Chỉ AuthContext gọi khi đã có token. */
export const connectSocket = (token) => {
  const accessToken = token || getStoredToken() || '';
  if (!accessToken) return null;

  const socket = getSocket();
  syncSocketAuth(socket, accessToken);

  if (socket.connected) return socket;
  if (socket.active) return socket;

  socket.connect();
  return socket;
};

/** Chỉ gọi khi logout — ngắt hẳn kết nối. */
export const disconnectSocket = () => {
  const socket = socketInstance || readGlobalSocket();
  if (!socket) {
    socketInstance = null;
    clearGlobalSocket();
    return;
  }

  socket.auth = { token: '' };
  socket.disconnect();

  socketInstance = null;
  clearGlobalSocket();
};

export const emitPresence = (currentPath) => {
  const socket = socketInstance || readGlobalSocket();
  if (!socket?.connected) return;
  socket.emit('client:presence', {
    currentPath: String(currentPath || '/').slice(0, 200),
  });
};
