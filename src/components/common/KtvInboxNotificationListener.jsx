import { useCallback, useEffect, useRef } from 'react';
import { getKtvMessages } from '../apis';
import { hasPermission } from '../../utils/permissions';
import { showBrowserNotification } from '../../utils/browserNotifications';

const POLL_INTERVAL_MS = 15_000;

const canReceiveKtvInbox = (user) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return hasPermission(user, 'system.ktv-messages');
};

const KtvInboxNotificationListener = ({ user }) => {
  const enabled = canReceiveKtvInbox(user);
  const knownIdsRef = useRef(new Set());
  const initialLoadRef = useRef(false);

  const pollMessages = useCallback(async () => {
    if (!enabled) return;

    try {
      const res = await getKtvMessages({ status: 'unread', limit: 50 });
      const items = res.data.items || [];
      const freshItems = items.filter((item) => !knownIdsRef.current.has(item._id));

      if (initialLoadRef.current && freshItems.length > 0) {
        freshItems.slice().reverse().forEach((item) => {
          const preview = item.message
            ? item.message.slice(0, 120)
            : `Trạng thái: ${item.carStatusLabel || item.carStatus}`;

          showBrowserNotification({
            title: `Tin KTV mới — ${item.plateNumber}`,
            body: `${item.senderName || 'KTV'}: ${preview}`,
            tag: `ktv-inbox-${item._id}`,
            url: '/ktv-messages',
          });
        });
      }

      knownIdsRef.current = new Set(items.map((item) => item._id));
      initialLoadRef.current = true;
    } catch (err) {
      console.error('Lỗi khi kiểm tra tin KTV mới:', err);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    pollMessages();
    const intervalId = setInterval(pollMessages, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled, pollMessages]);

  return null;
};

export default KtvInboxNotificationListener;
