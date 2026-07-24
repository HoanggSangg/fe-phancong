import React from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { formatMoney } from '../../utils/dateFilters';
import { QUICK_STATUSES, getStatusMeta } from '../../utils/attendanceUi';
import { WEEKDAYS } from './constants';

const AttendanceCalendarTab = ({
  calLoading,
  calendarData,
  calendarCells,
  worker,
  rates,
  summary,
  multiMode,
  setMultiMode,
  applyStatus,
  setApplyStatus,
  rangeFrom,
  setRangeFrom,
  rangeTo,
  setRangeTo,
  quickDays,
  setQuickDays,
  selectedDates,
  setSelectedDates,
  saving,
  onApplySelected,
  onToggleSelectDate,
}) => {
  if (calLoading || !calendarData) {
    return (
      <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
    );
  }

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <Chip label={`LCB: ${formatMoney(worker?.luongCoBan)}`} />
        <Chip label={`Công chuẩn: ${calendarData.ngayCongChuan} ngày`} color="primary" variant="outlined" />
        <Chip label={`Lương ngày: ${formatMoney(rates?.luongNgay)}`} />
        <Chip label={`Lương giờ: ${formatMoney(rates?.luongGio)}`} />
        <Chip label={`Nghỉ KL: ${summary?.ngayNghiKhongLuong || 0}`} color="error" variant="outlined" />
        <Chip label={`Giờ thiếu: ${summary?.tongGioThieu || 0}h`} color="warning" variant="outlined" />
        <Chip label={`Tiền trừ: ${formatMoney(summary?.tienTruNgayCong)}`} color="error" />
      </Stack>

      <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ md: 'center' }}>
          <FormControlLabel
            control={<Switch checked={multiMode} onChange={(e) => setMultiMode(e.target.checked)} />}
            label="Chọn nhiều ngày"
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Áp dụng trạng thái</InputLabel>
            <Select label="Áp dụng trạng thái" value={applyStatus} onChange={(e) => setApplyStatus(e.target.value)}>
              {QUICK_STATUSES.map((s) => (
                <MenuItem key={s.status} value={s.status}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            label="Từ ngày"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={rangeFrom}
            onChange={(e) => setRangeFrom(e.target.value)}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            label="Đến ngày"
            type="date"
            InputLabelProps={{ shrink: true }}
            value={rangeTo}
            onChange={(e) => setRangeTo(e.target.value)}
            sx={{ width: 150 }}
          />
          <TextField
            size="small"
            label="Nhập nhanh (3, 7, 12)"
            value={quickDays}
            onChange={(e) => setQuickDays(e.target.value)}
            sx={{ minWidth: 160 }}
          />
          <Button variant="contained" size="small" onClick={onApplySelected} disabled={saving}>
            Áp dụng
          </Button>
          {selectedDates.length > 0 && (
            <Chip label={`Đã chọn ${selectedDates.length} ngày`} onDelete={() => setSelectedDates([])} />
          )}
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.75,
        }}
      >
        {WEEKDAYS.map((d) => (
          <Box key={d} sx={{ textAlign: 'center', fontWeight: 700, fontSize: 12, color: 'text.secondary', py: 0.5 }}>
            {d}
          </Box>
        ))}
        {calendarCells.map((day, idx) => {
          if (!day) return <Box key={`b-${idx}`} />;
          const meta = getStatusMeta(day.status);
          const selected = selectedDates.includes(day.date);
          const dayNum = Number(day.date.slice(-2));
          return (
            <Paper
              key={day.date}
              variant="outlined"
              onClick={() => onToggleSelectDate(day.date, day.isSunday)}
              sx={{
                p: 0.75,
                minHeight: 88,
                cursor: day.isSunday ? 'default' : 'pointer',
                bgcolor: day.isSunday ? '#f1f5f9' : meta.bg,
                borderColor: selected ? 'primary.main' : 'divider',
                borderWidth: selected ? 2 : 1,
                opacity: day.isSunday ? 0.85 : 1,
                '&:hover': day.isSunday ? undefined : { boxShadow: 1 },
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" fontWeight={800}>{dayNum}</Typography>
                {multiMode && !day.isSunday && (
                  <Checkbox size="small" checked={selected} sx={{ p: 0 }} />
                )}
              </Stack>
              <Typography variant="caption" sx={{ color: meta.color, fontWeight: 700, display: 'block', lineHeight: 1.2 }}>
                {meta.label}
              </Typography>
              {(day.missingMinutes > 0 || day.lateMinutes > 0 || day.earlyLeaveMinutes > 0) && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {day.missingMinutes ? `${day.missingMinutes}′ thiếu` : ''}
                  {day.lateMinutes ? ` trễ ${day.lateMinutes}′` : ''}
                  {day.earlyLeaveMinutes ? ` sớm ${day.earlyLeaveMinutes}′` : ''}
                </Typography>
              )}
              {day.deductionAmount > 0 && (
                <Typography variant="caption" color="error.main" fontWeight={700}>
                  -{formatMoney(day.deductionAmount)}
                </Typography>
              )}
              {day.note && (
                <Typography variant="caption" color="text.secondary" noWrap display="block">
                  {day.note}
                </Typography>
              )}
            </Paper>
          );
        })}
      </Box>
    </>
  );
};

export default AttendanceCalendarTab;
