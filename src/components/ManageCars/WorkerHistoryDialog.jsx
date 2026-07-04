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
  AddCircle,
  RemoveCircle,
} from '@mui/icons-material';
import { formatHistoryNote } from '../../utils/manageCarsHelpers';

const getHistoryActionMeta = (log) => {
  if (log.action === 'removed' || log.action === 'reassigned') {
    return { text: log.actionLabel || 'Đã thay đổi', color: 'error.main', Icon: RemoveCircle };
  }
  if (log.action === 'added') {
    return { text: log.actionLabel || 'Thêm mới', color: 'success.main', Icon: AddCircle };
  }
  return { text: log.actionLabel || log.action, color: 'text.primary', Icon: Person };
};

const WorkerHistoryDialog = ({
  open,
  onClose,
  isMobile,
  loading,
  error,
  data,
}) => (
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

          {data.historyLogs?.length > 0 ? (
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ maxHeight: 360, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>Thợ</strong></TableCell>
                      <TableCell><strong>Hành động</strong></TableCell>
                      <TableCell><strong>Giai đoạn</strong></TableCell>
                      <TableCell><strong>Ghi chú</strong></TableCell>
                      <TableCell><strong>Thời gian</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.historyLogs.map((log) => {
                      const { text, color, Icon } = getHistoryActionMeta(log);
                      return (
                        <TableRow key={log.id || `${log.name}-${log.timestamp}`} hover>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Avatar sx={{ width: 28, height: 28 }}>
                                <Person fontSize="small" />
                              </Avatar>
                              <span>{log.name}</span>
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ color, fontWeight: 600 }}>
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                              <Icon fontSize="small" />
                              <span>{text}</span>
                            </Stack>
                          </TableCell>
                          <TableCell>{log.phaseLabel || '—'}</TableCell>
                          <TableCell>{formatHistoryNote(log.note) || '—'}</TableCell>
                          <TableCell>{new Date(log.timestamp).toLocaleString('vi-VN')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Paper>
          ) : (
            <Alert severity="info">Chưa có lịch sử thay đổi thợ.</Alert>
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

export default WorkerHistoryDialog;
