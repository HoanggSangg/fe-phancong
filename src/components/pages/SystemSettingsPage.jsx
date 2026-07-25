import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import StopCircleIcon from '@mui/icons-material/StopCircle';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CampaignIcon from '@mui/icons-material/Campaign';
import NotificationsOffIcon from '@mui/icons-material/NotificationsOff';
import SystemUpdateAltIcon from '@mui/icons-material/SystemUpdateAlt';
import {
  getSystemSettings,
  updateSystemSettings,
  publishSystemUpdate,
} from '../apis';
import { useToast } from '../../context/ToastContext';
import { API_BASE } from '../apis/axios';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';

const buildDefaultVersion = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}.1`;
};

const formatDateTime = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatUptime = (seconds) => {
  const total = Math.max(0, Number(seconds) || 0);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h} giờ ${m} phút`;
  if (m > 0) return `${m} phút ${s} giây`;
  return `${s} giây`;
};

const InfoRow = ({ label, value, mono = false }) => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 2,
      py: 0.85,
    }}
  >
    <Typography variant="body2" color="text.secondary" sx={{ flexShrink: 0 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      fontWeight={600}
      sx={{
        textAlign: 'right',
        wordBreak: 'break-all',
        fontFamily: mono ? 'ui-monospace, SFMono-Regular, Menlo, monospace' : undefined,
        fontSize: mono ? '0.8rem' : undefined,
      }}
    >
      {value ?? '—'}
    </Typography>
  </Box>
);

const SectionCard = ({ title, children, action }) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 1.5, sm: 2 },
      border: '1px solid #e2e8f0',
      borderRadius: 2,
      height: '100%',
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
      <Typography variant="subtitle1" fontWeight={800}>
        {title}
      </Typography>
      {action}
    </Box>
    <Divider sx={{ mb: 1 }} />
    {children}
  </Paper>
);

