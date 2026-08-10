import React, { useEffect, useMemo } from 'react';
import {
  Alert,
  Box,
  Typography,
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { isKtv, isGiamSatLike } from '../../utils/permissions';
import { showBrowserNotification } from '../../utils/browserNotifications';
import usePageVisible from '../../hooks/usePageVisible';
import useSystemStatus from '../../hooks/queries/useSystemStatus';
import { LAYOUT } from '../../constants/layout';

const NOTIFIED_KEY = 'maintenanceNoticeNotifiedAt';

const isTargetRole = (user) => isGiamSatLike(user) || isKtv(user);

const MaintenanceNoticeListener = () => {
  const { user } = useAuth();
  const toast = useToast();
  const pageVisible = usePageVisible();
  const target = isTargetRole(user);

  const { data } = useSystemStatus({
    enabled: target && pageVisible,
    refetchInterval: 30_000,
  });

  const notice = useMemo(() => {
    if (!target || !data) return null;
    const active = Boolean(data.maintenanceNoticeActive) && !data.maintenanceMode;
    if (!active) return null;

    return {
      noticeAt: data.maintenanceNoticeAt
        ? String(data.maintenanceNoticeAt)
        : 'active',
      message: data.maintenanceNoticeMessage
        || 'Hệ thống sắp bảo trì trong vòng 3 phút. Vui lòng hoàn tất công việc đang làm.',
    };
  }, [data, target]);

  useEffect(() => {
    if (!notice) return;

    if (sessionStorage.getItem(NOTIFIED_KEY) !== notice.noticeAt) {
      toast.warning(notice.message, { duration: 10000 });
      showBrowserNotification({
        title: 'Thông báo bảo trì sắp tới',
        body: notice.message,
        tag: `maintenance-notice-${notice.noticeAt}`,
      });
      sessionStorage.setItem(NOTIFIED_KEY, notice.noticeAt);
    }
  }, [notice, toast]);

  if (!target || !notice) return null;

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
