import { io } from 'socket.io-client';
import { getStoredToken } from '../components/apis/axios';

let socketInstance = null;
let authListenersBound = false;

const resolveSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (import.meta.env.DEV) {
    // Dev: đi qua Vite proxy /socket.io → backend
    return window.location.origin;
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:3000`;
  }
  return 'http://localhost:3000';
};

const syncSocketAuth = (socket, token) => {
  const accessToken = token || getStoredToken() || '';
  socket.auth = { token: accessToken };
  return accessToken;
};

const bindAuthListeners = (socket) => {
  if (authListenersBound) return;
  authListenersBound = true;

  socket.io.on('reconnect_attempt', () => {
    syncSocketAuth(socket);
  });

  socket.on('connect_error', (err) => {
    const message = String(err?.message || '');
    if (message.includes('UNAUTHORIZED')) {
      // Token hết hạn / không hợp lệ — dừng reconnect storm
      socket.disconnect();
    }
  });
};

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      autoConnect: false,
      // Dev qua proxy: polling trước ổn định hơn; sau đó nâng cấp websocket.
      transports: import.meta.env.DEV
        ? ['polling', 'websocket']
        : ['websocket', 'polling'],
      auth: {
        token: getStoredToken() || '',
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
    });
    bindAuthListeners(socketInstance);
  }
  return socketInstance;
};

export const connectSocket = (token) => {
  const socket = getSocket();
  const accessToken = syncSocketAuth(socket, token);
  if (!accessToken) return socket;

  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (!socketInstance) return;
  socketInstance.auth = { token: '' };
  if (socketInstance.connected || socketInstance.active) {
    socketInstance.disconnect();
  }
};

export const emitPresence = (currentPath) => {
  const socket = getSocket();
  if (!socket.connected) return;
  socket.emit('client:presence', {
    currentPath: String(currentPath || '/').slice(0, 200),
  });
};
