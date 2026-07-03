import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { getWorkerKpi, getAllWorkers, getAllWorkersKpi } from '../apis/index';
import { useAuth } from '../../context/AuthContext';
import { isKtv } from '../../utils/permissions';
import WorkerSearchSelect from '../common/WorkerSearchSelect';
import {
  formatMoney,
} from '../../utils/dateFilters';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import PeriodFilterToolbar from '../common/PeriodFilterToolbar';

const KpiCard = ({ label, value, color = '#1e293b', sub }) => (
  <Card sx={{ height: '100%', border: '1px solid #e2e8f0' }}>
    <CardContent>
      <Typography variant="body2" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ color, mt: 0.5 }}>
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

const WorkerKpiPage = () => {
  const { user } = useAuth();
  const ktvUser = isKtv(user?.role);

  const { period, setPeriod, fromDate, setFromDate, toDate, setToDate } = usePeriodFilter('today');
  const [workerId, setWorkerId] = useState('');
  const [workers, setWorkers] = useState([]);
  const [kpi, setKpi] = useState(null);
  const [allKpi, setAllKpi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ktvUser) {
      getAllWorkers()
        .then((res) => setWorkers(res.data.workers || res.data || []))
        .catch(() => setWorkers([]));
    }
  }, [ktvUser]);

  const fetchKpi = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { period };
      if (period === 'custom') {
        params.from = fromDate;
        params.to = toDate;
      }
      if (!ktvUser && workerId) {
        params.workerId = workerId;
      }

      if (ktvUser || workerId) {
        const res = await getWorkerKpi(params);
        setKpi(res.data?.data || null);
        setAllKpi([]);
      } else {
        const res = await getAllWorkersKpi(params);
        setAllKpi(res.data?.data || []);
        setKpi(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Không tải được KPI');
      setKpi(null);
      setAllKpi([]);
    } finally {
      setLoading(false);
    }
  }, [period, fromDate, toDate, workerId, ktvUser]);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  const renderKpiGrid = (data) => (
    <Grid container spacing={2}>
      <Grid item xs={6} sm={4} md={2}>
        <KpiCard label="Số xe đã làm" value={data.carsDone ?? 0} color="#2563eb" />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <KpiCard
          label="Hạng mục thực hiện"
          value={data.totalRepairItems ?? 0}
          color="#0ea5e9"
        />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <KpiCard
          label="DT trước hoa hồng"
          value={formatMoney(data.revenueBeforeCommission)}
          color="#7c3aed"
        />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <KpiCard
          label="DT sau trừ 25%"
          value={formatMoney(data.revenueAfterCommission)}
          color="#059669"
        />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <KpiCard label="Xe đúng hạn" value={data.carsOnTime ?? 0} color="#16a34a" />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <KpiCard label="Xe trễ" value={data.carsLate ?? 0} color="#dc2626" />
      </Grid>
      <Grid item xs={6} sm={4} md={2}>
        <KpiCard
          label="Hiệu suất"
          value={`${data.performancePercentage ?? 0}%`}
          color="#d97706"
          sub={`${data.totalWork ?? 0}/${data.totalCarsInRange ?? 0} xe`}
        />
      </Grid>
    </Grid>
  );

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          background: '#f5f5f5',
          borderRadius: 2,
          px: 3,
          py: 2.5,
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <AssessmentIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold" color="primary">
            KPI thợ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {ktvUser
              ? 'Chỉ số tính từ hạng mục sửa chữa đã gán thợ thực hiện'
              : 'Theo dõi KPI từng thợ — dựa trên thợ thực hiện hạng mục sửa chữa'}
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
          {!ktvUser && (
            <WorkerSearchSelect
              workers={workers}
              value={workerId}
              onChange={setWorkerId}
              label="Chọn thợ"
              emptyLabel="Tất cả thợ (bảng tổng hợp)"
              sx={{ minWidth: { xs: '100%', sm: 260 }, width: { xs: '100%', sm: 'auto' } }}
            />
          )}
        </PeriodFilterToolbar>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : kpi ? (
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            {kpi.name} {kpi.soBaoDanh ? `(SBD: ${kpi.soBaoDanh})` : ''}
          </Typography>
          {renderKpiGrid(kpi)}
        </Box>
      ) : allKpi.length > 0 ? (
        <Stack spacing={2}>
          {allKpi.map((row) => (
            <Paper key={row.workerId} sx={{ p: 2, borderRadius: 2 }}>
              <Typography fontWeight="bold" sx={{ mb: 1.5 }}>
                {row.name} {row.soBaoDanh ? `(SBD: ${row.soBaoDanh})` : ''}
              </Typography>
              {renderKpiGrid(row)}
            </Paper>
          ))}
        </Stack>
      ) : (
        <Alert severity="info">Chưa có dữ liệu KPI trong khoảng thời gian đã chọn.</Alert>
      )}
    </Box>
  );
};

export default WorkerKpiPage;
