import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  TextField,
  MenuItem,
  Button,
  TablePagination,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import HistoryIcon from '@mui/icons-material/History';
import { getOperationLogs } from '../apis';
import { ROLE_LABELS } from '../../utils/permissions';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import PeriodFilterToolbar from '../common/PeriodFilterToolbar';
import OperationVoiceControls from '../common/OperationVoiceControls';
import useOperationVoiceMonitor from '../../hooks/useOperationVoiceMonitor';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import FilterPanel from '../common/FilterPanel';

const POLL_INTERVAL_MS = 15_000;

const MODULE_LABELS = {
  auth: 'Xác thực',
  user: 'Tài khoản',
  car: 'Xe',
  worker: 'Thợ',
  woker: 'Công việc thợ',
  location: 'Địa điểm',
  supervisor: 'Giám sát',
  team: 'Tổ',
};

const ACTION_LABELS = {
  login: 'Đăng nhập',
  register: 'Đăng ký',
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  update_status: 'Đổi trạng thái',
  assign_workers: 'Phân công',
  manual_items: 'Hạng mục SC',
  import: 'Import',
  toggle_revenue: 'Doanh thu',
  add_job: 'Thêm việc',
  remove_job: 'Xóa việc',
  add_member: 'Thêm thành viên',
  remove_member: 'Xóa thành viên',
};

