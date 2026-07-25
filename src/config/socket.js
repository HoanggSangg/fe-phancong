import { io } from 'socket.io-client';
import { getStoredToken } from '../components/apis/axios';

let socketInstance = null;

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

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: {
        token: getStoredToken() || '',
      },
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
  }
  return socketInstance;
};

export const connectSocket = (token) => {
  const socket = getSocket();
  const accessToken = token || getStoredToken();
  if (!accessToken) return socket;

  socket.auth = { token: accessToken };
  if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (!socketInstance) return;
  socketInstance.auth = { token: '' };
  if (socketInstance.connected) {
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
