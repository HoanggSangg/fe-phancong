import React, { useEffect, useMemo, useState, useCallback } from 'react';
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
  Divider,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { getRepairHistory, getAllWorkers } from '../apis/index';
import { useAuth } from '../../context/AuthContext';
import { CAR_STATUS_LABELS, isKtv } from '../../utils/permissions';
import WorkerSearchSelect from '../common/WorkerSearchSelect';
import { formatMoney } from '../../utils/dateFilters';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import PeriodFilterToolbar from '../common/PeriodFilterToolbar';
import {
  buildCarGroups,
  exportRepairHistoryToExcel,
  sumAssignmentsRevenue,
} from '../../utils/repairHistoryExcel';

const isDeliveredCar = (car) => car.carStatus === 'delivered';

const RepairHistoryPage = () => {
  const { user } = useAuth();
  const isKtvUser = isKtv(user?.role);

  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    revenueBeforeCommission: 0,
    revenueAfterCommission: 0,
    totalItems: 0,
    totalCars: 0,
  });
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [includeDeliveredDetails, setIncludeDeliveredDetails] = useState(false);
  const [expandedDeliveredCars, setExpandedDeliveredCars] = useState(() => new Set());
  const { period, setPeriod, fromDate, setFromDate, toDate, setToDate } = usePeriodFilter('today');
  const [workerFilter, setWorkerFilter] = useState('');

  const parseHistoryResponse = (data) => {
    if (Array.isArray(data)) {
      return {
        items: data,
        summary: {
          totalRevenue: 0,
          revenueBeforeCommission: 0,
          revenueAfterCommission: 0,
          totalItems: data.length,
          totalCars: new Set(data.map((item) => `${item.plateNumber}__${item.carDate}`)).size,
        },
      };
    }

    return {
      items: data?.items || [],
      summary: {
        totalRevenue: Number(data?.totalRevenue || data?.revenueAfterCommission || 0),
        revenueBeforeCommission: Number(data?.revenueBeforeCommission || 0),
        revenueAfterCommission: Number(data?.revenueAfterCommission || data?.totalRevenue || 0),
        totalItems: Number(data?.totalItems || data?.items?.length || 0),
        totalCars: Number(data?.totalCars || 0),
      },
    };
  };

  const fetchHistoryByRange = useCallback(
    async (from, to, workerId = workerFilter) => {
      const params = { from, to };
      if (!isKtvUser && workerId) params.workerId = workerId;
      const res = await getRepairHistory(params);
      return parseHistoryResponse(res.data);
    },
    [isKtvUser, workerFilter]
  );

  const fetchHistory = async () => {
    setLoading(true);
    setError('');
    try {
      const { items: nextItems, summary: nextSummary } = await fetchHistoryByRange(fromDate, toDate);
      setItems(nextItems);
      setSummary(nextSummary);
      setExpandedDeliveredCars(new Set());
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'Không tải được lịch sử sửa chữa');
      setItems([]);
      setSummary({
        totalRevenue: 0,
        revenueBeforeCommission: 0,
        revenueAfterCommission: 0,
        totalItems: 0,
        totalCars: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isKtvUser) {
      getAllWorkers()
        .then((res) => setWorkers(res.data || []))
        .catch(() => setWorkers([]));
    }
  }, [isKtvUser]);

  useEffect(() => {
    fetchHistory();
  }, [fromDate, toDate, workerFilter, isKtvUser]);

  const carGroups = useMemo(() => buildCarGroups(items), [items]);
  const totalRevenue = summary.revenueAfterCommission || summary.totalRevenue;

  const isCarExpanded = (car) =>
    !isDeliveredCar(car) || expandedDeliveredCars.has(car.key);

  const toggleDeliveredCar = (carKey) => {
    setExpandedDeliveredCars((prev) => {
      const next = new Set(prev);
      if (next.has(carKey)) next.delete(carKey);
      else next.add(carKey);
      return next;
    });
  };

  const handleExportExcel = async () => {
    setExportError('');
    setExporting(true);
    try {
      if (carGroups.length === 0) {
        setExportError('Không có dữ liệu để xuất Excel trong khoảng đã chọn.');
        return;
      }

      exportRepairHistoryToExcel({
        carGroups,
        fromDate,
        toDate,
        includeDeliveredDetails,
        isKtvUser,
      });
    } catch (err) {
      console.error(err);
      setExportError(err.response?.data?.message || err.message || 'Xuất Excel thất bại');
    } finally {
      setExporting(false);
    }
  };

  const renderWorkers = (assignments = []) => {
    if (assignments.length === 0) {
      return (
        <Typography variant="body2" color="text.secondary">
          Chưa phân công
        </Typography>
      );
    }

    return (
      <Stack spacing={0.25}>
        {assignments.map((assignment, index) => (
          <Typography key={`${assignment.workerId}-${index}`} variant="body2">
            {assignment.workerName || '—'} ({assignment.percentage}%)
            {!isKtvUser && <> · {formatMoney(assignment.revenue)}</>}
          </Typography>
        ))}
      </Stack>
    );
  };

  const renderDeliveredToggle = (car) => {
    if (!isDeliveredCar(car)) return null;
    const expanded = isCarExpanded(car);
    return (
      <Button
        size="small"
        variant="outlined"
        onClick={() => toggleDeliveredCar(car.key)}
        startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      >
        {expanded ? 'Thu gọn' : `Xem ${car.items.length} hạng mục`}
      </Button>
    );
  };

  const renderDeliveredSummary = (car) => (
    <Box sx={{ p: 2 }}>
      <Typography variant="body2" color="text.secondary">
        Xe đã giao — đã gom {car.items.length} hạng mục. Bấm &quot;Xem hạng mục&quot; để mở chi tiết.
      </Typography>
      {!isKtvUser && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            Tổng thành tiền: <strong>{formatMoney(car.totalAmount)}</strong>
          </Typography>
          <Typography variant="body2">
            Doanh thu thợ: <strong>{formatMoney(car.totalRevenue)}</strong>
          </Typography>
        </Stack>
      )}
    </Box>
  );

  const renderItemRows = (carItems) =>
    carItems.map((item) => (
      <TableRow key={item._id} hover>
        <TableCell>{item.groupName || 'Khác'}</TableCell>
        <TableCell sx={{ minWidth: 200 }}>{item.content}</TableCell>
        {!isKtvUser && (
          <>
            <TableCell align="right">{formatMoney(item.amount)}</TableCell>
            <TableCell>{renderWorkers(item.allAssignments || item.assignments)}</TableCell>
            <TableCell align="right">
              {formatMoney(sumAssignmentsRevenue(item.allAssignments || item.assignments))}
            </TableCell>
          </>
        )}
      </TableRow>
    ));

  const renderCarCard = (car) => (
    <Card key={car.key} variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box>
            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap">
              <DirectionsCarIcon color="primary" />
              <Typography variant="h6" fontWeight="bold" color="primary">
                {car.plateNumber}
              </Typography>
              {car.carStatus && (
                <Chip size="small" label={CAR_STATUS_LABELS[car.carStatus] || car.carStatus} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {car.carType || '—'} · {car.carDate || '—'} · {car.items.length} hạng mục
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {renderDeliveredToggle(car)}
            {!isKtvUser && (
              <Box textAlign="right">
                <Typography variant="body2" color="text.secondary">
                  Tổng thành tiền
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  {formatMoney(car.totalAmount)}
                </Typography>
              </Box>
            )}
          </Stack>
        </Stack>

        {isCarExpanded(car) ? (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1.5}>
              {car.items.map((item) => (
                <Box
                  key={item._id}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: '#f9fafb',
                    border: '1px solid #eee',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {item.groupName || 'Khác'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {item.content}
                  </Typography>
                  {!isKtvUser && (
                    <>
                      <Typography variant="body2">
                        Thành tiền: <strong>{formatMoney(item.amount)}</strong>
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>{renderWorkers(item.allAssignments || item.assignments)}</Box>
                    </>
                  )}
                </Box>
              ))}
            </Stack>
          </>
        ) : (
          renderDeliveredSummary(car)
        )}
      </CardContent>
    </Card>
  );

  const renderCarBlock = (car) => (
    <Paper key={car.key} variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2 }}>
      <Box
        sx={{
          px: 2,
          py: 1.5,
          bgcolor: isDeliveredCar(car) && !isCarExpanded(car) ? '#f0fdf4' : '#f5f5f5',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
          <DirectionsCarIcon color="primary" />
          <Typography variant="h6" fontWeight="bold" color="primary">
            {car.plateNumber}
          </Typography>
          {car.carStatus && (
            <Chip size="small" label={CAR_STATUS_LABELS[car.carStatus] || car.carStatus} />
          )}
          <Typography variant="body2" color="text.secondary">
            {car.carType || '—'} · {car.carDate || '—'} · {car.items.length} hạng mục
          </Typography>
          {renderDeliveredToggle(car)}
        </Stack>
        {!isKtvUser && (
          <Stack direction="row" spacing={3} alignItems="center">
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">
                Tổng thành tiền
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatMoney(car.totalAmount)}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">
                Doanh thu thợ
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="primary">
                {formatMoney(car.totalRevenue)}
              </Typography>
            </Box>
          </Stack>
        )}
      </Box>

      {isCarExpanded(car) ? (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nhóm</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Nội dung</TableCell>
                {!isKtvUser && (
                  <>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">
                      Thành tiền
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold', minWidth: 180 }}>Thợ thực hiện</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} align="right">
                      Doanh thu
                    </TableCell>
                  </>
                )}
              </TableRow>
            </TableHead>
            <TableBody>{renderItemRows(car.items)}</TableBody>
          </Table>
        </Box>
      ) : (
        renderDeliveredSummary(car)
      )}
    </Paper>
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 4 } }}>
      <Box
        sx={{
          background: '#f5f5f5',
          borderRadius: 2,
          px: { xs: 2, sm: 4 },
          py: { xs: 2, sm: 3 },
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <HistoryIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold" color="primary">
            Lịch sử sửa chữa
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isKtvUser
              ? 'Hạng mục sửa chữa được phân công cho bạn, gom theo từng xe'
              : 'Hạng mục sửa chữa gom theo từng xe — xe đã giao mặc định thu gọn'}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 3 }}>
        <PeriodFilterToolbar
          period={period}
          onPeriodChange={setPeriod}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={exporting ? <CircularProgress size={16} /> : <FileDownloadIcon />}
            disabled={exporting || loading || carGroups.length === 0}
            onClick={handleExportExcel}
            sx={{ flexShrink: 0 }}
          >
            Xuất Excel
          </Button>
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Checkbox
                size="small"
                checked={includeDeliveredDetails}
                onChange={(e) => setIncludeDeliveredDetails(e.target.checked)}
              />
            }
            label="Kèm chi tiết xe đã giao"
          />
          {!isKtvUser && (
            <WorkerSearchSelect
              workers={workers}
              value={workerFilter}
              onChange={setWorkerFilter}
              label="Lọc theo thợ"
              sx={{ minWidth: { xs: '100%', sm: 260 }, width: { xs: '100%', sm: 'auto' } }}
            />
          )}
          <Typography variant="body2" color="text.secondary">
            {summary.totalCars || carGroups.length} xe · {summary.totalItems || items.length} hạng mục
          </Typography>
        </PeriodFilterToolbar>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {exportError && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setExportError('')}>
          {exportError}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : carGroups.length === 0 ? (
        <Alert severity="info">Không có lịch sử sửa chữa trong khoảng ngày đã chọn.</Alert>
      ) : (
        <>
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Stack spacing={2}>{carGroups.map(renderCarCard)}</Stack>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {carGroups.map(renderCarBlock)}
          </Box>
        </>
      )}

      {!loading && carGroups.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Paper
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 2,
              textAlign: 'right',
              bgcolor: '#e3f2fd',
            }}
          >
            {!isKtvUser && (
              <Typography variant="body2" color="text.secondary">
                DT trước hoa hồng: {formatMoney(summary.revenueBeforeCommission)}
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary">
              {isKtvUser ? 'Tổng doanh thu của bạn (sau trừ 25%)' : 'Tổng doanh thu (sau trừ 25%)'}
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {formatMoney(totalRevenue)}
            </Typography>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default RepairHistoryPage;
