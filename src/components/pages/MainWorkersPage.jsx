import React, { useEffect, useState } from 'react';
import {
  getAllWorkers,
  deleteWorker,
  updateWorker,
  importWorkersBulk,
  toggleWorkerCountRevenue,
  getWorkerKpi,
} from '../apis/index';
import { PERIOD_OPTIONS, getDateRangeForPeriod, formatMoney, getTodayDate } from '../../utils/dateFilters';
import AddWorkerForm from './AddWorkerForm';
import { parseWorkersFromExcelFile } from '../../utils/workerExcel';
import { useAuth } from '../../context/AuthContext';
import { hasPermission } from '../../utils/permissions';
import {
  Typography,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Chip,
  Card,
  CardContent,
  Grid,
  Paper,
  Avatar,
  Tooltip,
  Alert,
  Switch,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
} from '@mui/material';
import { Edit, Delete, TrendingUp, Person, Phone, UploadFile, MonetizationOn, MoneyOff } from '@mui/icons-material';
import { filterWorkersByKeyword } from '../../utils/workerSearch';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import useIsMobile from '../../hooks/useIsMobile';

const WorkerMobileRow = ({
  worker,
  canManageRevenue,
  togglingRevenueId,
  onToggleCountRevenue,
  onEdit,
  onDelete,
  onViewPerformance,
}) => (
  <Paper sx={{ px: 1, py: 0.75 }}>
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
      <Avatar
        src={worker.avatar || ''}
        alt={worker.name}
        sx={{ width: 36, height: 36, bgcolor: 'primary.main', flexShrink: 0, mt: 0.25 }}
      >
        {!worker.avatar && <Person sx={{ fontSize: 20 }} />}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" fontWeight={700} noWrap sx={{ display: 'block', fontSize: 12 }}>
          {worker.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
          {worker.soBaoDanh && (
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
              MNV {worker.soBaoDanh}
            </Typography>
          )}
          {worker.countRevenue === false && (
            <Chip label="Không DT" size="small" color="warning" sx={{ height: 18, fontSize: 10 }} />
          )}
        </Box>
        {canManageRevenue && (
          <FormControlLabel
            sx={{ m: 0, mt: 0.5, '& .MuiFormControlLabel-label': { fontSize: 11 } }}
            control={
              <Switch
                size="small"
                checked={worker.countRevenue !== false}
                onChange={() => onToggleCountRevenue(worker)}
                disabled={togglingRevenueId === worker._id}
                color="success"
              />
            }
            label="Tính DT"
          />
        )}
      </Box>

      <Box sx={{ display: 'flex', flexShrink: 0, gap: 0.25 }}>
        <IconButton size="small" onClick={() => onEdit(worker)} aria-label="Sửa">
          <Edit sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(worker._id)} aria-label="Xóa" color="error">
          <Delete sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton size="small" onClick={() => onViewPerformance(worker)} aria-label="KPI" color="success">
          <TrendingUp sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  </Paper>
);