const moduleColor = {
  auth: 'default',
  user: 'error',
  car: 'primary',
  worker: 'info',
  woker: 'secondary',
  location: 'success',
  supervisor: 'warning',
  team: 'info',
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const OperationHistoryPage = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { period, setPeriod, fromDate, setFromDate, toDate, setToDate } = usePeriodFilter('today');

  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const {
    voiceEnabled,
    processLogs,
    resetTracking,
    toggleVoice,
    testVoice,
  } = useOperationVoiceMonitor({ poll: false });

  const buildQueryParams = useCallback(() => ({
    from: fromDate,
    to: toDate,
    module: moduleFilter || undefined,
    action: actionFilter || undefined,
    search: search.trim() || undefined,
    page: page + 1,
    limit: rowsPerPage,
  }), [fromDate, toDate, moduleFilter, actionFilter, search, page, rowsPerPage]);

  const applyLogs = useCallback((items, paginationData, { announceNew = false } = {}) => {
    processLogs(items, { announceNew });
    setLogs(items || []);
    setPagination(paginationData || { page: 1, limit: rowsPerPage, total: 0, totalPages: 1 });
  }, [processLogs, rowsPerPage]);

  const fetchLogs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }

    try {
      const res = await getOperationLogs(buildQueryParams());
      applyLogs(res.data?.items, res.data?.pagination, { announceNew: silent && page === 0 });
    } catch {
      if (!silent) {
        setError('Không tải được lịch sử thao tác');
        setLogs([]);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [applyLogs, buildQueryParams, page]);

  useEffect(() => {
    resetTracking();
    fetchLogs();
  }, [fetchLogs, resetTracking]);

  useEffect(() => {
    if (page !== 0) return undefined;

    const timer = window.setInterval(() => {
      fetchLogs({ silent: true });
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [fetchLogs, page]);

  const handleSearch = () => {
    setPage(0);
    resetTracking();
    fetchLogs();
  };

  const moduleOptions = useMemo(
    () => Object.entries(MODULE_LABELS).map(([value, label]) => ({ value, label })),
    []
  );

  const actionOptions = useMemo(
    () => Object.entries(ACTION_LABELS).map(([value, label]) => ({ value, label })),
    []
  );

  const renderDetails = (log) => (
    <Stack spacing={0.5}>
      <Typography variant="body2">{log.description}</Typography>
      {Array.isArray(log.metadata?.details) && log.metadata.details.length > 0 && (
        <Stack component="ul" sx={{ m: 0, pl: 2.2 }}>
          {log.metadata.details.map((line, index) => (
            <Typography
              key={`${log._id}-detail-${index}`}
              component="li"
              variant="caption"
              color="text.secondary"
            >
              {line}
            </Typography>
          ))}
        </Stack>
      )}
    </Stack>
  );

  const renderLogRow = (log) => (
    <TableRow key={log._id} hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</TableCell>
      <TableCell>
        <Stack spacing={0.5}>
          <Typography variant="body2" fontWeight={600}>
            {log.fullName || log.username || '—'}
          </Typography>
          {log.role && (
            <Typography variant="caption" color="text.secondary">
              {ROLE_LABELS[log.role] || log.role}
            </Typography>
          )}
        </Stack>
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={MODULE_LABELS[log.module] || log.module}
          color={moduleColor[log.module] || 'default'}
          variant="outlined"
        />
      </TableCell>
      <TableCell>
        <Chip
          size="small"
          label={ACTION_LABELS[log.action] || log.action}
          variant="outlined"
        />
      </TableCell>
      <TableCell>{log.targetLabel || '—'}</TableCell>
      <TableCell>{renderDetails(log)}</TableCell>
    </TableRow>
  );

  const renderMobileCard = (log) => (
    <Card key={log._id} variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Stack spacing={1}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="text.secondary">
              {formatDateTime(log.createdAt)}
            </Typography>
            <Chip
              size="small"
              label={MODULE_LABELS[log.module] || log.module}
              color={moduleColor[log.module] || 'default'}
              variant="outlined"
            />
          </Stack>
          <Typography variant="body2" fontWeight={600}>
            {log.fullName || log.username}
            {log.role ? ` (${ROLE_LABELS[log.role] || log.role})` : ''}
          </Typography>
          {renderDetails(log)}
        </Stack>
      </CardContent>
    </Card>
  );

  return (
    <PageLayout maxWidth="wide">
      <PageHeader
        icon={<HistoryIcon />}
        title="Lịch sử thao tác"
        actions={
          <>
            <Chip size="small" label="Chỉ Admin" color="error" variant="outlined" />
            <Chip size="small" label="Tự động cập nhật" color="success" variant="outlined" />
            <OperationVoiceControls
              voiceEnabled={voiceEnabled}
              onToggle={toggleVoice}
              onTest={testVoice}
            />
          </>
        }
      />

      <FilterPanel title="Bộ lọc">
        <PeriodFilterToolbar
          period={period}
          onPeriodChange={setPeriod}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
        >
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ flex: 1, flexWrap: 'wrap' }}
          >
            <TextField
              select
              label="Nhóm"
              size="small"
              value={moduleFilter}
              onChange={(e) => { setModuleFilter(e.target.value); setPage(0); }}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {moduleOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Hành động"
              size="small"
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(0); }}
              sx={{ minWidth: { xs: '100%', sm: 160 } }}
            >
              <MenuItem value="">Tất cả</MenuItem>
              {actionOptions.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="Tìm kiếm"
              size="small"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Người thao tác, mô tả, đối tượng..."
              sx={{ minWidth: { xs: '100%', sm: 240 }, flex: 1 }}
            />

            <Button
              variant="contained"
              startIcon={<ManageSearchIcon />}
              onClick={handleSearch}
              sx={{ alignSelf: { xs: 'stretch', sm: 'center' } }}
            >
              Lọc
            </Button>
          </Stack>
        </PeriodFilterToolbar>
      </FilterPanel>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : logs.length === 0 ? (
        <Alert severity="info">Không có thao tác nào trong khoảng thời gian đã chọn.</Alert>
      ) : isMobile ? (
        <Stack spacing={2}>
          {logs.map(renderMobileCard)}
          <TablePagination
            component="div"
            count={pagination.total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Số dòng"
          />
        </Stack>
      ) : (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f8fafc' }}>
                <TableCell sx={{ fontWeight: 700 }}>Thời gian</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Người thao tác</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nhóm</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Hành động</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Đối tượng</TableCell>
                <TableCell sx={{ fontWeight: 700, minWidth: 320 }}>Chi tiết thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map(renderLogRow)}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={pagination.total}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
            labelRowsPerPage="Số dòng"
          />
        </Paper>
      )}
    </PageLayout>
  );
};

export default OperationHistoryPage;
