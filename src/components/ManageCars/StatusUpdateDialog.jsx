import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { Person, SwapHoriz } from '@mui/icons-material';

const StatusUpdateDialog = ({
  open,
  onClose,
  statusUpdateData,
  selectedNewWorker,
  onSelectedNewWorkerChange,
  availableWorkers,
  getStatusConfig,
  onConfirm,
}) => {
  const { car, newStatus, needsWorker } = statusUpdateData || {};

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SwapHoriz color="primary" />
          <Typography variant="h6" fontWeight="bold">Chuyển trạng thái xe</Typography>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        {car && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" color="primary" gutterBottom>
              {car.plateNumber}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Từ: <strong>{getStatusConfig(car.status).label}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Sang: <strong>{getStatusConfig(newStatus).label}</strong>
            </Typography>
          </Box>
        )}

        {needsWorker && (
          <Box>
            <Typography variant="body1" gutterBottom>
              {newStatus === 'waiting_wash'
                ? 'Chọn thợ để rửa xe (tùy chọn - để trống sẽ giữ thợ cũ):'
                : newStatus === 'waiting_handover'
                  ? 'Chọn người giao xe hoặc để trống nếu khách tự lấy xe:'
                  : newStatus === 'additional_repair'
                    ? 'Chọn thợ mới cho sửa bổ sung (bắt buộc):'
                    : 'Chọn thợ cho công việc này:'}
            </Typography>
            <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
              <InputLabel>Chọn thợ</InputLabel>
              <Select
                value={selectedNewWorker}
                onChange={(e) => onSelectedNewWorkerChange(e.target.value)}
                label="Chọn thợ"
              >
                {newStatus === 'waiting_wash' && (
                  <MenuItem value="">
                    <em>Giữ thợ cũ</em>
                  </MenuItem>
                )}
                {newStatus === 'waiting_handover' && (
                  <MenuItem value="">
                    <em>Khách tự lấy xe</em>
                  </MenuItem>
                )}
                {availableWorkers.map((worker) => (
                  <MenuItem key={worker._id} value={worker._id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Person fontSize="small" />
                      <Box>
                        <Typography variant="body2">{worker.name}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          Trạng thái: {worker.status === 'available' ? 'Rảnh' : 'Bận'}
                        </Typography>
                      </Box>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {availableWorkers.length === 0 && (
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                Hiện tại không có thợ nào rảnh. Vui lòng thử lại sau.
              </Alert>
            )}

            {newStatus === 'waiting_wash' && (
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  💡 <strong>Lưu ý:</strong> Nếu không chọn thợ mới, thợ hiện tại sẽ tiếp tục rửa xe và vẫn ở trạng thái bận.
                </Typography>
              </Alert>
            )}
            {newStatus === 'waiting_handover' && (
              <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  🚗 <strong>Giao xe:</strong> Chọn thợ/tài xế nếu cần người giao xe. Nếu khách tự lấy xe thì để trống.
                </Typography>
              </Alert>
            )}
            {newStatus === 'additional_repair' && (
              <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  ⚠️ <strong>Bắt buộc:</strong> Phải chọn thợ mới để thực hiện sửa chữa bổ sung.
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {!needsWorker && (
          <Box>
            {newStatus === 'waiting_handover' && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  ✅ Xe sẽ chuyển sang trạng thái chờ giao. Thợ hiện tại sẽ được giải phóng.
                </Typography>
              </Alert>
            )}
            {newStatus === 'delivered' && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                <Typography variant="body2">
                  🎉 Xe sẽ được đánh dấu là đã giao. Tất cả thợ liên quan sẽ được giải phóng.
                </Typography>
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'center', gap: 2, p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Hủy
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          disabled={
            (newStatus === 'additional_repair' && !selectedNewWorker)
            || (availableWorkers.length === 0 && needsWorker && newStatus !== 'waiting_wash')
          }
        >
          Xác nhận
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StatusUpdateDialog;