const WorkerDesktopCard = ({
  worker,
  canManageRevenue,
  togglingRevenueId,
  onToggleCountRevenue,
  onEdit,
  onDelete,
  onViewPerformance,
}) => (
  <Card
    elevation={2}
    sx={{
      width: { xs: '100%', sm: 200 },
      minHeight: 220,
      borderRadius: 3,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      py: 2,
    }}
  >
    <CardContent sx={{ p: 0, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Avatar
        src={worker.avatar || ''}
        alt={worker.name}
        sx={{
          bgcolor: '#3b82f6',
          width: 56,
          height: 56,
          mb: 1.5,
          border: '2px solid #dbeafe',
          boxShadow: '0 4px 12px rgba(59,130,246,0.25)',
        }}
      >
        {!worker.avatar && <Person fontSize="large" />}
      </Avatar>
      <Typography
        variant="h6"
        fontWeight="bold"
        sx={{ color: '#1e293b', fontSize: 18, textAlign: 'center', mb: 0.5 }}
      >
        {worker.name}
      </Typography>
      {worker.soBaoDanh && (
        <Chip label={`SBD: ${worker.soBaoDanh}`} size="small" sx={{ mb: 1, fontWeight: 600 }} />
      )}
      {worker.countRevenue === false && (
        <Chip label="Không tính DT" size="small" color="warning" sx={{ mb: 1, fontWeight: 600 }} />
      )}
      {worker.phone && (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Phone sx={{ fontSize: 16, color: '#64748b', mr: 1 }} />
          <Typography sx={{ color: '#64748b', fontSize: 14 }}>{worker.phone}</Typography>
        </Box>
      )}
      <Box sx={{ width: '100%', mt: 2 }}>
        {canManageRevenue && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <Tooltip
              title={
                worker.countRevenue === false
                  ? 'Bật tính doanh thu cho thợ này'
                  : 'Tắt tính doanh thu cho thợ này'
              }
            >
              <FormControlLabel
                sx={{ m: 0, gap: 0.5 }}
                control={
                  <Switch
                    size="small"
                    checked={worker.countRevenue !== false}
                    onChange={() => onToggleCountRevenue(worker)}
                    disabled={togglingRevenueId === worker._id}
                    color="success"
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {worker.countRevenue === false ? (
                      <MoneyOff sx={{ fontSize: 16, color: '#f59e0b' }} />
                    ) : (
                      <MonetizationOn sx={{ fontSize: 16, color: '#10b981' }} />
                    )}
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                      Tính DT
                    </Typography>
                  </Box>
                }
              />
            </Tooltip>
          </Box>
        )}
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 1 }}>
          <Tooltip title="Chỉnh sửa">
            <IconButton
              size="small"
              onClick={() => onEdit(worker)}
              sx={{ bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xóa">
            <IconButton
              size="small"
              onClick={() => onDelete(worker._id)}
              sx={{ bgcolor: '#fef2f2', '&:hover': { bgcolor: '#fee2e2' } }}
            >
              <Delete fontSize="small" sx={{ color: '#dc2626' }} />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<TrendingUp />}
            onClick={() => onViewPerformance(worker)}
            sx={{
              bgcolor: '#10b981',
              '&:hover': { bgcolor: '#059669' },
              fontSize: 12,
              px: 2,
              boxShadow: 'none',
              borderRadius: 2,
              minWidth: 0,
              height: 32,
            }}
          >
            Hiệu suất
          </Button>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

const WorkersPage = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const canImportExcel = hasPermission(user, 'workers.main');
  const canManageRevenue = canImportExcel;
  const [workers, setWorkers] = useState([]);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importError, setImportError] = useState('');
  const [togglingRevenueId, setTogglingRevenueId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editData, setEditData] = useState({ id: '', name: '' });

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const [performanceOpen, setPerformanceOpen] = useState(false);
  const [kpiData, setKpiData] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceError, setPerformanceError] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [kpiPeriod, setKpiPeriod] = useState('today');
  const [kpiFromDate, setKpiFromDate] = useState(getTodayDate());
  const [kpiToDate, setKpiToDate] = useState(getTodayDate());

  const fetchWorkers = async () => {
  try {
    const res = await getAllWorkers();
    setWorkers(res.data.workers || res.data || []);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thợ:', error);
  }
};

  useEffect(() => {
    fetchWorkers();
  }, []);

  const isPasswordVerified = () => {
    const verifiedUntil = localStorage.getItem('worker_verified_until');
    return verifiedUntil && new Date(verifiedUntil) > new Date();
  };

  const markPasswordVerified = () => {
    const expiry = new Date(Date.now() + 60 * 60 * 10000); // 10 giờ
    localStorage.setItem('worker_verified_until', expiry.toISOString());
  };

  const handleDelete = async (id) => {
    if (isPasswordVerified()) {
      proceedDelete(id);
    } else {
      setDeleteTargetId(id);
      setConfirmDialogOpen(true);
    }
  };

  const proceedDelete = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xoá thợ này?')) return;
    try {
      await deleteWorker(id);
      fetchWorkers();
    } catch (error) {
      console.error('Lỗi khi xoá thợ:', error);
    }
  };

  const handleEditClick = (worker) => {
    setEditData({
      id: worker._id,
      name: worker.name,
    });
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    try {
      await updateWorker(editData.id, {
        name: editData.name,
      });
      setEditOpen(false);
      fetchWorkers();
    } catch (error) {
      console.error('Lỗi khi cập nhật thợ:', error);
    }
  };

  const handleToggleCountRevenue = async (worker) => {
    const nextValue = worker.countRevenue === false;
    setTogglingRevenueId(worker._id);
    try {
      await toggleWorkerCountRevenue(worker._id, nextValue);
      setWorkers((prev) =>
        prev.map((item) =>
          item._id === worker._id ? { ...item, countRevenue: nextValue } : item
        )
      );
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái tính doanh thu:', error);
      alert(error.response?.data?.message || 'Không thể cập nhật trạng thái tính doanh thu');
    } finally {
      setTogglingRevenueId(null);
    }
  };

  const fetchKpiForWorker = async (workerId, period = kpiPeriod, from = kpiFromDate, to = kpiToDate) => {
    if (!workerId) return;
    setPerformanceLoading(true);
    setPerformanceError('');
    try {
      const params = { workerId, period };
      if (period === 'custom') {
        params.from = from;
        params.to = to;
      }
      const res = await getWorkerKpi(params);
      setKpiData(res.data?.data || null);
    } catch (err) {
      setPerformanceError(err.response?.data?.message || 'Lỗi khi lấy KPI thợ!');
      setKpiData(null);
    } finally {
      setPerformanceLoading(false);
    }
  };

  const handleViewPerformance = (worker) => {
    setSelectedWorker(worker);
    setPerformanceOpen(true);
    setKpiData(null);
    setPerformanceError('');
    setKpiPeriod('today');
    const range = getDateRangeForPeriod('today');
    setKpiFromDate(range.from);
    setKpiToDate(range.to);
  };

  useEffect(() => {
    if (kpiPeriod !== 'custom') {
      const range = getDateRangeForPeriod(kpiPeriod);
      setKpiFromDate(range.from);
      setKpiToDate(range.to);
    }
  }, [kpiPeriod]);

  useEffect(() => {
    if (performanceOpen && selectedWorker) {
      fetchKpiForWorker(selectedWorker._id);
    }
  }, [performanceOpen, selectedWorker?._id, kpiPeriod, kpiFromDate, kpiToDate]);

  const filteredWorkers = filterWorkersByKeyword(workers, filterKeyword);

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportMessage('');
    setImportError('');

    try {
      setImporting(true);
      const parsedWorkers = await parseWorkersFromExcelFile(file);

      if (parsedWorkers.length === 0) {
        setImportError('Không tìm thấy dòng thợ hợp lệ (cần cột STT và Tên nhân viên).');
        return;
      }

      const res = await importWorkersBulk(parsedWorkers);
      setImportMessage(res.data.message || `Đã import ${parsedWorkers.length} thợ`);
      await fetchWorkers();
    } catch (err) {
      console.error('Lỗi import Excel:', err);
      setImportError(err.response?.data?.message || err.message || 'Import Excel thất bại');
    } finally {
      setImporting(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        emoji="🛠️"
        title="Quản lý thợ"
        subtitle={
          isMobile
            ? `${filteredWorkers.length} thợ`
            : 'Thêm mới, chỉnh sửa, tìm kiếm và theo dõi hiệu suất thợ tại đây.'
        }
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          gap: { xs: 1.5, md: 0 },
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          p: { xs: 1.5, sm: 2.5 },
          mb: importMessage || importError ? 1 : 2,
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: { xs: 'space-between', md: 'flex-start' },
            gap: 1.5,
            flexShrink: 0,
            pr: { md: 2.5 },
            mr: { md: 2.5 },
            pb: { xs: 1.5, md: 0 },
            borderRight: { md: '1px solid #e2e8f0' },
            borderBottom: { xs: '1px solid #e2e8f0', md: 'none' },
          }}
        >
          <Box sx={{ textAlign: { xs: 'left', md: 'center' }, minWidth: 56 }}>
            <Typography sx={{ fontWeight: 700, fontSize: { xs: 11, sm: 14 }, color: 'primary.main', mb: 0.25, lineHeight: 1.2 }}>
              Tổng thợ
            </Typography>
            <Typography sx={{ fontWeight: 800, fontSize: { xs: 22, sm: 28 }, color: '#1e293b', lineHeight: 1 }}>
              {filteredWorkers.length}
            </Typography>
          </Box>

          {canImportExcel && (
            <>
              <Divider orientation="vertical" flexItem sx={{ borderColor: '#e2e8f0', display: { xs: 'none', sm: 'block' } }} />
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadFile sx={{ fontSize: 18 }} />}
                disabled={importing}
                size="small"
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  fontSize: 13,
                  px: 1.5,
                  py: 0.75,
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                }}
              >
                {importing ? 'Đang import...' : 'Import Excel'}
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportExcel}
                />
              </Button>
            </>
          )}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            size="small"
            label={isMobile ? 'Tìm thợ' : 'Tìm kiếm thợ theo tên'}
            placeholder="Tên, SBD..."
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            fullWidth
          />
          <AddWorkerForm embedded onSuccess={fetchWorkers} />
        </Box>
      </Box>

      {(importMessage || importError) && (
        <Box sx={{ mb: 2, width: '100%' }}>
          {importMessage && <Alert severity="success">{importMessage}</Alert>}
          {importError && (
            <Alert severity="error" sx={{ mt: importMessage ? 1 : 0 }}>
              {importError}
            </Alert>
          )}
        </Box>
      )}

      {isMobile ? (
        <Stack spacing={0.75} sx={{ mt: 1.5 }}>
          {filteredWorkers.map((w) => (
            <WorkerMobileRow
              key={w._id}
              worker={w}
              canManageRevenue={canManageRevenue}
              togglingRevenueId={togglingRevenueId}
              onToggleCountRevenue={handleToggleCountRevenue}
              onEdit={handleEditClick}
              onDelete={handleDelete}
              onViewPerformance={handleViewPerformance}
            />
          ))}
        </Stack>
      ) : (
        <Grid container spacing={2} sx={{ mt: 3, width: '100%', mx: 0 }} justifyContent="center">
          {filteredWorkers.map((w) => (
            <Grid size={{ sm: 6, md: 2 }} key={w._id} sx={{ display: 'flex', justifyContent: 'center' }}>
              <WorkerDesktopCard
                worker={w}
                canManageRevenue={canManageRevenue}
                togglingRevenueId={togglingRevenueId}
                onToggleCountRevenue={handleToggleCountRevenue}
                onEdit={handleEditClick}
                onDelete={handleDelete}
                onViewPerformance={handleViewPerformance}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog chỉnh sửa */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 'bold', color: '#1e293b' }}>
          ✏️ Cập nhật thông tin thợ
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label="Tên thợ"
              value={editData.name}
              onChange={(e) =>
                setEditData({ ...editData, name: e.target.value })
              }
              required
              fullWidth
              InputProps={{ style: { fontSize: 16 } }}
              InputLabelProps={{ style: { fontSize: 16 } }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setEditOpen(false)}
            sx={{ fontSize: 16, px: 3 }}
            variant="outlined"
          >
            Huỷ
          </Button>
          <Button
            onClick={handleEditSave}
            variant="contained"
            sx={{ fontSize: 16, px: 3, bgcolor: '#3b82f6' }}
          >
            Lưu thay đổi
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xác thực mật khẩu xoá */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: '#dc2626', fontWeight: 'bold' }}>
          🔒 Xác thực để xoá
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2, color: '#64748b' }}>
            Vui lòng nhập mật khẩu để xác nhận việc xóa thợ này.
          </Typography>
          <TextField
            type="password"
            label="Nhập mật khẩu"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setConfirmDialogOpen(false)}
            variant="outlined"
            sx={{ px: 3 }}
          >
            Huỷ
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              if (password === '123456@') {
                markPasswordVerified();
                setConfirmDialogOpen(false);
                setPassword('');
                proceedDelete(deleteTargetId);
              } else {
                alert('❌ Sai mật khẩu!');
              }
            }}
            sx={{ bgcolor: '#dc2626', px: 3 }}
          >
            Xác nhận xóa
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog xem KPI thợ */}
      <Dialog open={performanceOpen} onClose={() => setPerformanceOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: 22, fontWeight: 'bold', color: '#1e293b', borderBottom: '1px solid #e2e8f0' }}>
          📊 KPI thợ: {selectedWorker?.name}
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <Paper elevation={1} sx={{ p: 3, borderRadius: 2, bgcolor: '#f8fafc' }}>
            <ToggleButtonGroup
              value={kpiPeriod}
              exclusive
              onChange={(_, val) => val && setKpiPeriod(val)}
              size="small"
              sx={{ mb: 2, flexWrap: 'wrap' }}
            >
              {PERIOD_OPTIONS.map((opt) => (
                <ToggleButton key={opt.value} value={opt.value}>
                  {opt.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            {kpiPeriod === 'custom' && (
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                  label="Từ ngày"
                  type="date"
                  size="small"
                  value={kpiFromDate}
                  onChange={(e) => setKpiFromDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Đến ngày"
                  type="date"
                  size="small"
                  value={kpiToDate}
                  onChange={(e) => setKpiToDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            )}

            {performanceError && (
              <Typography color="error" sx={{ mb: 2 }}>
                {performanceError}
              </Typography>
            )}

            {performanceLoading ? (
              <Typography color="text.secondary">Đang tải KPI...</Typography>
            ) : kpiData ? (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Khoảng: {kpiFromDate} → {kpiToDate} · Tính từ thợ thực hiện hạng mục
                </Typography>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Card sx={{ bgcolor: '#f0f9ff', border: '1px solid #0ea5e9' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" color="#0c4a6e" fontWeight="bold">
                          {kpiData.carsDone ?? 0}
                        </Typography>
                        <Typography variant="body2" color="#0369a1">Số xe đã làm</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Card sx={{ bgcolor: '#e0f2fe', border: '1px solid #38bdf8' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" color="#0c4a6e" fontWeight="bold">
                          {kpiData.totalRepairItems ?? 0}
                        </Typography>
                        <Typography variant="body2" color="#0369a1">Hạng mục thực hiện</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Card sx={{ bgcolor: '#faf5ff', border: '1px solid #a78bfa' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" color="#5b21b6" fontWeight="bold">
                          {formatMoney(kpiData.revenueBeforeCommission)}
                        </Typography>
                        <Typography variant="body2" color="#7c3aed">DT trước hoa hồng</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Card sx={{ bgcolor: '#f0fdf4', border: '1px solid #22c55e' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" color="#166534" fontWeight="bold">
                          {formatMoney(kpiData.revenueAfterCommission)}
                        </Typography>
                        <Typography variant="body2" color="#15803d">DT sau trừ 25%</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Card sx={{ bgcolor: '#ecfdf5', border: '1px solid #34d399' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" color="#065f46" fontWeight="bold">
                          {kpiData.carsOnTime ?? 0}
                        </Typography>
                        <Typography variant="body2" color="#047857">Xe đúng hạn</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Card sx={{ bgcolor: '#fef2f2', border: '1px solid #f87171' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" color="#991b1b" fontWeight="bold">
                          {kpiData.carsLate ?? 0}
                        </Typography>
                        <Typography variant="body2" color="#dc2626">Xe trễ</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <Card sx={{ bgcolor: '#fef3c7', border: '1px solid #f59e0b' }}>
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h5" color="#92400e" fontWeight="bold" textAlign="center">
                          {kpiData.performancePercentage ?? 0}%
                        </Typography>
                        <Typography variant="body2" color="#a16207" textAlign="center">
                          Hiệu suất ({kpiData.totalWork}/{kpiData.totalCarsInRange} xe)
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <Typography color="text.secondary">Chưa có dữ liệu KPI.</Typography>
            )}
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #e2e8f0' }}>
          <Button
            onClick={() => setPerformanceOpen(false)}
            sx={{ fontSize: 16, px: 3 }}
            variant="outlined"
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
    </PageLayout>
  );
};

export default WorkersPage;
