import { playNotificationTone } from './operationAlertSound';

const ENABLED_KEY = 'browserPushEnabled';

export const isNotificationSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window;

export const getNotificationPermission = () => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

export const isPushEnabled = () => {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;
  return localStorage.getItem(ENABLED_KEY) !== 'false';
};

export const setPushEnabled = (enabled) => {
  localStorage.setItem(ENABLED_KEY, String(!!enabled));
};

export const requestNotificationPermission = async () => {
  if (!isNotificationSupported()) return 'unsupported';
  if (Notification.permission === 'granted') {
    setPushEnabled(true);
    return 'granted';
  }
  if (Notification.permission === 'denied') return 'denied';

  const result = await Notification.requestPermission();
  if (result === 'granted') {
    setPushEnabled(true);
  }
  return result;
};

export const showBrowserNotification = ({
  title,
  body,
  tag,
  url,
  playSound = true,
}) => {
  if (!isPushEnabled()) return null;

  try {
    const notification = new Notification(title, {
      body,
      tag: tag || undefined,
      icon: 'https://res.cloudinary.com/drbjrsm0s/image/upload/v1745463450/logo_ulbaie.png',
    });

    notification.onclick = () => {
      window.focus();
      if (url) {
        const currentPath = window.location.pathname + window.location.search;
        if (currentPath !== url) {
          window.location.assign(url);
        }
      }
      notification.close();
    };

    if (playSound) {
      playNotificationTone();
    }

    return notification;
  } catch {
    return null;
  }
};
