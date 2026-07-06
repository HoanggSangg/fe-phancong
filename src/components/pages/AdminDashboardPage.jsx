import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
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
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  getDashboardOverview,
  getRevenueSettings,
  updateRevenueSettings,
} from '../apis/index';
import { formatMoney } from '../../utils/dateFilters';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import PeriodFilterToolbar from '../common/PeriodFilterToolbar';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import FilterPanel from '../common/FilterPanel';

const StatCard = ({ label, value, color = '#1e293b', sub }) => (
  <Card sx={{ height: '100%', border: '1px solid #e2e8f0' }}>
    <CardContent sx={{ py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color, mt: 0.25 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const AdminDashboardPage = () => {
  const { period, setPeriod, fromDate, setFromDate, toDate, setToDate } = usePeriodFilter('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deductions, setDeductions] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { period };
      if (period === 'custom') {
        params.from = fromDate;
        params.to = toDate;
      }
      const res = await getDashboardOverview(params);
      setData(res.data);
      if (res.data?.deductions) {
        setDeductions(res.data.deductions);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được dashboard');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [period, fromDate, toDate]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const openSettings = async () => {
    setSettingsError('');
    try {
      const res = await getRevenueSettings();
      setDeductions(res.data?.deductions || []);
      setSettingsOpen(true);
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Không tải cấu hình trừ DT');
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsError('');
    try {
      const res = await updateRevenueSettings(deductions);
      setDeductions(res.data?.deductions || deductions);
      setSettingsOpen(false);
      await fetchDashboard();
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Lưu cấu hình thất bại');
    } finally {
      setSavingSettings(false);
    }
  };

  const updateDeduction = (index, field, value) => {
    setDeductions((prev) => prev.map((item, i) => (
      i === index ? { ...item, [field]: value } : item
    )));
  };

  const addDeduction = () => {
    setDeductions((prev) => [
      ...prev,
      {
        key: `custom_${prev.length + 1}`,
        label: 'Chi phí khác',
        rate: 0,
        enabled: true,
      },
    ]);
  };

  const removeDeduction = (index) => {
    setDeductions((prev) => prev.filter((_, i) => i !== index));
  };

  const summary = data?.summary;
  const totalRate = summary?.totalDeductionRate ?? 0;

  return (
    <PageLayout>
      <PageHeader
        icon={<DashboardIcon />}
        title="Dashboard tổng quan"
        subtitle="Tổng hợp doanh thu thợ sau các khoản trừ — cấu hình linh hoạt cho toàn hệ thống"
        actions={(
          <Button
            variant="outlined"
            size="small"
            startIcon={<SettingsIcon />}
            onClick={openSettings}
          >
            Cấu hình trừ DT
          </Button>
        )}
      />

      <FilterPanel title="Khoảng thời gian">
        <PeriodFilterToolbar
          period={period}
          onPeriodChange={setPeriod}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
        />
      </FilterPanel>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {settingsError && !settingsOpen && <Alert severity="error" sx={{ mb: 1.5 }}>{settingsError}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={32} />
        </Box>
      ) : summary ? (
        <Stack spacing={2}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Tổng thợ" value={summary.totalWorkers} color="#2563eb" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Thợ rảnh" value={summary.availableWorkers} color="#059669" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Xe đang xử lý" value={summary.activeCars} color="#d97706" />
            </Grid>
            <Grid size={{ xs: 6, sm: 4, md: 3 }}>
              <StatCard label="Hạng mục SC" value={summary.totalRepairItems} color="#0ea5e9" />
            </Grid>
          </Grid>

          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" fontWeight={800}>
                Doanh thu thợ
              </Typography>
              <Chip
                size="small"
                label={`Tổng trừ: ${totalRate}%`}
                color={totalRate > 0 ? 'warning' : 'default'}
              />
            </Box>
            <Grid container spacing={1}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard
                  label="DT gốc (trước trừ)"
                  value={formatMoney(summary.grossRevenue)}
                  color="#7c3aed"
                />
              </Grid>
              {summary.deductionBreakdown?.map((item) => (
                <Grid size={{ xs: 12, sm: 4 }} key={item.key}>
                  <StatCard
                    label={`Trừ ${item.label} (${item.rate}%)`}
                    value={formatMoney(item.amount)}
                    color="#dc2626"
                  />
                </Grid>
              ))}
              <Grid size={{ xs: 12, sm: 4 }}>
                <StatCard
                  label="DT thực nhận"
                  value={formatMoney(summary.netRevenue)}
                  color="#059669"
                  sub="Sau tất cả khoản trừ"
                />
              </Grid>
            </Grid>
          </Paper>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 6 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Doanh thu theo tổ
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Tổ</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>DT gốc</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>DT thực nhận</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.byTeam || []).map((row) => (
                      <TableRow key={row.teamName} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{row.teamName}</TableCell>
                        <TableCell align="right">{formatMoney(row.grossRevenue)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: '#059669' }}>
                          {formatMoney(row.netRevenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>

            <Grid size={{ xs: 12, lg: 6 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                Top thợ theo DT thực nhận
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f8fafc' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Thợ</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tổ</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>DT thực nhận</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(data.topWorkers || []).map((row) => (
                      <TableRow key={row.workerId} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} noWrap>
                            {row.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            SBD {row.soBaoDanh || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>{row.teamName}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>
                          {formatMoney(row.netRevenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </Stack>
      ) : (
        <Alert severity="info">Chưa có dữ liệu dashboard.</Alert>
      )}

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cấu hình khoản trừ doanh thu thợ</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Các khoản trừ áp dụng cho tất cả thợ. Tổng tỷ lệ không vượt quá 100%.
          </Typography>
          {settingsError && <Alert severity="error" sx={{ mb: 1.5 }}>{settingsError}</Alert>}
          <Stack spacing={1.5}>
            {deductions.map((item, index) => (
              <Paper key={`${item.key}-${index}`} variant="outlined" sx={{ p: 1.25 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Switch
                    checked={item.enabled !== false}
                    onChange={(e) => updateDeduction(index, 'enabled', e.target.checked)}
                    size="small"
                  />
                  <TextField
                    label="Tên khoản trừ"
                    size="small"
                    value={item.label}
                    onChange={(e) => updateDeduction(index, 'label', e.target.value)}
                    sx={{ flex: 1 }}
                  />
                  <TextField
                    label="%"
                    size="small"
                    type="number"
                    value={item.rate}
                    onChange={(e) => updateDeduction(index, 'rate', Number(e.target.value))}
                    sx={{ width: 90 }}
                    inputProps={{ min: 0, max: 100 }}
                  />
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => removeDeduction(index)}
                    disabled={deductions.length <= 1}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </Stack>
          <Button
            startIcon={<AddIcon />}
            size="small"
            sx={{ mt: 1.5 }}
            onClick={addDeduction}
          >
            Thêm khoản trừ
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Huỷ</Button>
          <Button variant="contained" onClick={handleSaveSettings} disabled={savingSettings}>
            {savingSettings ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default AdminDashboardPage;
