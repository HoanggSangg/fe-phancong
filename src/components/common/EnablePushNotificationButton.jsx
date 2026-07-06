import React, { useState } from 'react';
import { Button, Tooltip } from '@mui/material';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import {
  getNotificationPermission,
  isNotificationSupported,
  isPushEnabled,
  requestNotificationPermission,
  setPushEnabled,
  showBrowserNotification,
} from '../../utils/browserNotifications';

const EnablePushNotificationButton = ({ size = 'small', sx }) => {
  const supported = isNotificationSupported();
  const [enabled, setEnabled] = useState(isPushEnabled());
  const [loading, setLoading] = useState(false);

  if (!supported) return null;

  const permission = getNotificationPermission();
  const denied = permission === 'denied';

  const handleClick = async () => {
    if (denied) {
      window.alert('Trình duyệt đã chặn thông báo. Vào cài đặt trình duyệt để bật lại.');
      return;
    }

    if (enabled) {
      setPushEnabled(false);
      setEnabled(false);
      return;
    }

    setLoading(true);
    try {
      const result = await requestNotificationPermission();
      if (result === 'granted') {
        setEnabled(true);
        showBrowserNotification({
          title: 'Đã bật thông báo đẩy',
          body: 'Bạn sẽ nhận thông báo khi có tin nhắn KTV mới hoặc admin đã xem tin.',
          tag: 'push-enabled',
          playSound: false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const label = denied
    ? 'Thông báo bị chặn'
    : enabled
      ? 'Tắt thông báo đẩy'
      : 'Bật thông báo đẩy';

  return (
    <Tooltip title={denied ? 'Mở cài đặt trình duyệt để cho phép thông báo' : label}>
      <span>
        <Button
          size={size}
          variant={enabled ? 'contained' : 'outlined'}
          color={enabled ? 'success' : 'inherit'}
          startIcon={enabled ? <NotificationsActiveIcon /> : <NotificationsOffIcon />}
          onClick={handleClick}
          disabled={loading || denied}
          sx={{ textTransform: 'none', whiteSpace: 'nowrap', ...sx }}
        >
          {loading ? 'Đang bật...' : label}
        </Button>
      </span>
    </Tooltip>
  );
};

export default EnablePushNotificationButton;
