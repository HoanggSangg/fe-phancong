import { useCallback, useEffect, useRef } from 'react';
import { acknowledgeKtvMessageRead, getKtvSentMessages } from '../apis';
import { isKtv } from '../../utils/permissions';
import { showBrowserNotification } from '../../utils/browserNotifications';
import { useToast } from '../../context/ToastContext';
import useDeferredReady from '../../hooks/useDeferredReady';
import usePageVisible from '../../hooks/usePageVisible';

const POLL_INTERVAL_MS = 30_000;

const KtvReadNotificationListener = ({ user }) => {
  const toast = useToast();
  const allowed = isKtv(user);
  const enabled = useDeferredReady(allowed, 2500);
  const pageVisible = usePageVisible();
  const knownIdsRef = useRef(new Set());
  const initialLoadRef = useRef(false);

  const pollNotices = useCallback(async () => {
    if (!enabled || document.visibilityState === 'hidden') return;

    try {
      const res = await getKtvSentMessages({ pendingAck: '1' });
      const items = res.data.items || [];

      const freshItems = items.filter((item) => !knownIdsRef.current.has(item._id));

      if (initialLoadRef.current && freshItems.length > 0) {
        const latest = freshItems[0];
        const readerName = latest.readByName || 'Admin';
        const text = `${readerName} đã xem tin nhắn của bạn về xe ${latest.plateNumber}`;

        toast.success(text, { duration: 8000 });
        showBrowserNotification({
          title: 'Admin đã xem tin nhắn',
          body: `${readerName} đã xem tin về xe ${latest.plateNumber}`,
          tag: `ktv-read-${latest._id}`,
          url: '/cars/manage',
        });

        await Promise.all(
          freshItems.map((item) => acknowledgeKtvMessageRead(item._id)),
        );
      }

      knownIdsRef.current = new Set(items.map((item) => item._id));
      initialLoadRef.current = true;
    } catch (err) {
      console.error('Lỗi khi kiểm tra thông báo đã xem:', err);
    }
  }, [enabled, toast]);

  useEffect(() => {
    if (!enabled || !pageVisible) return undefined;

    pollNotices();
    const intervalId = setInterval(pollNotices, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled, pageVisible, pollNotices]);

  return null;
};

export default KtvReadNotificationListener;
