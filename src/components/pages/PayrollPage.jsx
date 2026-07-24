import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import PaymentsIcon from '@mui/icons-material/Payments';
import RefreshIcon from '@mui/icons-material/Refresh';
import CalculateIcon from '@mui/icons-material/Calculate';
import SaveIcon from '@mui/icons-material/Save';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import FilterPanel from '../common/FilterPanel';
import {
  getMonthlyPayroll,
  getAnnualPayroll,
  saveMonthlyPayroll,
  refreshPayrollRevenue,
  recalculatePayroll,
  getPayrollSettings,
  updatePayrollSettings,
} from '../apis/index';
import { formatMoney } from '../../utils/dateFilters';
import { exportPayrollToExcel } from '../../utils/payrollExcel';

const now = new Date();
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

const moneyFields = [
  { key: 'phuCapTrachNhiem', label: 'Phụ cấp trách nhiệm' },
  { key: 'thuongSoLuongXe', label: 'Thưởng số lượng xe' },
  { key: 'phuCapDienThoai', label: 'Phụ cấp điện thoại' },
  { key: 'phuCapXangXe', label: 'Phụ cấp xăng xe' },
  { key: 'phuCapChuyenCan', label: 'Phụ cấp chuyên cần' },
  { key: 'phuCapBaoCaoNgay', label: 'Phụ cấp báo cáo ngày' },
  { key: 'phuCapBaoVeTaiSan', label: 'Phụ cấp bảo vệ tài sản' },
  { key: 'phuCapVeSinh', label: 'Phụ cấp vệ sinh' },
  { key: 'phuCapTayNghe', label: 'Phụ cấp tay nghề' },
  { key: 'tienComTrua', label: 'Tiền cơm trưa' },
  { key: 'tienTangCa', label: 'Tiền tăng ca' },
  { key: 'congTacXa', label: 'Công tác xa' },
  { key: 'hoTroBaoGiaThau', label: 'HT báo giá thầu' },
  { key: 'hoTroSuaChuaLai', label: 'HT sửa chữa lại' },
  { key: 'hoTroCongViecDacBiet', label: 'HT công việc đặc biệt' },
  { key: 'tienCuuPan', label: 'Tiền cứu pan' },
  { key: 'tienHoTroKhac', label: 'Tiền hỗ trợ khác' },
  { key: 'tienThuongKhac', label: 'Tiền thưởng khác' },
];

const penaltyFields = [
  { key: 'truThieuTrachNhiem', label: 'Trừ thiếu trách nhiệm' },
  { key: 'truChatLuong', label: 'Trừ chất lượng SC' },
  { key: 'truHuHong', label: 'Trừ hư hỏng' },
  { key: 'truViPhamNoiQuy', label: 'Trừ vi phạm nội quy' },
  { key: 'truNghiVuotPhep', label: 'Trừ nghỉ vượt phép' },
  { key: 'truThueTNCN', label: 'Trừ thuế TNCN' },
  { key: 'truTamUng', label: 'Tạm ứng' },
  { key: 'truCongNo', label: 'Công nợ' },
  { key: 'truKhac', label: 'Trừ khác' },
];

const numVal = (v) => (v === '' || v == null ? '' : Number(v));

