import React from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

const AttendanceSettingsDialog = ({
  open,
  onClose,
  settingsForm,
  setSettingsForm,
  holidayInput,
  setHolidayInput,
  onSave,
}) => (
  <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
    <DialogTitle>Cấu hình chấm công / ngày công</DialogTitle>
    <DialogContent dividers>
      <Stack spacing={1.5}>
        <TextField
          label="Số giờ / ngày làm việc"
          type="number"
          size="small"
          value={settingsForm.hoursPerDay ?? 8}
          onChange={(e) => setSettingsForm((p) => ({ ...p, hoursPerDay: Number(e.target.value) || 8 }))}
        />
        <TextField
          label="Giờ vào chuẩn"
          size="small"
          value={settingsForm.standardCheckIn || '08:00'}
          onChange={(e) => setSettingsForm((p) => ({ ...p, standardCheckIn: e.target.value }))}
        />
        <TextField
          label="Giờ ra chuẩn"
          size="small"
          value={settingsForm.standardCheckOut || '17:00'}
          onChange={(e) => setSettingsForm((p) => ({ ...p, standardCheckOut: e.target.value }))}
        />
        <Divider />
        <Typography variant="subtitle2" fontWeight={700}>Ngày lễ hưởng lương</Typography>
        <Stack direction="row" spacing={1}>
          <TextField
            label="Ngày"
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={holidayInput.date}
            onChange={(e) => setHolidayInput((p) => ({ ...p, date: e.target.value }))}
          />
          <TextField
            label="Tên lễ"
            size="small"
            value={holidayInput.name}
            onChange={(e) => setHolidayInput((p) => ({ ...p, name: e.target.value }))}
          />
          <Button
            variant="outlined"
            onClick={() => {
              if (!holidayInput.date) return;
              setSettingsForm((p) => ({
                ...p,
                paidHolidays: [
                  ...(p.paidHolidays || []).filter((h) => h.date !== holidayInput.date),
                  { ...holidayInput },
                ],
              }));
              setHolidayInput({ date: '', name: '' });
            }}
          >
            Thêm
          </Button>
        </Stack>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {(settingsForm.paidHolidays || []).map((h) => (
            <Chip
              key={h.date}
              label={`${h.date}${h.name ? ` — ${h.name}` : ''}`}
              onDelete={() => setSettingsForm((p) => ({
                ...p,
                paidHolidays: (p.paidHolidays || []).filter((x) => x.date !== h.date),
              }))}
            />
          ))}
        </Stack>
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Đóng</Button>
      <Button variant="contained" onClick={onSave}>Lưu</Button>
    </DialogActions>
  </Dialog>
);

export default AttendanceSettingsDialog;
