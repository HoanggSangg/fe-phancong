import React, { useEffect, useMemo, useState } from 'react';
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
  TablePagination,
  Collapse,
} from '@mui/material';
import HistoryIcon from '@mui/icons-material/History';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useAuth } from '../../context/AuthContext';
import { CAR_STATUS_LABELS, isKtv, hasPermission } from '../../utils/permissions';
import WorkerSearchSelect from '../common/WorkerSearchSelect';
import { formatMoney } from '../../utils/dateFilters';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import PeriodFilterToolbar from '../common/PeriodFilterToolbar';
import {
  buildCarGroups,
  exportRepairHistoryToExcel,
  sumAssignmentsRevenue,
} from '../../utils/repairHistoryExcel';
import useRepairHistory, { fetchRepairHistoryData } from '../../hooks/queries/useRepairHistory';
import useRevenueSettings from '../../hooks/queries/useRevenueSettings';
import useWorkers from '../../hooks/queries/useWorkers';
import useDeferredReady from '../../hooks/useDeferredReady';
import { REPAIR_HISTORY_PAGE_SIZE } from '../../utils/repairHistory';
import { getItemRevenueBaseAmount, getRevenueBaseLabel } from '../../utils/revenueHelpers';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import FilterPanel from '../common/FilterPanel';
import { AnimatedListItem, AnimatedValue, listEnter, softPulse } from '../common/AnimatedValue';

const isDeliveredCar = (car) => car.carStatus === 'delivered';

const formatAnimatedMoney = (value, animationKey) => (
  <AnimatedValue animationKey={animationKey}>
    {formatMoney(value)}
  </AnimatedValue>
);

