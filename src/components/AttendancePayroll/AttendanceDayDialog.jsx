import React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Stack,
  TextField,
  Typography,
  Chip,
} from '@mui/material';
import { QUICK_STATUSES, TIME_PRESETS } from '../../utils/attendanceUi';

const AttendanceDayDialog = ({
  dayDialog,
  dayForm,
  setDayForm,
  saving,
  onClose,
  onSave,
  onSelectStatus,
}) => (
  <Dialog open={Boolean(dayDialog)} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>
      Chấm công ngày {dayDialog?.date}
      <Typography variant="body2" color="text.secondary">
        Click nhanh hoặc nhập chi tiết phút / giờ
      </Typography>
    </DialogTitle>
    <DialogContent dividers>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {QUICK_STATUSES.map((s) => (
          <Chip
            key={s.status}
            label={s.label}
            size="small"
            clickable
            color={dayForm.status === s.status ? 'primary' : 'default'}
            variant={dayForm.status === s.status ? 'filled' : 'outlined'}
            onClick={() => onSelectStatus(s.status)}
          />
        ))}
      </Stack>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        {TIME_PRESETS.map((p) => (
          <Button
            key={p.label}
            size="small"
            variant="outlined"
            onClick={() => setDayForm((prev) => ({
              ...prev,
              status: p.patch.status,
              lateMinutes: p.patch.lateMinutes ?? 0,
              earlyLeaveMinutes: p.patch.earlyLeaveMinutes ?? 0,
              leaveMinutes: p.patch.leaveMinutes ?? 0,
            }))}
          >
            {p.label}
          </Button>
        ))}
      </Stack>
      <Grid container spacing={1.25}>
        <Grid size={{ xs: 6 }}>
          <TextField
            label="Giờ vào chuẩn"
            size="small"
            fullWidth
            value={dayForm.standardCheckIn || ''}
            onChange={(e) => setDayForm((p) => ({ ...p, standardCheckIn: e.target.value }))}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            label="Giờ ra chuẩn"
            size="small"
            fullWidth
            value={dayForm.standardCheckOut || ''}
            onChange={(e) => setDayForm((p) => ({ ...p, standardCheckOut: e.target.value }))}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            label="Giờ vào thực tế"
            size="small"
            fullWidth
            value={dayForm.actualCheckIn || ''}
            onChange={(e) => setDayForm((p) => ({ ...p, actualCheckIn: e.target.value }))}
          />
        </Grid>
        <Grid size={{ xs: 6 }}>
          <TextField
            label="Giờ ra thực tế"
            size="small"
            fullWidth
            value={dayForm.actualCheckOut || ''}
            onChange={(e) => setDayForm((p) => ({ ...p, actualCheckOut: e.target.value }))}
          />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <TextField
            label="Phút đi trễ"
            type="number"
            size="small"
            fullWidth
            value={dayForm.lateMinutes ?? 0}
            onChange={(e) => setDayForm((p) => ({ ...p, lateMinutes: Number(e.target.value) || 0 }))}
          />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <TextField
            label="Phút về sớm"
            type="number"
            size="small"
            fullWidth
            value={dayForm.earlyLeaveMinutes ?? 0}
            onChange={(e) => setDayForm((p) => ({ ...p, earlyLeaveMinutes: Number(e.target.value) || 0 }))}
          />
        </Grid>
        <Grid size={{ xs: 4 }}>
          <TextField
            label="Phút nghỉ"
            type="number"
            size="small"
            fullWidth
            value={dayForm.leaveMinutes ?? 0}
            onChange={(e) => setDayForm((p) => ({ ...p, leaveMinutes: Number(e.target.value) || 0 }))}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <TextField
            label="Ghi chú"
            size="small"
            fullWidth
            value={dayForm.note || ''}
            onChange={(e) => setDayForm((p) => ({ ...p, note: e.target.value }))}
          />
        </Grid>
      </Grid>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Hủy</Button>
      <Button variant="contained" onClick={onSave} disabled={saving}>
        Lưu ngày
      </Button>
    </DialogActions>
  </Dialog>
);

export default AttendanceDayDialog;
