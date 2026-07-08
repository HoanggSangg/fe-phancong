import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import MessageIcon from '@mui/icons-material/Message';
import SettingsIcon from '@mui/icons-material/Settings';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import { useNavigate } from 'react-router-dom';
import {
  getKtvMessageSettings,
  getKtvMessages,
  markKtvMessageRead,
  updateKtvMessageSettings,
} from '../apis';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS } from '../../utils/permissions';
import { normalizeROKey } from '../../utils/carListHelpers';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import EnablePushNotificationButton from '../common/EnablePushNotificationButton';

const POLL_INTERVAL_MS = 15_000;

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

const getMessageCarId = (item) => {
  if (!item) return '';

  if (typeof item.car === 'string') return item.car;
  if (item.car?._id) return item.car._id;

  return (
    item.carId ||
    item.carObjectId ||
    item.vehicleId ||
    item.vehicle?._id ||
    ''
  );
};

const getMessageRoLabel = (item) => {
  if (!item) return '';
  return item.roNumber || item.roCode || item.roKey || '';
};

const MessageCard = ({ item, onMarkRead, markingId, onViewCar }) => {
  const isUnread = !item.readAt;
  const roLabel = getMessageRoLabel(item);

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 1.5,
        borderRadius: 2,
        borderWidth: isUnread ? 2 : 1,
        borderColor: isUnread ? 'warning.main' : 'divider',
        bgcolor: isUnread ? 'warning.50' : 'background.paper',
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Typography variant="subtitle1" fontWeight={800} color="primary">
            {item.plateNumber}
          </Typography>

          {roLabel && (
            <Chip
              label={`${roLabel}`}
              size="small"
              color="info"
              variant="outlined"
            />
          )}

          <Chip
            label={item.carStatusLabel || item.carStatus || '—'}
            size="small"
            color="primary"
            variant="outlined"
          />

          {isUnread ? (
            <Chip label="Chưa xem" size="small" color="warning" />
          ) : (
            <Chip label="Đã xem" size="small" color="success" />
          )}
        </Box>

        <Typography variant="caption" color="text.secondary">
          {formatDateTime(item.createdAt)}
        </Typography>
      </Box>

      <Typography variant="body2" sx={{ mb: 0.75 }}>
        <strong>KTV:</strong> {item.senderName || '—'}
      </Typography>

      {item.message ? (
        <Typography variant="body2" sx={{ mb: 0.75, whiteSpace: 'pre-wrap' }}>
          {item.message}
        </Typography>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.75, fontStyle: 'italic' }}>
          Không có nội dung bổ sung — chỉ báo trạng thái xe.
        </Typography>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        {item.locationName && <Chip label={`Địa điểm: ${item.locationName}`} size="small" />}
        {item.supervisorName && <Chip label={`GS: ${item.supervisorName}`} size="small" />}

        <Button
          size="small"
          variant="outlined"
          color="primary"
          startIcon={<DirectionsCarIcon />}
          onClick={() => onViewCar(item)}
        >
          Xem xe
        </Button>
      </Stack>

      {item.readAt && (
        <Typography variant="caption" color="success.main" display="block" sx={{ mb: 1 }}>
          Đã xem bởi {item.readByName || '—'} lúc {formatDateTime(item.readAt)}
        </Typography>
      )}

      {isUnread && (
        <Button
          size="small"
          variant="contained"
          color="success"
          startIcon={<MarkEmailReadIcon />}
          disabled={markingId === item._id}
          onClick={() => onMarkRead(item._id)}
        >
          {markingId === item._id ? 'Đang cập nhật...' : 'Đánh dấu đã xem'}
        </Button>
      )}
    </Paper>
  );
};

const KtvMessagesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [statusFilter, setStatusFilter] = useState('unread');
  const [messages, setMessages] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingId, setMarkingId] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [eligibleUsers, setEligibleUsers] = useState([]);
  const [selectedReceivers, setSelectedReceivers] = useState([]);
  const [settingsMessage, setSettingsMessage] = useState('');

  const fetchMessages = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError('');

    try {
      const res = await getKtvMessages({
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      });

      setMessages(res.data.items || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được tin nhắn KTV');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [statusFilter]);

  const fetchSettings = useCallback(async () => {
    if (!isAdmin) return;

    setSettingsLoading(true);

    try {
      const res = await getKtvMessageSettings();
      const users = res.data.eligibleUsers || [];
      const selectedIds = new Set((res.data.receiverUserIds || []).map(String));

      setEligibleUsers(users);
      setSelectedReceivers(users.filter((item) => selectedIds.has(String(item._id))));
    } catch (err) {
      setSettingsMessage(err.response?.data?.message || 'Không tải được cấu hình nhận tin');
    } finally {
      setSettingsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMessages();
    fetchSettings();

    const intervalId = setInterval(() => fetchMessages(true), POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [fetchMessages, fetchSettings]);

  const handleMarkRead = async (id) => {
    setMarkingId(id);

    try {
      await markKtvMessageRead(id);
      await fetchMessages(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Không đánh dấu được đã xem');
    } finally {
      setMarkingId('');
    }
  };

  const handleViewCar = (item) => {
    const carId = getMessageCarId(item);
    const plateNumber = item.plateNumber || '';
    const roCode = item.roCode || '';
    const roNumber = item.roNumber || '';
    const roKey = item.roKey || normalizeROKey(roNumber, roCode);

    const targetCar = {
      carId,
      plateNumber,
      roCode,
      roNumber,
      roKey,
      messageId: item._id || '',
    };

    sessionStorage.setItem('ktvTargetCar', JSON.stringify(targetCar));

    const params = new URLSearchParams();

    params.set('openCar', '1');

    if (carId) params.set('carId', carId);
    if (plateNumber) params.set('plateNumber', plateNumber);
    if (roCode) params.set('roCode', roCode);
    if (roNumber) params.set('roNumber', roNumber);
    if (roKey) params.set('roKey', roKey);
    if (item._id) params.set('messageId', item._id);

    navigate(`/cars/manage?${params.toString()}`);
  };

  const handleSaveSettings = async () => {
    setSettingsSaving(true);
    setSettingsMessage('');

    try {
      const res = await updateKtvMessageSettings(selectedReceivers.map((item) => item._id));
      setSettingsMessage(res.data.message || 'Đã lưu cấu hình');
      await fetchMessages(true);
    } catch (err) {
      setSettingsMessage(err.response?.data?.message || 'Lưu cấu hình thất bại');
    } finally {
      setSettingsSaving(false);
    }
  };

  const receiverHelperText = useMemo(() => {
    if (selectedReceivers.length === 0) {
      return 'Chưa chọn tài khoản — mặc định chỉ admin xem được tin nhắn.';
    }

    return `Đã chọn ${selectedReceivers.length} tài khoản nhận tin.`;
  }, [selectedReceivers.length]);

  return (
    <PageLayout>
      <PageHeader
        icon={<MessageIcon color="primary" />}
        title="Tin nhắn từ KTV"
        subtitle={`Theo dõi báo cáo trạng thái xe từ KTV — ${unreadCount} tin chưa xem`}
        actions={<EnablePushNotificationButton />}
      />

      {isAdmin && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
            <SettingsIcon fontSize="small" color="action" />

            <Typography variant="subtitle1" fontWeight={700}>
              Tài khoản nhận tin nhắn KTV
            </Typography>
          </Box>

          {settingsLoading ? (
            <CircularProgress size={24} />
          ) : (
            <Stack spacing={1.5}>
              <Autocomplete
                multiple
                options={eligibleUsers}
                value={selectedReceivers}
                onChange={(_, value) => setSelectedReceivers(value)}
                getOptionLabel={(option) => `${option.fullName} (@${option.username})`}
                isOptionEqualToValue={(option, value) => option._id === value._id}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    size="small"
                    label="Chọn tài khoản nhận tin"
                    helperText={receiverHelperText}
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option._id}
                      label={`${option.fullName} (${ROLE_LABELS[option.role] || option.role})`}
                      size="small"
                    />
                  ))
                }
              />

              <Alert severity="info" sx={{ py: 0.5 }}>
                Giám sát được chọn cần được cấp quyền &quot;Tin nhắn KTV&quot; trong Phân chức năng để vào trang này.
              </Alert>

              <Box>
                <Button
                  variant="contained"
                  size="small"
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                >
                  {settingsSaving ? 'Đang lưu...' : 'Lưu cấu hình'}
                </Button>
              </Box>

              {settingsMessage && (
                <Alert severity="info" onClose={() => setSettingsMessage('')}>
                  {settingsMessage}
                </Alert>
              )}
            </Stack>
          )}
        </Paper>
      )}

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {[
          { key: 'unread', label: `Chưa xem (${unreadCount})` },
          { key: 'read', label: 'Đã xem' },
          { key: 'all', label: 'Tất cả' },
        ].map((item) => (
          <Chip
            key={item.key}
            label={item.label}
            color={statusFilter === item.key ? 'primary' : 'default'}
            variant={statusFilter === item.key ? 'filled' : 'outlined'}
            onClick={() => setStatusFilter(item.key)}
            sx={{ fontWeight: 700 }}
          />
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : messages.length === 0 ? (
        <Typography align="center" color="text.secondary" variant="body2">
          {statusFilter === 'unread' ? 'Không có tin nhắn chưa xem.' : 'Chưa có tin nhắn nào.'}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {messages.map((item) => (
            <MessageCard
              key={item._id}
              item={item}
              onMarkRead={handleMarkRead}
              onViewCar={handleViewCar}
              markingId={markingId}
            />
          ))}
        </Stack>
      )}
    </PageLayout>
  );
};

export default KtvMessagesPage;