const PayrollPage = () => {
  const [view, setView] = useState('month'); // month | year
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({});
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({});
  const [rangeLabel, setRangeLabel] = useState('');

  const [annualRows, setAnnualRows] = useState([]);
  const [annualTotals, setAnnualTotals] = useState({ months: {}, luongThucNhan: 0 });
  const [monthsAvailable, setMonthsAvailable] = useState([]);
  const [annualLoading, setAnnualLoading] = useState(false);

  const selected = selectedIdx != null ? rows[selectedIdx] : null;

  const loadPayroll = useCallback(async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await getMonthlyPayroll(year, month);
      setRows(res.data?.data?.rows || []);
      setTotals(res.data?.data?.totals || {});
      setStatus(res.data?.data?.status || 'draft');
      setSettings(res.data?.settings || null);
      setRangeLabel(
        res.data?.from && res.data?.to ? `${res.data.from} → ${res.data.to}` : ''
      );
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không tải được bảng lương',
      });
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  const loadAnnual = useCallback(async () => {
    setAnnualLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await getAnnualPayroll(year);
      setAnnualRows(res.data?.data?.rows || []);
      setAnnualTotals(res.data?.data?.totals || { months: {}, luongThucNhan: 0 });
      setMonthsAvailable(res.data?.monthsAvailable || []);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không tải được tổng lương năm',
      });
      setAnnualRows([]);
      setAnnualTotals({ months: {}, luongThucNhan: 0 });
      setMonthsAvailable([]);
    } finally {
      setAnnualLoading(false);
    }
  }, [year]);

  useEffect(() => {
    if (view === 'month') {
      loadPayroll();
    }
  }, [view, loadPayroll]);

  useEffect(() => {
    if (view === 'year') {
      loadAnnual();
    }
  }, [view, loadAnnual]);

  const updateRow = (index, patch) => {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await saveMonthlyPayroll(year, month, {
        status: 'saved',
        rows,
      });
      setRows(res.data?.data?.rows || []);
      setTotals(res.data?.data?.totals || {});
      setStatus(res.data?.data?.status || 'saved');
      setMessage({ type: 'success', text: 'Đã lưu bảng lương (đã đồng bộ hồ sơ thợ)' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lưu thất bại',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await refreshPayrollRevenue(year, month);
      setRows(res.data?.data?.rows || []);
      setTotals(res.data?.data?.totals || {});
      setMessage({ type: 'success', text: 'Đã cập nhật doanh thu tháng' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Refresh DT thất bại',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRecalc = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    try {
      // Lưu nháp trước rồi tính lại để giữ input
      await saveMonthlyPayroll(year, month, { status: status || 'draft', rows });
      const res = await recalculatePayroll(year, month);
      setRows(res.data?.data?.rows || []);
      setTotals(res.data?.data?.totals || {});
      setMessage({ type: 'success', text: 'Đã tính lại lương' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Tính lại thất bại',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    setMessage({ type: '', text: '' });
    try {
      await exportPayrollToExcel({ year, month, rows, totals });
      setMessage({ type: 'success', text: 'Đã xuất Excel theo file mẫu' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.message || 'Xuất Excel thất bại',
      });
    }
  };

  const openSettings = async () => {
    try {
      const res = await getPayrollSettings();
      setSettingsForm(res.data?.data || {});
      setSettingsOpen(true);
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Không tải cấu hình',
      });
    }
  };

  const saveSettings = async () => {
    try {
      const res = await updatePayrollSettings(settingsForm);
      setSettings(res.data?.data);
      setSettingsOpen(false);
      setMessage({ type: 'success', text: 'Đã lưu cấu hình lương' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Lưu cấu hình thất bại',
      });
    }
  };

  const summaryChips = useMemo(
    () => [
      { label: 'Tổng DT tháng', value: formatMoney(totals.doanhThuThang) },
      { label: 'Tổng thu nhập', value: formatMoney(totals.tongThuNhap) },
      { label: 'Tổng khấu trừ', value: formatMoney(totals.tongKhauTru) },
      { label: 'Thực nhận', value: formatMoney(totals.luongThucNhan), color: 'success' },
    ],
    [totals]
  );

  const annualSummaryChips = useMemo(
    () => [
      {
        label: 'Tháng có bảng',
        value: monthsAvailable.length
          ? monthsAvailable.map((m) => `T${m}`).join(', ')
          : 'Chưa có',
      },
      {
        label: `Tổng thực nhận ${year}`,
        value: formatMoney(annualTotals.luongThucNhan),
        color: 'success',
      },
    ],
    [annualTotals.luongThucNhan, monthsAvailable, year]
  );

  const isYearView = view === 'year';

  return (
    <PageLayout>
      <PageHeader
        icon={<PaymentsIcon />}
        title={isYearView ? 'Tổng lương năm (theo DT)' : 'Tính lương tháng (theo DT)'}
        subtitle={
          isYearView
            ? `Tổng lương thực nhận theo từng tháng — năm ${year}`
            : 'Lương năng suất theo doanh thu — tách riêng khỏi lương ngày công'
        }
        actions={(
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button size="small" variant="outlined" startIcon={<SettingsIcon />} onClick={openSettings}>
              Cấu hình
            </Button>
            {!isYearView && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                  disabled={saving || loading}
                >
                  Refresh DT
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CalculateIcon />}
                  onClick={handleRecalc}
                  disabled={saving || loading}
                >
                  Tính lại
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExport}
                  disabled={!rows.length}
                >
                  Xuất Excel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || loading}
                >
                  {saving ? 'Đang lưu...' : 'Lưu bảng'}
                </Button>
              </>
            )}
            {isYearView && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadAnnual}
                disabled={annualLoading}
              >
                Tải lại
              </Button>
            )}
          </Stack>
        )}
      />

      <Tabs
        value={view}
        onChange={(_, next) => {
          setView(next);
          setSelectedIdx(null);
        }}
        sx={{ mb: 1.5, minHeight: 40, '& .MuiTab-root': { minHeight: 40, py: 0.5 } }}
      >
        <Tab value="month" label="Lương tháng" />
        <Tab value="year" label="Tổng lương năm" />
      </Tabs>

      <FilterPanel title={isYearView ? 'Năm lương' : 'Kỳ lương'}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
          {!isYearView && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Tháng</InputLabel>
              <Select label="Tháng" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {MONTHS.map((m) => (
                  <MenuItem key={m} value={m}>
                    Tháng {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Năm</InputLabel>
            <Select label="Năm" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {YEARS.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!isYearView && rangeLabel && (
            <Typography variant="body2" color="text.secondary">
              Doanh thu: {rangeLabel}
            </Typography>
          )}
          {!isYearView && (
            <Chip
              size="small"
              label={status === 'saved' ? 'Đã lưu' : 'Nháp'}
              color={status === 'saved' ? 'success' : 'default'}
            />
          )}
        </Stack>
      </FilterPanel>

      {message.text && (
        <Alert severity={message.type || 'info'} sx={{ mb: 1.5 }} onClose={() => setMessage({ type: '', text: '' })}>
          {message.text}
        </Alert>
      )}

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {(isYearView ? annualSummaryChips : summaryChips).map((item) => (
          <Chip
            key={item.label}
            label={`${item.label}: ${item.value}`}
            color={item.color || 'default'}
            variant="outlined"
            sx={{ fontWeight: 600 }}
          />
        ))}
      </Stack>

      {isYearView ? (
        annualLoading ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>STT</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Họ tên</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Bộ phận</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Chức vụ</TableCell>
                  {MONTHS.map((m) => (
                    <TableCell
                      key={m}
                      align="right"
                      sx={{
                        fontWeight: 700,
                        bgcolor: monthsAvailable.includes(m) ? 'rgba(16, 185, 129, 0.08)' : undefined,
                      }}
                    >
                      T{m}
                    </TableCell>
                  ))}
                  <TableCell align="right" sx={{ fontWeight: 800, color: '#059669' }}>
                    Tổng năm
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {annualRows.map((row, index) => (
                  <TableRow key={row.workerId || index} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {row.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.soBaoDanh || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.boPhan || '—'}</TableCell>
                    <TableCell>{row.chucVu || '—'}</TableCell>
                    {MONTHS.map((m) => {
                      const amount = row.months?.[String(m)] || 0;
                      return (
                        <TableCell
                          key={m}
                          align="right"
                          sx={{
                            color: amount ? 'text.primary' : 'text.disabled',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {amount ? formatMoney(amount) : '—'}
                        </TableCell>
                      );
                    })}
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatMoney(row.total)}
                    </TableCell>
                  </TableRow>
                ))}
                {annualRows.length > 0 && (
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell colSpan={4} sx={{ fontWeight: 800 }}>
                      Tổng cộng
                    </TableCell>
                    {MONTHS.map((m) => (
                      <TableCell
                        key={m}
                        align="right"
                        sx={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}
                      >
                        {formatMoney(annualTotals.months?.[String(m)] || 0)}
                      </TableCell>
                    ))}
                    <TableCell
                      align="right"
                      sx={{ fontWeight: 800, color: '#059669', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {formatMoney(annualTotals.luongThucNhan)}
                    </TableCell>
                  </TableRow>
                )}
                {!annualRows.length && (
                  <TableRow>
                    <TableCell colSpan={17} align="center">
                      Chưa có dữ liệu thợ hoặc bảng lương tháng trong năm này.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )
      ) : loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '70vh' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 1400 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>STT</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Họ tên</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Bộ phận</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Chức vụ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>LCB</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Định mức</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>DT tháng</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Công HT</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Tổng DT</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>LNS</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Cộng thêm</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Khấu trừ</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>Thực nhận</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, index) => {
                const c = row.computed || {};
                return (
                  <TableRow
                    key={String(row.worker || index)}
                    hover
                    selected={selectedIdx === index}
                    onClick={() => setSelectedIdx(index)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {row.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.soBaoDanh || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>{row.boPhan || '—'}</TableCell>
                    <TableCell>{row.chucVu || '—'}</TableCell>
                    <TableCell align="right">{formatMoney(row.luongCoBan)}</TableCell>
                    <TableCell align="right">{formatMoney(row.doanhThuDinhMuc)}</TableCell>
                    <TableCell align="right">{formatMoney(row.doanhThuThang)}</TableCell>
                    <TableCell align="right">{row.soCongHoTro || 0}</TableCell>
                    <TableCell align="right">{formatMoney(c.tongDoanhThu)}</TableCell>
                    <TableCell align="right">{formatMoney(c.luongNangSuat)}</TableCell>
                    <TableCell align="right">{formatMoney(c.tongCongThem)}</TableCell>
                    <TableCell align="right">{formatMoney(c.tongKhauTru)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>
                      {formatMoney(c.luongThucNhan)}
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={13} align="center">
                    Chưa có dữ liệu thợ.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Drawer
        anchor="right"
        open={Boolean(selected) && !isYearView}
        onClose={() => setSelectedIdx(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 } } }}
      >
        {selected && (
          <Box sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Box>
                <Typography variant="h6" fontWeight={800}>
                  {selected.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chi tiết cách tính lương
                </Typography>
              </Box>
              <IconButton onClick={() => setSelectedIdx(null)}>
                <CloseIcon />
              </IconButton>
            </Stack>

            <Divider sx={{ mb: 2 }} />

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Hồ sơ (lưu dùng tháng sau)
            </Typography>
            <Grid container spacing={1.25} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Bộ phận"
                  size="small"
                  fullWidth
                  value={selected.boPhan || ''}
                  onChange={(e) => updateRow(selectedIdx, { boPhan: e.target.value })}
                  helperText="Lấy từ tên tổ (có thể sửa)"
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Chức vụ"
                  size="small"
                  fullWidth
                  value={selected.chucVu || ''}
                  onChange={(e) => updateRow(selectedIdx, { chucVu: e.target.value })}
                  helperText="TT/KTV từ tổ → %NS mặc định"
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Lương cơ bản"
                  size="small"
                  type="number"
                  fullWidth
                  value={selected.luongCoBan ?? 0}
                  onChange={(e) => updateRow(selectedIdx, { luongCoBan: numVal(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="DT định mức"
                  size="small"
                  type="number"
                  fullWidth
                  value={selected.doanhThuDinhMuc ?? 0}
                  onChange={(e) => updateRow(selectedIdx, { doanhThuDinhMuc: numVal(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="% NS đạt ĐM"
                  size="small"
                  type="number"
                  fullWidth
                  value={selected.tyLeDatDinhMuc ?? 20}
                  onChange={(e) => updateRow(selectedIdx, { tyLeDatDinhMuc: numVal(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="% NS vượt ĐM"
                  size="small"
                  type="number"
                  fullWidth
                  value={selected.tyLeVuotDinhMuc ?? 20}
                  onChange={(e) => updateRow(selectedIdx, { tyLeVuotDinhMuc: numVal(e.target.value) })}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Doanh thu & công hỗ trợ (tháng này)
            </Typography>
            <Grid container spacing={1.25} sx={{ mb: 2 }}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Doanh thu tháng (gốc)"
                  size="small"
                  type="number"
                  fullWidth
                  value={selected.doanhThuThang ?? 0}
                  onChange={(e) => updateRow(selectedIdx, { doanhThuThang: numVal(e.target.value) })}
                  helperText="Tự lấy từ hệ thống — có thể chỉnh tay"
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Số công hỗ trợ"
                  size="small"
                  type="number"
                  fullWidth
                  value={selected.soCongHoTro ?? 0}
                  onChange={(e) => updateRow(selectedIdx, { soCongHoTro: numVal(e.target.value) })}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <TextField
                  label="Tiền công HT (override)"
                  size="small"
                  type="number"
                  fullWidth
                  value={selected.tienCongHoTroOverride ?? ''}
                  onChange={(e) =>
                    updateRow(selectedIdx, {
                      tienCongHoTroOverride: e.target.value === '' ? null : numVal(e.target.value),
                    })
                  }
                  helperText={`Mặc định × ${formatMoney(settings?.donGiaCongHoTro || 250000)}`}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Phụ cấp / thưởng / hỗ trợ
            </Typography>
            <Grid container spacing={1.25} sx={{ mb: 2 }}>
              {moneyFields.map((f) => (
                <Grid key={f.key} size={{ xs: 6 }}>
                  <TextField
                    label={f.label}
                    size="small"
                    type="number"
                    fullWidth
                    value={selected[f.key] ?? 0}
                    onChange={(e) => updateRow(selectedIdx, { [f.key]: numVal(e.target.value) })}
                  />
                </Grid>
              ))}
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Phạt & khấu trừ
            </Typography>
            <Grid container spacing={1.25} sx={{ mb: 2 }}>
              {penaltyFields.map((f) => (
                <Grid key={f.key} size={{ xs: 6 }}>
                  <TextField
                    label={f.label}
                    size="small"
                    type="number"
                    fullWidth
                    value={selected[f.key] ?? 0}
                    onChange={(e) => updateRow(selectedIdx, { [f.key]: numVal(e.target.value) })}
                  />
                </Grid>
              ))}
              <Grid size={{ xs: 12 }}>
                <TextField
                  label="Ghi chú lý do trừ"
                  size="small"
                  fullWidth
                  multiline
                  minRows={2}
                  value={selected.ghiChuTru || ''}
                  onChange={(e) => updateRow(selectedIdx, { ghiChuTru: e.target.value })}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
              Bảo hiểm
            </Typography>
            <FormControlLabel
              control={(
                <Switch
                  checked={selected.thamGiaBaoHiem === true}
                  onChange={(e) => updateRow(selectedIdx, { thamGiaBaoHiem: e.target.checked })}
                />
              )}
              label="Tham gia bảo hiểm"
              sx={{ mb: 1 }}
            />
            <TextField
              label="Mức lương đóng BH"
              size="small"
              type="number"
              fullWidth
              sx={{ mb: 2 }}
              disabled={!selected.thamGiaBaoHiem}
              value={selected.mucLuongDongBaoHiem ?? 0}
              onChange={(e) => updateRow(selectedIdx, { mucLuongDongBaoHiem: numVal(e.target.value) })}
            />

            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" fontWeight={800} gutterBottom>
                Kết quả đã tính (sau khi Lưu / Tính lại)
              </Typography>
              {[
                ['Tiền công hỗ trợ', selected.computed?.tienCongHoTro],
                ['Tổng DT tính lương', selected.computed?.tongDoanhThu],
                ['DT đạt định mức', selected.computed?.dtDatDinhMuc],
                ['DT vượt định mức', selected.computed?.dtVuotDinhMuc],
                ['NS đạt ĐM', selected.computed?.tienNsDat],
                ['NS vượt ĐM', selected.computed?.tienNsVuot],
                ['Lương năng suất', selected.computed?.luongNangSuat],
                ['Tổng cộng thêm', selected.computed?.tongCongThem],
                ['Tổng phạt', selected.computed?.tongPhat],
                ['BHXH', selected.computed?.bhxh],
                ['BHYT', selected.computed?.bhyt],
                ['BHTN', selected.computed?.bhtn],
                ['Tổng BH', selected.computed?.tongBaoHiem],
                ['Tổng thu nhập', selected.computed?.tongThuNhap],
                ['Tổng khấu trừ', selected.computed?.tongKhauTru],
                ['Lương thực nhận', selected.computed?.luongThucNhan],
              ].map(([label, value]) => (
                <Stack
                  key={label}
                  direction="row"
                  justifyContent="space-between"
                  sx={{ py: 0.35 }}
                >
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={700}>
                    {formatMoney(value)}
                  </Typography>
                </Stack>
              ))}
            </Paper>

            <Button
              fullWidth
              variant="contained"
              sx={{ mt: 2 }}
              onClick={handleRecalc}
              disabled={saving}
            >
              Lưu & tính lại
            </Button>
          </Box>
        )}
      </Drawer>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cấu hình tính lương</DialogTitle>
        <DialogContent>
          <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
            {[
              { key: 'donGiaCongHoTro', label: 'Đơn giá công hỗ trợ' },
              { key: 'bhxhRate', label: 'BHXH (%)' },
              { key: 'bhytRate', label: 'BHYT (%)' },
              { key: 'bhtnRate', label: 'BHTN (%)' },
              { key: 'defaultTyLeKtv', label: '% NS mặc định KTV' },
              { key: 'defaultTyLeToTruong', label: '% NS mặc định Tổ trưởng' },
            ].map((f) => (
              <Grid key={f.key} size={{ xs: 6 }}>
                <TextField
                  label={f.label}
                  size="small"
                  type="number"
                  fullWidth
                  value={settingsForm[f.key] ?? ''}
                  onChange={(e) =>
                    setSettingsForm((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                  }
                />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Huỷ</Button>
          <Button variant="contained" onClick={saveSettings}>
            Lưu
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default PayrollPage;
