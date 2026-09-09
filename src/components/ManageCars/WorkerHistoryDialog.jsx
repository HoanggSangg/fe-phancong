import React from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  Autorenew,
  History,
  Person,
} from '@mui/icons-material';
import { ROLE_LABELS } from '../../utils/permissions';

const ACTION_LABELS = {
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  update_status: 'Đổi trạng thái',
  assign_workers: 'Phân công',
  manual_items: 'Hạng mục SC',
  upload: 'Tải lên',
  xuat_kho: 'Xuất kho',
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

const isFailedLog = (log) => log?.metadata?.success === false;

const getActionLabel = (log) => {
  const base = ACTION_LABELS[log.action] || log.action;
  return isFailedLog(log) ? `${base} (thất bại)` : base;
};

const WorkerHistoryDialog = ({
  open,
  onClose,
  isMobile,
  loading,
  error,
  data,
}) => {
  const operationLogs = data?.operationLogs || [];

  return (
  <Dialog
    open={open}
    onClose={onClose}
    maxWidth="md"
    fullWidth
    fullScreen={isMobile}
    PaperProps={{ sx: { borderRadius: isMobile ? 0 : 3 } }}
  >
    <DialogTitle>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <History color="secondary" />
        <Typography variant="h6" fontWeight="bold">
          Lịch sử thay đổi thợ
          {data?.plateNumber ? `: ${data.plateNumber}` : ''}
        </Typography>
      </Box>
    </DialogTitle>
    <DialogContent sx={{ p: isMobile ? 2 : 3 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : data ? (
        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={1}>
              <Autorenew color="primary" />
              <Typography variant="subtitle1" fontWeight={600}>
                Thợ hiện tại
              </Typography>
            </Stack>
            {data.currentWorkers?.length > 0 ? (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {data.currentWorkers.map((worker, index) => {
                  const roleLabel =
                    worker.role === 'main'
                      ? 'Thợ chính'
                      : worker.role === 'sub'
                        ? 'Thợ phụ'
                        : worker.roleLabel || worker.role;
                  const chipColor =
                    worker.role === 'main' ? 'primary' : worker.role === 'sub' ? 'secondary' : 'default';

                  return (
                    <Chip
                      key={`${worker.id || worker.name}-${index}`}
                      avatar={<Avatar><Person fontSize="small" /></Avatar>}
                      label={<><b>{worker.name}</b> ({roleLabel})</>}
                      color={chipColor}
                      variant="outlined"
                    />
                  );
                })}
              </Stack>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Không có thợ hiện tại.
              </Typography>
            )}
          </Paper>

          <Typography variant="subtitle1" fontWeight={600}>
            Lịch sử thao tác
          </Typography>

          {operationLogs.length > 0 ? (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Thời gian</strong></TableCell>
                      <TableCell><strong>Người thao tác</strong></TableCell>
                      <TableCell><strong>Hành động</strong></TableCell>
                      <TableCell><strong>Nội dung</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {operationLogs.map((log) => {
                      const details = Array.isArray(log.metadata?.details)
                        ? log.metadata.details.filter(Boolean)
                        : [];
                      const failed = isFailedLog(log);
                      return (
                        <TableRow key={log._id} hover sx={failed ? { bgcolor: '#fef2f2' } : undefined}>
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            {formatDateTime(log.createdAt)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {log.fullName || log.username || '—'}
                            </Typography>
                            {log.role ? (
                              <Typography variant="caption" color="text.secondary">
                                {ROLE_LABELS[log.role] || log.role}
                              </Typography>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={getActionLabel(log)}
                              color={failed ? 'error' : 'default'}
                              variant="outlined"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color={failed ? 'error.main' : 'text.primary'}>
                              {log.description || '—'}
                            </Typography>
                            {details.length > 0 && (
                              <Stack component="ul" sx={{ m: 0, pl: 2.2, mt: 0.5 }}>
                                {details.map((line, index) => (
                                  <Typography
                                    key={`${log._id}-detail-${index}`}
                                    component="li"
                                    variant="caption"
                                    color="text.secondary"
                                  >
                                    {line}
                                  </Typography>
                                ))}
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          ) : (
            <Alert severity="info">Chưa có lịch sử thao tác của xe này.</Alert>
          )}
        </Stack>
      ) : null}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onClose} variant="outlined">
        Đóng
      </Button>
    </DialogActions>
  </Dialog>
  );
};

export default WorkerHistoryDialog;
