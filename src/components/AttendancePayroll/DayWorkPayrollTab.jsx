import React from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { formatMoney } from '../../utils/dateFilters';
import { MONEY_FIELDS } from './constants';

const DayWorkPayrollTab = ({
  payrollLoading,
  payrollRows,
  payrollTotals,
  payrollMeta,
  selectedRow,
  setSelectedRow,
  updatePayrollRow,
}) => {
  if (payrollLoading) {
    return (
      <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
    );
  }

  return (
    <>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <Chip label={`Công chuẩn: ${payrollMeta.ngayCongChuan ?? '—'} ngày`} />
        <Chip label={`${payrollMeta.hoursPerDay || 8} giờ/ngày`} />
        <Chip label={`Tổng thực nhận: ${formatMoney(payrollTotals.luongThucNhan)}`} color="success" />
        <Chip label={`Tiền trừ công: ${formatMoney(payrollTotals.tienTruNgayCong)}`} color="error" variant="outlined" />
      </Stack>
      <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
        <Table stickyHeader size="small" sx={{ minWidth: 1600 }}>
          <TableHead>
            <TableRow>
              {['STT', 'Họ tên', 'Bộ phận', 'LCB', 'Công TT', 'Giờ thiếu', 'Tiền trừ', 'Lương theo công', 'Phụ cấp', 'Thưởng', 'BH', 'Tạm ứng', 'Thực nhận'].map((h) => (
                <TableCell key={h} align={h === 'STT' || h === 'Họ tên' || h === 'Bộ phận' ? 'left' : 'right'} sx={{ fontWeight: 700 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {payrollRows.map((row, index) => {
              const c = row.computed || {};
              return (
                <TableRow
                  key={String(row.worker || index)}
                  hover
                  selected={selectedRow === index}
                  onClick={() => setSelectedRow(index)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{row.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{row.soBaoDanh || '—'}</Typography>
                  </TableCell>
                  <TableCell>{row.boPhan || '—'}</TableCell>
                  <TableCell align="right">{formatMoney(row.luongCoBan)}</TableCell>
                  <TableCell align="right">{row.ngayCongThucTe}</TableCell>
                  <TableCell align="right">{row.tongGioThieu}</TableCell>
                  <TableCell align="right">{formatMoney(c.tienTruNgayCong)}</TableCell>
                  <TableCell align="right">{formatMoney(c.luongTheoNgayCong)}</TableCell>
                  <TableCell align="right">{formatMoney(row.phuCap)}</TableCell>
                  <TableCell align="right">{formatMoney(row.thuong)}</TableCell>
                  <TableCell align="right">{formatMoney(c.baoHiem)}</TableCell>
                  <TableCell align="right">{formatMoney(row.tamUng)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>
                    {formatMoney(c.luongThucNhan)}
                  </TableCell>
                </TableRow>
              );
            })}
            {!payrollRows.length && (
              <TableRow>
                <TableCell colSpan={13} align="center">
                  Chưa có dữ liệu — bấm Đồng bộ chấm công.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Drawer
        anchor="right"
        open={selectedRow != null}
        onClose={() => setSelectedRow(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 400 } } }}
      >
        {selectedRow != null && payrollRows[selectedRow] && (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="h6" fontWeight={800}>{payrollRows[selectedRow].name}</Typography>
              <IconButton onClick={() => setSelectedRow(null)}><CloseIcon /></IconButton>
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Khoản thưởng / phụ cấp / khấu trừ tháng (không trừ trùng ngày công)
            </Typography>
            <Stack spacing={1.25}>
              {MONEY_FIELDS.map((f) => (
                <TextField
                  key={f.key}
                  label={f.label}
                  type="number"
                  size="small"
                  fullWidth
                  value={payrollRows[selectedRow][f.key] ?? 0}
                  onChange={(e) => updatePayrollRow(selectedRow, { [f.key]: Number(e.target.value) || 0 })}
                />
              ))}
              <FormControlLabel
                control={(
                  <Switch
                    checked={Boolean(payrollRows[selectedRow].thamGiaBaoHiem)}
                    onChange={(e) => updatePayrollRow(selectedRow, { thamGiaBaoHiem: e.target.checked })}
                  />
                )}
                label="Tham gia bảo hiểm"
              />
              <TextField
                label="Mức lương đóng BH"
                type="number"
                size="small"
                fullWidth
                value={payrollRows[selectedRow].mucLuongDongBaoHiem ?? 0}
                onChange={(e) => updatePayrollRow(selectedRow, { mucLuongDongBaoHiem: Number(e.target.value) || 0 })}
              />
              <Divider />
              <Typography variant="body2">
                Lương theo công: <b>{formatMoney(payrollRows[selectedRow].computed?.luongTheoNgayCong)}</b>
              </Typography>
              <Typography variant="body2" color="success.main" fontWeight={700}>
                Thực nhận (sau khi Lưu): xem lại sau khi bấm Lưu bảng
              </Typography>
            </Stack>
          </Box>
        )}
      </Drawer>
    </>
  );
};

export default DayWorkPayrollTab;
