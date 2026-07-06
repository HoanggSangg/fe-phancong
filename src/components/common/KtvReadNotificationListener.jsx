import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { acknowledgeKtvMessageRead, getKtvSentMessages } from '../apis';
import { isKtv } from '../../utils/permissions';
import { showBrowserNotification } from '../../utils/browserNotifications';

const POLL_INTERVAL_MS = 30_000;

const useKtvReadNotifications = (user) => {
  const enabled = isKtv(user);
  const [notice, setNotice] = useState(null);
  const knownIdsRef = useRef(new Set());
  const initialLoadRef = useRef(false);

  const pollNotices = useCallback(async () => {
    if (!enabled) return;

    try {
      const res = await getKtvSentMessages({ pendingAck: '1' });
      const items = res.data.items || [];

      const freshItems = items.filter((item) => !knownIdsRef.current.has(item._id));

      if (initialLoadRef.current && freshItems.length > 0) {
        const latest = freshItems[0];
        setNotice(latest);

        const readerName = latest.readByName || 'Admin';
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
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    pollNotices();
    const intervalId = setInterval(pollNotices, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [enabled, pollNotices]);

  const closeNotice = () => setNotice(null);

  return { notice, closeNotice };
};

const KtvReadNotificationListener = ({ user }) => {
  const { notice, closeNotice } = useKtvReadNotifications(user);

  if (!notice) return null;

  const readerName = notice.readByName || 'Admin';
  const text = `${readerName} đã xem tin nhắn của bạn về xe ${notice.plateNumber}`;

  return (
    <Snackbar
      open
      autoHideDuration={8000}
      onClose={closeNotice}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert onClose={closeNotice} severity="success" variant="filled" sx={{ width: '100%' }}>
        {text}
      </Alert>
    </Snackbar>
  );
};

export default KtvReadNotificationListener;