const RepairHistoryPage = () => {
  const { user } = useAuth();
  const isKtvUser = isKtv(user?.role);
  const canViewRevenue = hasPermission(user, 'reports.revenue');
  const canViewItemPrices = isKtvUser || canViewRevenue;

  const [page, setPage] = useState(1);
  const [exportError, setExportError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [includeDeliveredDetails, setIncludeDeliveredDetails] = useState(false);
  const [expandedDeliveredCars, setExpandedDeliveredCars] = useState(() => new Set());
  const { period, setPeriod, fromDate, setFromDate, toDate, setToDate } = usePeriodFilter('today');
  const [workerFilter, setWorkerFilter] = useState('');

  const workerIdParam = !isKtvUser && workerFilter ? workerFilter : undefined;

  const { data: revenueSettings, isLoading: revenueSettingsLoading } = useRevenueSettings(
    canViewItemPrices
  );
  const revenueBase = revenueSettings?.revenueBase || 'amount';
  const revenueBaseLabel = getRevenueBaseLabel(revenueBase);

  const { data, isLoading, isFetching, error, isFetched } = useRepairHistory({
    from: fromDate,
    to: toDate,
    workerId: workerIdParam,
    page,
    enabled: Boolean(fromDate && toDate && (!canViewItemPrices || !revenueSettingsLoading)),
  });

  const historyLoading = (canViewItemPrices && revenueSettingsLoading) || isLoading;

  const workersReady = useDeferredReady(canViewRevenue && !isKtvUser && isFetched, 400);
  const { data: workers = [] } = useWorkers(workersReady);

  useEffect(() => {
    setPage(1);
    setExpandedDeliveredCars(new Set());
  }, [fromDate, toDate, workerFilter, isKtvUser]);

  const items = data?.items || [];
  const summary = data?.summary || {
    totalRevenue: 0,
    revenueBeforeCommission: 0,
    revenueAfterCommission: 0,
    totalItems: 0,
    totalCars: 0,
  };
  const pagination = data?.pagination;

  const carGroups = useMemo(
    () => buildCarGroups(items, revenueBase),
    [items, revenueBase]
  );
  const totalRevenue = summary.revenueAfterCommission || summary.totalRevenue;
  const errorMessage = error?.response?.data?.message || (error ? 'Không tải được lịch sử sửa chữa' : '');
  const contentAnimationKey = `${fromDate}-${toDate}-${page}-${workerIdParam || 'all'}-${revenueBase}`;
  const isCostBase = revenueBase === 'cost';

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
      const { items: exportItems } = await fetchRepairHistoryData({
        from: fromDate,
        to: toDate,
        workerId: workerIdParam,
        paginate: false,
      });

      const exportCarGroups = buildCarGroups(exportItems, revenueBase);
      if (exportCarGroups.length === 0) {
        setExportError('Không có dữ liệu để xuất Excel trong khoảng đã chọn.');
        return;
      }

      await exportRepairHistoryToExcel({
        carGroups: exportCarGroups,
        fromDate,
        toDate,
        includeDeliveredDetails,
        isKtvUser: !canViewRevenue,
        revenueBase,
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
            {(canViewRevenue || isKtvUser) && <> · {formatMoney(assignment.revenue)}</>}
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
      {canViewItemPrices && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            Tổng {revenueBaseLabel.toLowerCase()}:{' '}
            <strong>{formatAnimatedMoney(car.totalAmount, `${car.key}-total-${revenueBase}`)}</strong>
          </Typography>
          {canViewRevenue && (
            <Typography variant="body2">
              Doanh thu thợ:{' '}
              <strong>{formatAnimatedMoney(car.totalRevenue, `${car.key}-rev-${revenueBase}`)}</strong>
            </Typography>
          )}
        </Stack>
      )}
    </Box>
  );

  const renderItemRows = (carItems) =>
    carItems.map((item) => (
      <TableRow key={item._id} hover>
        <TableCell>{item.groupName || 'Khác'}</TableCell>
        <TableCell sx={{ minWidth: 200 }}>{item.content}</TableCell>
        {canViewItemPrices && (
          <TableCell align="right">
            {formatAnimatedMoney(
              getItemRevenueBaseAmount(item, revenueBase),
              `${item._id}-val-${revenueBase}`
            )}
          </TableCell>
        )}
        {(canViewRevenue || isKtvUser) && (
          <TableCell>{renderWorkers(item.allAssignments || item.assignments)}</TableCell>
        )}
        {canViewRevenue && (
          <TableCell align="right">
            {formatMoney(sumAssignmentsRevenue(item.allAssignments || item.assignments))}
          </TableCell>
        )}
      </TableRow>
    ));

  const renderCarCard = (car, index) => (
    <AnimatedListItem key={car.key} index={index}>
    <Card variant="outlined" sx={{ borderRadius: 2, transition: 'box-shadow 0.25s ease', '&:hover': { boxShadow: 2 } }}>
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
            {canViewItemPrices && (
              <Box textAlign="right">
                <Typography variant="body2" color="text.secondary">
                  Tổng {revenueBaseLabel.toLowerCase()}
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  {formatAnimatedMoney(car.totalAmount, `${car.key}-card-total-${revenueBase}`)}
                </Typography>
              </Box>
            )}
          </Stack>
        </Stack>

        <Collapse in={isCarExpanded(car)} timeout={320} unmountOnExit>
          <>
            <Divider sx={{ my: 1.5 }} />
            <Stack spacing={1.5}>
              {car.items.map((item, itemIndex) => (
                <Box
                  key={item._id}
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    bgcolor: '#f9fafb',
                    border: '1px solid #eee',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    animation: `${listEnter} 0.35s cubic-bezier(0.22, 1, 0.36, 1) both`,
                    animationDelay: isCarExpanded(car) ? `${itemIndex * 40}ms` : '0ms',
                    '&:hover': { transform: 'translateY(-1px)', boxShadow: 1 },
                  }}
                >
                  <Typography variant="subtitle2" fontWeight="bold">
                    {item.groupName || 'Khác'}
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 0.5 }}>
                    {item.content}
                  </Typography>
                  {canViewItemPrices && (
                    <Typography variant="body2">
                      {revenueBaseLabel}:{' '}
                      <strong>
                        {formatAnimatedMoney(
                          getItemRevenueBaseAmount(item, revenueBase),
                          `${item._id}-card-val-${revenueBase}`
                        )}
                      </strong>
                    </Typography>
                  )}
                  {(canViewRevenue || isKtvUser) && (
                    <Box sx={{ mt: 0.5 }}>{renderWorkers(item.allAssignments || item.assignments)}</Box>
                  )}
                </Box>
              ))}
            </Stack>
          </>
        </Collapse>

        {!isCarExpanded(car) && renderDeliveredSummary(car)}
      </CardContent>
    </Card>
    </AnimatedListItem>
  );

  const renderCarBlock = (car, index) => (
    <AnimatedListItem key={car.key} index={index}>
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mb: 2, transition: 'box-shadow 0.25s ease', '&:hover': { boxShadow: 2 } }}>
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
            {car.plateNumber} - {car.roNumber}
          </Typography>
          {car.carStatus && (
            <Chip size="small" label={CAR_STATUS_LABELS[car.carStatus] || car.carStatus} />
          )}
          <Typography variant="body2" color="text.secondary">
            {car.carType || '—'} · {car.carDate || '—'} · {car.items.length} hạng mục
          </Typography>
          {renderDeliveredToggle(car)}
        </Stack>
        {canViewItemPrices && (
          <Stack direction="row" spacing={3} alignItems="center">
            <Box textAlign="right">
              <Typography variant="caption" color="text.secondary">
                Tổng {revenueBaseLabel.toLowerCase()}
              </Typography>
              <Typography variant="body1" fontWeight="bold">
                {formatAnimatedMoney(car.totalAmount, `${car.key}-block-total-${revenueBase}`)}
              </Typography>
            </Box>
            {canViewRevenue && (
              <Box textAlign="right">
                <Typography variant="caption" color="text.secondary">
                  Doanh thu thợ
                </Typography>
                <Typography variant="body1" fontWeight="bold" color="primary">
                  {formatAnimatedMoney(car.totalRevenue, `${car.key}-block-rev-${revenueBase}`)}
                </Typography>
              </Box>
            )}
          </Stack>
        )}
      </Box>

      <Collapse in={isCarExpanded(car)} timeout={320} unmountOnExit>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Nhóm</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Nội dung</TableCell>
                {canViewItemPrices && (
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">
                    <AnimatedValue animationKey={`col-${revenueBase}`}>
                      {revenueBaseLabel}
                    </AnimatedValue>
                  </TableCell>
                )}
                {(canViewRevenue || isKtvUser) && (
                  <TableCell sx={{ fontWeight: 'bold', minWidth: 180 }}>Thợ thực hiện</TableCell>
                )}
                {canViewRevenue && (
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">
                    Doanh thu
                  </TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>{renderItemRows(car.items)}</TableBody>
          </Table>
        </Box>
      </Collapse>

      {!isCarExpanded(car) && renderDeliveredSummary(car)}
    </Paper>
    </AnimatedListItem>
  );

  const showPagination = pagination && pagination.totalPages > 1;

  return (
    <PageLayout>
      <PageHeader
        icon={<HistoryIcon />}
        title="Lịch sử sửa chữa"
        subtitle={
          isKtvUser
            ? 'Hạng mục sửa chữa được phân công cho bạn, gom theo từng xe'
            : 'Hạng mục sửa chữa gom theo từng xe — xe đã giao mặc định thu gọn'
        }
        actions={
          canViewItemPrices ? (
            <Chip
              key={revenueBase}
              size="small"
              label={`Cơ sở hiển thị: ${revenueBaseLabel}`}
              color={isCostBase ? 'warning' : 'info'}
              variant="outlined"
              sx={{ transition: 'all 0.3s ease' }}
            />
          ) : null
        }
      />

      <FilterPanel title="Khoảng thời gian">
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
            disabled={exporting || historyLoading || (summary.totalItems === 0 && items.length === 0)}
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
          {canViewRevenue && (
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
            {showPagination && ` · Trang ${page}/${pagination.totalPages}`}
          </Typography>
        </PeriodFilterToolbar>
      </FilterPanel>

      {errorMessage && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorMessage}
        </Alert>
      )}

      {exportError && (
        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setExportError('')}>
          {exportError}
        </Alert>
      )}

      {historyLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : carGroups.length === 0 ? (
        <Alert severity="info">Không có lịch sử sửa chữa trong khoảng ngày đã chọn.</Alert>
      ) : (
        <Box key={contentAnimationKey}>
          <Box sx={{ display: { xs: 'block', md: 'none' } }}>
            <Stack spacing={2}>{carGroups.map(renderCarCard)}</Stack>
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'block' } }}>
            {carGroups.map(renderCarBlock)}
          </Box>
        </Box>
      )}

      {showPagination && !historyLoading && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={page - 1}
          onPageChange={(_, nextPage) => setPage(nextPage + 1)}
          rowsPerPage={REPAIR_HISTORY_PAGE_SIZE}
          rowsPerPageOptions={[REPAIR_HISTORY_PAGE_SIZE]}
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} / ${count} hạng mục`}
          sx={{ mt: 1 }}
        />
      )}

      {!historyLoading && carGroups.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Paper
            key={`summary-${contentAnimationKey}`}
            elevation={2}
            sx={{
              p: 2,
              borderRadius: 2,
              textAlign: 'right',
              bgcolor: isCostBase ? '#fffbeb' : '#e3f2fd',
              border: '1px solid',
              borderColor: isCostBase ? '#fde68a' : '#bbdefb',
              transition: 'background-color 0.35s ease, border-color 0.35s ease, opacity 0.25s ease',
              animation: isFetching ? `${softPulse} 1.2s ease-in-out infinite` : 'none',
            }}
          >
            {canViewRevenue && (
              <Typography variant="body2" color="text.secondary">
                DT trước hoa hồng ({revenueBaseLabel}):{' '}
                {formatAnimatedMoney(summary.revenueBeforeCommission, `gross-${revenueBase}-${summary.revenueBeforeCommission}`)}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Cơ sở doanh thu:{' '}
              <AnimatedValue animationKey={`base-label-${revenueBase}`}>
                {revenueBaseLabel}
              </AnimatedValue>
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary" component="div">
              {formatAnimatedMoney(totalRevenue, `net-${revenueBase}-${totalRevenue}`)}
            </Typography>
          </Paper>
        </>
      )}
    </PageLayout>
  );
};

export default RepairHistoryPage;
