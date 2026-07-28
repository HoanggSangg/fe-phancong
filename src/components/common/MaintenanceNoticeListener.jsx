import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Typography,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { getSystemStatus } from '../apis';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isKtv, isGiamSatLike } from '../../utils/permissions';
import { showBrowserNotification } from '../../utils/browserNotifications';
import usePageVisible from '../../hooks/usePageVisible';
import { LAYOUT } from '../../constants/layout';

const POLL_MS = 15_000;
const NOTIFIED_KEY = 'maintenanceNoticeNotifiedAt';

const isTargetRole = (user) => isGiamSatLike(user) || isKtv(user);

const MaintenanceNoticeListener = () => {
  const { user } = useAuth();
  const toast = useToast();
  const pageVisible = usePageVisible();
  const [notice, setNotice] = useState(null);

  const checkNotice = useCallback(async () => {
    if (!isTargetRole(user)) return;

    try {
      const res = await getSystemStatus();
      const active = Boolean(res.data?.maintenanceNoticeActive)
        && !res.data?.maintenanceMode;

      if (!active) {
        setNotice(null);
        return;
      }

      const noticeAt = res.data.maintenanceNoticeAt
        ? String(res.data.maintenanceNoticeAt)
        : 'active';
      const message = res.data.maintenanceNoticeMessage
        || 'Hệ thống sắp bảo trì trong vòng 3 phút. Vui lòng hoàn tất công việc đang làm.';

      setNotice({ message, noticeAt });

      if (sessionStorage.getItem(NOTIFIED_KEY) !== noticeAt) {
        toast.warning(message, { duration: 10000 });
        showBrowserNotification({
          title: 'Thông báo bảo trì sắp tới',
          body: message,
          tag: `maintenance-notice-${noticeAt}`,
        });
        sessionStorage.setItem(NOTIFIED_KEY, noticeAt);
      }
    } catch {
      // ignore poll errors
    }
  }, [user, toast]);

  useEffect(() => {
    if (!isTargetRole(user) || !pageVisible) return undefined;

    checkNotice();
    const id = setInterval(checkNotice, POLL_MS);
    return () => clearInterval(id);
  }, [user, pageVisible, checkNotice]);

  if (!isTargetRole(user) || !notice) return null;

  return (
    <Box
      sx={{
        position: 'sticky',
        top: LAYOUT.appBarHeight,
        zIndex: 1100,
        px: { xs: 1, sm: 2 },
        pt: 1,
      }}
    >
      <Alert
        severity="warning"
        variant="filled"
        icon={<CampaignIcon fontSize="inherit" />}
        sx={{ borderRadius: 1.5, alignItems: 'center' }}
      >
        <Typography variant="body2" fontWeight={700} component="span">
          Sắp bảo trì:{' '}
        </Typography>
        {notice.message}
      </Alert>
    </Box>
  );
};

export default MaintenanceNoticeListener;
