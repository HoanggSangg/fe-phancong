import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material';
import { CAR_STATUS_LABELS } from '../../utils/permissions';

const CarNotifyAdminDialog = ({
  open,
  onClose,
  car,
  getStatusConfig,
  onSend,
  sending = false,
}) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (open) setMessage('');
  }, [open, car?._id]);

  if (!car) return null;

  const statusConfig = getStatusConfig?.(car.status);
  const statusLabel = statusConfig?.label || CAR_STATUS_LABELS[car.status] || car.status;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSend(message.trim());
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Báo admin về trạng thái xe</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={800} color="primary">
              {car.plateNumber}
            </Typography>
            <Chip
              label={statusLabel}
              color={statusConfig?.color || 'default'}
              size="small"
            />
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Admin sẽ nhận thông báo trong lịch sử thao tác và đọc bằng giọng nói (nếu đang bật).
          </Typography>

          <TextField
            label="Nội dung gửi admin (tuỳ chọn)"
            placeholder="VD: Xe đã sửa xong, cần hỗ trợ giao xe..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
            size="small"
            multiline
            minRows={3}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined" disabled={sending}>
            Huỷ
          </Button>
          <Button type="submit" variant="contained" disabled={sending}>
            {sending ? 'Đang gửi...' : 'Gửi cho admin'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
};

export default CarNotifyAdminDialog;