const SystemSettingsPage = () => {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [publishVersion, setPublishVersion] = useState(buildDefaultVersion);
  const [publishMessage, setPublishMessage] = useState('Hệ thống vừa được cập nhật. Vui lòng tải lại trang.');
  const [forceReload, setForceReload] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getSystemSettings();
      const payload = res.data?.data || null;
      setData(payload);
      setMessage(payload?.maintenanceMessage || '');
      setNoticeMessage(payload?.maintenanceNoticeMessage || '');
      if (payload?.appVersion?.version) {
        // gợi ý bản tiếp theo cùng ngày
        const current = String(payload.appVersion.version);
        const base = buildDefaultVersion().replace(/\.1$/, '');
        if (current.startsWith(base)) {
          const parts = current.split('.');
          const last = Number(parts[parts.length - 1]) || 0;
          setPublishVersion(`${base}.${last + 1}`);
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không tải được cấu hình hệ thống');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const maintenanceOn = Boolean(data?.maintenanceMode);
  const noticeActive = Boolean(data?.maintenanceNoticeActive);
  const runtime = data?.runtime || {};

  const persist = async (payload, fallbackSuccess) => {
    setSaving(true);
    try {
      const res = await updateSystemSettings(payload);
      const next = res.data?.data || null;
      setData((prev) => ({
        ...(prev || {}),
        ...(next || {}),
        online: next?.online || prev?.online,
        appVersion: {
          ...(prev?.appVersion || {}),
          ...(next?.appVersion || {}),
          updatedByUser: next?.appVersion?.updatedByUser || prev?.appVersion?.updatedByUser || null,
        },
      }));
      if (next?.maintenanceMessage != null) setMessage(next.maintenanceMessage);
      if (next?.maintenanceNoticeMessage != null) setNoticeMessage(next.maintenanceNoticeMessage);
      toast.success(res.data?.message || fallbackSuccess);
      setConfirmOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setSaving(false);
    }
  };

  const applyMaintenance = (nextMode) =>
    persist(
      {
        maintenanceMode: nextMode,
        maintenanceMessage: message.trim() || undefined,
      },
      nextMode ? 'Đã dừng web (bảo trì)' : 'Đã mở lại web',
    );

  const sendNotice = () =>
    persist(
      {
        maintenanceNoticeActive: true,
        maintenanceNoticeMessage: noticeMessage.trim() || undefined,
        maintenanceMessage: message.trim() || undefined,
      },
      'Đã gửi thông báo sắp bảo trì',
    );

  const cancelNotice = () =>
    persist({ maintenanceNoticeActive: false }, 'Đã hủy thông báo sắp bảo trì');

  const handlePrimaryAction = () => {
    if (maintenanceOn) {
      applyMaintenance(false);
      return;
    }
    setConfirmOpen(true);
  };

  const handlePublishUpdate = async () => {
    if (publishing) return;
    setPublishing(true);
    try {
      const res = await publishSystemUpdate({
        version: publishVersion.trim(),
        message: publishMessage.trim() || 'Hệ thống vừa được cập nhật.',
        forceReload: Boolean(forceReload),
      });
      toast.success(res.data?.message || 'Đã phát hành cập nhật');
      setPublishConfirmOpen(false);
      await fetchSettings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Phát hành cập nhật thất bại');
    } finally {
      setPublishing(false);
    }
  };

  const appVersion = data?.appVersion || {};
  const online = data?.online || {};

  return (
    <PageLayout>
      <PageHeader
        icon={<SettingsIcon />}
        title="Cài đặt hệ thống"
        subtitle="Thông tin cấu hình và điều khiển bảo trì web"
        actions={(
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchSettings}
            disabled={loading || saving || publishing}
          >
            Làm mới
          </Button>
        )}
      />

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Grid container spacing={2}>
          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: noticeActive ? '1px solid #fcd34d' : '1px solid #e2e8f0',
                bgcolor: noticeActive ? '#fffbeb' : '#fff',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                mb={2}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.75} flexWrap="wrap">
                    <Typography variant="h6" fontWeight={800}>
                      Thông báo trước bảo trì
                    </Typography>
                    <Chip
                      size="small"
                      color={noticeActive ? 'warning' : 'default'}
                      label={noticeActive ? 'Đang hiện cho GS & KTV' : 'Chưa gửi'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Gửi thông báo trước khi dừng web để giám sát và KTV kịp hoàn tất công việc.
                  </Typography>
                  {noticeActive && (
                    <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                      Đã gửi lúc: {formatDateTime(data?.maintenanceNoticeAt)}
                    </Typography>
                  )}
                </Box>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                  <Button
                    variant="contained"
                    color="warning"
                    startIcon={<CampaignIcon />}
                    onClick={sendNotice}
                    disabled={saving || maintenanceOn}
                    sx={{ fontWeight: 700, textTransform: 'none' }}
                  >
                    {noticeActive ? 'Gửi lại thông báo' : 'Thông báo sắp bảo trì'}
                  </Button>
                  {noticeActive && !maintenanceOn && (
                    <Button
                      variant="outlined"
                      color="inherit"
                      startIcon={<NotificationsOffIcon />}
                      onClick={cancelNotice}
                      disabled={saving}
                      sx={{ textTransform: 'none' }}
                    >
                      Hủy thông báo
                    </Button>
                  )}
                </Stack>
              </Stack>

              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Nội dung thông báo trước"
                value={noticeMessage}
                onChange={(e) => setNoticeMessage(e.target.value)}
                sx={{ bgcolor: '#fff' }}
                helperText="Giám sát và KTV sẽ thấy banner + hộp thoại với nội dung này"
                inputProps={{ maxLength: 500 }}
                disabled={maintenanceOn}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: maintenanceOn ? '1px solid #fca5a5' : '1px solid #bbf7d0',
                bgcolor: maintenanceOn ? '#fef2f2' : '#f0fdf4',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.75}>
                    <Typography variant="h6" fontWeight={800}>
                      Chế độ bảo trì
                    </Typography>
                    <Chip
                      size="small"
                      color={maintenanceOn ? 'error' : 'success'}
                      label={maintenanceOn ? 'Đang dừng web' : 'Web đang hoạt động'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {maintenanceOn
                      ? 'Người dùng (không phải admin) không thể sử dụng hệ thống.'
                      : noticeActive
                        ? 'Đã thông báo trước. Có thể dừng web khi sẵn sàng.'
                        : 'Nên gửi thông báo trước, sau đó mới dừng web.'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mt={0.75}>
                    Cập nhật lần cuối: {formatDateTime(data?.updatedAt)}
                  </Typography>
                </Box>

                <Button
                  variant="contained"
                  color={maintenanceOn ? 'success' : 'error'}
                  size="large"
                  startIcon={maintenanceOn ? <PlayCircleIcon /> : <StopCircleIcon />}
                  onClick={handlePrimaryAction}
                  disabled={saving}
                  sx={{ minWidth: 200, fontWeight: 700, textTransform: 'none' }}
                >
                  {saving
                    ? 'Đang xử lý...'
                    : maintenanceOn
                      ? 'Mở lại web'
                      : 'Dừng web (bảo trì)'}
                </Button>
              </Stack>

              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Thông báo khi đang bảo trì"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                sx={{ mt: 2, bgcolor: '#fff' }}
                helperText="Hiển thị trên trang bảo trì khi web đã dừng"
                inputProps={{ maxLength: 500 }}
              />
            </Paper>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                borderRadius: 2,
                border: '1px solid #bfdbfe',
                bgcolor: '#eff6ff',
              }}
            >
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
                mb={2}
              >
                <Box>
                  <Stack direction="row" spacing={1} alignItems="center" mb={0.75} flexWrap="wrap">
                    <SystemUpdateAltIcon color="primary" />
                    <Typography variant="h6" fontWeight={800}>
                      Cập nhật hệ thống
                    </Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Phát thông báo realtime sau khi bảo trì xong để các máy đang mở web tải lại.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  startIcon={<SystemUpdateAltIcon />}
                  onClick={() => setPublishConfirmOpen(true)}
                  disabled={publishing || !publishVersion.trim()}
                  sx={{ fontWeight: 700, textTransform: 'none', minWidth: 200 }}
                >
                  {publishing ? 'Đang phát hành...' : 'Phát hành cập nhật'}
                </Button>
              </Stack>

              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <InfoRow label="Phiên bản hiện tại" value={appVersion.version || '1.0.0'} mono />
                  <InfoRow label="Cập nhật gần nhất" value={formatDateTime(appVersion.updatedAt)} />
                  <InfoRow
                    label="Người phát hành"
                    value={appVersion.updatedByUser?.fullName || appVersion.updatedByUser?.username || '—'}
                  />
                  <InfoRow label="Kết nối đang online" value={online.totalConnections ?? 0} />
                  <InfoRow label="Tài khoản đang online" value={online.totalUsers ?? 0} />
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Phiên bản mới"
                    value={publishVersion}
                    onChange={(e) => setPublishVersion(e.target.value)}
                    sx={{ mb: 1.5, bgcolor: '#fff' }}
                    inputProps={{ maxLength: 64 }}
                    helperText="Ví dụ: 2026.07.25.1"
                  />
                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    label="Nội dung thông báo"
                    value={publishMessage}
                    onChange={(e) => setPublishMessage(e.target.value)}
                    sx={{ mb: 1, bgcolor: '#fff' }}
                    inputProps={{ maxLength: 500 }}
                  />
                  <FormControlLabel
                    control={(
                      <Checkbox
                        checked={forceReload}
                        onChange={(e) => setForceReload(e.target.checked)}
                      />
                    )}
                    label="Bắt buộc tải lại (đếm ngược 10 giây)"
                  />
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Kết nối frontend">
              <InfoRow label="API base URL" value={API_BASE} mono />
              <InfoRow
                label="Chế độ FE"
                value={import.meta.env.DEV ? 'development' : 'production'}
              />
              <InfoRow
                label="VITE_API_URL"
                value={import.meta.env.VITE_API_URL || '(mặc định theo host)'}
                mono
              />
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard
              title="Trạng thái server"
              action={(
                <Chip
                  size="small"
                  icon={runtime.server?.mongoConnected ? <CloudDoneIcon /> : <CloudOffIcon />}
                  color={runtime.server?.mongoConnected ? 'success' : 'warning'}
                  label={runtime.server?.mongoConnected ? 'MongoDB OK' : 'MongoDB lỗi'}
                />
              )}
            >
              <InfoRow label="Node env" value={runtime.server?.nodeEnv} />
              <InfoRow label="Port" value={runtime.server?.port} />
              <InfoRow label="Uptime" value={formatUptime(runtime.server?.uptimeSeconds)} />
              <InfoRow label="MongoDB" value={runtime.server?.mongoStatus} />
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Tác vụ tự động">
              <InfoRow
                label="Dọn việc ghi tay"
                value={runtime.features?.autoCleanupManualJobs ? 'Bật' : 'Tắt'}
              />
              <InfoRow
                label="Giờ dọn việc (VN)"
                value={`${runtime.features?.manualJobCleanupHour ?? 12}:00`}
              />
              <InfoRow
                label="Auto-trim DB"
                value={runtime.features?.autoTrimCollections ? 'Bật' : 'Tắt'}
              />
            </SectionCard>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <SectionCard title="Chính sách lưu dữ liệu">
              <InfoRow
                label="Xe delivered giữ"
                value={`${runtime.features?.trim?.deliveredCarMonths ?? '—'} tháng / max ${runtime.features?.trim?.carMax?.toLocaleString?.('vi-VN') ?? '—'}`}
              />
              <InfoRow
                label="Repair items max"
                value={runtime.features?.trim?.repairItemMax?.toLocaleString?.('vi-VN')}
              />
              <InfoRow
                label="Lịch sử thao tác"
                value={`${runtime.features?.trim?.operationLogDays ?? '—'} ngày`}
              />
              <InfoRow
                label="Tin nhắn KTV"
                value={`${runtime.features?.trim?.ktvMessageDays ?? '—'} ngày / max ${runtime.features?.trim?.ktvMessageMax?.toLocaleString?.('vi-VN') ?? '—'}`}
              />
            </SectionCard>
          </Grid>
        </Grid>
      )}

      <Dialog open={confirmOpen} onClose={() => !saving && setConfirmOpen(false)}>
        <DialogTitle>Xác nhận dừng web?</DialogTitle>
        <DialogContent>
          {!noticeActive && (
            <Alert severity="warning" sx={{ mb: 1.5 }}>
              Bạn chưa gửi thông báo trước cho giám sát và KTV.
            </Alert>
          )}
          <DialogContentText>
            Khi bật bảo trì, giám sát và KTV sẽ không truy cập được hệ thống.
            Chỉ tài khoản Admin còn vào được khu vực quản trị để mở lại web.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} disabled={saving}>
            Hủy
          </Button>
          {!noticeActive && (
            <Button
              color="warning"
              onClick={() => {
                setConfirmOpen(false);
                sendNotice();
              }}
              disabled={saving}
            >
              Gửi thông báo trước
            </Button>
          )}
          <Button
            color="error"
            variant="contained"
            onClick={() => applyMaintenance(true)}
            disabled={saving}
          >
            {saving ? 'Đang dừng...' : 'Dừng web ngay'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={publishConfirmOpen} onClose={() => !publishing && setPublishConfirmOpen(false)}>
        <DialogTitle>Xác nhận phát hành cập nhật?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 1 }}>
            Tất cả máy đang mở web sẽ nhận thông báo phiên bản{' '}
            <strong>{publishVersion.trim() || '—'}</strong>.
          </DialogContentText>
          {forceReload && (
            <Alert severity="warning" sx={{ mb: 1 }}>
              Đã bật bắt buộc tải lại (đếm ngược 10 giây).
            </Alert>
          )}
          <DialogContentText>
            {publishMessage.trim() || 'Hệ thống vừa được cập nhật.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPublishConfirmOpen(false)} disabled={publishing}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handlePublishUpdate}
            disabled={publishing || !publishVersion.trim()}
          >
            {publishing ? 'Đang phát hành...' : 'Phát hành'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default SystemSettingsPage;
