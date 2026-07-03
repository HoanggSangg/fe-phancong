import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Chip,
  Grid,
  Divider,
  CircularProgress,
  Alert,
} from '@mui/material';
import BarChartIcon from '@mui/icons-material/BarChart';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LabelList,
} from 'recharts';
import {
  getWorkerRevenueChart,
  getWorkerWeeklyRevenueSummary,
} from '../apis/index';
import {
  formatMoney,
} from '../../utils/dateFilters';
import usePeriodFilter from '../../hooks/usePeriodFilter';
import PeriodFilterToolbar from '../common/PeriodFilterToolbar';
import FullscreenDialog from '../common/FullscreenDialog';

const formatMillion = (value) => {
  const number = Number(value || 0);
  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(1).replace('.0', '')}tr`;
  }
  if (number >= 1000) {
    return `${Math.round(number / 1000)}k`;
  }
  return String(number);
};

const getMaxNameLength = (chartData) =>
  chartData.reduce((max, item) => Math.max(max, String(item.name || '').trim().length), 0);

const getChartLayout = (count, maxNameLength, fullscreen = false) => {
  const tickFontSize = fullscreen
    ? count <= 10
      ? 15
      : count <= 20
        ? 14
        : count <= 35
          ? 13
          : 12
    : count <= 10
      ? 14
      : count <= 20
        ? 13
        : count <= 35
          ? 12
          : 11;

  const labelAngle = count <= 8 ? 0 : -45;
  const textAnchor = labelAngle === 0 ? 'middle' : 'end';
  const tickDy = labelAngle === 0 ? 14 : 10;
  const xHeight =
    labelAngle === 0
      ? 52
      : Math.min(96, Math.max(68, Math.ceil(maxNameLength * tickFontSize * 0.34)));

  const maxBarSize = fullscreen
    ? count <= 15
      ? 56
      : count <= 30
        ? 34
        : 20
    : count <= 8
      ? 40
      : count <= 15
        ? 28
        : count <= 25
          ? 18
          : count <= 40
            ? 12
            : 8;

  const barCategoryGap = fullscreen
    ? count <= 20
      ? '12%'
      : '5%'
    : count <= 8
      ? '16%'
      : count <= 15
        ? '10%'
        : count <= 25
          ? '6%'
          : count <= 40
            ? '3%'
            : '1%';

  return {
    maxBarSize,
    tickFontSize,
    labelAngle,
    textAnchor,
    tickDy,
    xHeight,
    showLabels: count <= 20 || fullscreen,
    margin: {
      top: fullscreen ? 16 : 12,
      right: fullscreen ? 16 : 8,
      left: 4,
      bottom: xHeight + 4,
    },
    barCategoryGap,
  };
};

const RevenueBarChart = ({ chartData, fullscreen = false, height = '100%' }) => {
  const maxNameLength = getMaxNameLength(chartData);
  const layout = getChartLayout(chartData.length, maxNameLength, fullscreen);

  const renderXAxisTick = ({ x, y, payload }) => (
    <text
      x={x}
      y={y}
      dy={layout.tickDy}
      textAnchor={layout.textAnchor}
      fill="#475569"
      fontSize={layout.tickFontSize}
      transform={layout.labelAngle !== 0 ? `rotate(${layout.labelAngle}, ${x}, ${y})` : undefined}
    >
      {payload.value}
    </text>
  );

  return (
    <Box
      sx={{
        width: '100%',
        height: fullscreen ? '100%' : height,
        minHeight: fullscreen ? 0 : undefined,
        flex: fullscreen ? 1 : undefined,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={layout.margin}
          barCategoryGap={layout.barCategoryGap}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            interval={0}
            height={layout.xHeight}
            tick={renderXAxisTick}
          />
          <YAxis tickFormatter={formatMillion} width={52} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(value) => formatMoney(value)}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.name || label}
          />
          <Bar
            dataKey="totalRevenue"
            name="Doanh thu"
            fill="#b71c1c"
            radius={[4, 4, 0, 0]}
            maxBarSize={layout.maxBarSize}
          >
            {layout.showLabels && (
              <LabelList
                dataKey="totalRevenue"
                position="top"
                style={{ fontSize: layout.tickFontSize + 1, fontWeight: 600 }}
                formatter={(value) => (Number(value || 0) > 0 ? formatMillion(value) : '')}
              />
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

const WorkerRevenueChart = () => {
  const { period, setPeriod, fromDate, setFromDate, toDate, setToDate } = usePeriodFilter('today');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [chartFullscreen, setChartFullscreen] = useState(false);

  const loadChart = async (from, to) => {
    try {
      setLoading(true);
      const res = await getWorkerRevenueChart(from, to);
      setData(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (error) {
      console.error('Lỗi lấy biểu đồ doanh thu:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadWeeklySummary = async (selectedDate = fromDate) => {
    try {
      setWeeklyLoading(true);
      const res = await getWorkerWeeklyRevenueSummary(selectedDate);
      setWeeklySummary(res.data || null);
    } catch (error) {
      console.error('Lỗi tổng kết tuần:', error);
      setWeeklySummary(null);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const handleViewChart = () => {
    setWeeklySummary(null);
    loadChart(fromDate, toDate);
  };

  const handleToggleWeeklySummary = () => {
    if (weeklySummary) {
      setWeeklySummary(null);
      return;
    }
    loadWeeklySummary(fromDate);
  };

  useEffect(() => {
    loadChart(fromDate, toDate);
  }, [fromDate, toDate]);

  const chartData = useMemo(
    () =>
      data
        .map((item) => ({
          ...item,
          totalRevenue: Number(item.totalRevenue || 0),
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue),
    [data]
  );

  const canShowChart = !loading && chartData.length > 0;
  const chartBoxHeight = chartData.length > 25 ? { xs: 420, sm: 480, md: 540 } : { xs: 380, sm: 440, md: 500 };

  return (
    <Box sx={{ width: '100%', py: { xs: 2, sm: 3 } }}>
      <Box
        sx={{
          background: '#f5f5f5',
          borderRadius: 2,
          px: { xs: 2, sm: 3 },
          py: { xs: 2, sm: 2.5 },
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <BarChartIcon color="primary" sx={{ fontSize: 40 }} />
        <Box>
          <Typography variant="h5" fontWeight="bold" color="primary">
            Biểu đồ doanh thu thợ
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Doanh thu theo hạng mục sửa chữa đã phân công cho từng thợ
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 3, borderRadius: 3, width: '100%' }}>
        <PeriodFilterToolbar
          period={period}
          onPeriodChange={setPeriod}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={(value) => {
            setFromDate(value);
            setWeeklySummary(null);
          }}
          onToDateChange={(value) => {
            setToDate(value);
            setWeeklySummary(null);
          }}
          showDateChip={false}
        >
          <Button
            variant="contained"
            onClick={handleViewChart}
            disabled={loading}
            sx={{ height: 40, fontWeight: 700 }}
          >
            {loading ? 'Đang tải...' : 'Xem biểu đồ'}
          </Button>
          <Button
            variant="outlined"
            onClick={handleToggleWeeklySummary}
            disabled={weeklyLoading}
            sx={{ height: 40, fontWeight: 700 }}
          >
            {weeklyLoading
              ? 'Đang tổng kết...'
              : weeklySummary
                ? 'Ẩn tổng kết tuần'
                : 'Tổng kết tuần'}
          </Button>
        </PeriodFilterToolbar>

        <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 2 }}>
          <Chip label={`${fromDate} → ${toDate}`} color="error" variant="outlined" size="small" />
          <Chip label={`Tổng thợ: ${chartData.length}`} color="primary" variant="outlined" size="small" />
          <Chip label="Nguồn: hạng mục sửa chữa" color="success" variant="outlined" size="small" />
          {weeklySummary?.week && (
            <Chip
              label={`Tuần: ${weeklySummary.week.from} → ${weeklySummary.week.to}`}
              color="warning"
              variant="outlined"
              size="small"
            />
          )}
        </Stack>
      </Paper>

      {weeklySummary && (
        <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: '100%',
                borderRadius: 2,
                bgcolor: '#fef2f2',
                border: '1px solid #fecaca',
              }}
            >
              <Typography sx={{ color: '#991b1b', fontSize: 14, fontWeight: 700 }}>
                Tuyên dương tuần
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 22, fontWeight: 800 }}>
                {weeklySummary.bestWorker?.name || 'Chưa có'}
              </Typography>
              <Typography sx={{ color: '#64748b' }}>
                Doanh thu tuần: {formatMoney(weeklySummary.bestWorker?.weeklyRevenue || 0)}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                height: '100%',
                borderRadius: 2,
                bgcolor: '#fff7ed',
                border: '1px solid #fed7aa',
              }}
            >
              <Typography sx={{ color: '#9a3412', fontSize: 14, fontWeight: 700 }}>
                Cảnh cáo tuần
              </Typography>
              <Typography sx={{ mt: 1, fontSize: 22, fontWeight: 800 }}>
                {weeklySummary.worstWorker?.name || 'Chưa có'}
              </Typography>
              <Typography sx={{ color: '#64748b' }}>
                Doanh thu tuần: {formatMoney(weeklySummary.worstWorker?.weeklyRevenue || 0)}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      <Paper
        elevation={0}
        sx={{
          width: '100%',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            bgcolor: '#fafafa',
            borderBottom: '1px solid #eee',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Typography fontWeight="bold">Biểu đồ cột doanh thu theo thợ</Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FullscreenIcon />}
            onClick={() => setChartFullscreen(true)}
            disabled={!canShowChart}
          >
            Xem full màn hình
          </Button>
        </Box>

        <Box sx={{ width: '100%', height: chartBoxHeight, p: { xs: 1, sm: 2 } }}>
          {loading ? (
            <Box sx={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : chartData.length === 0 ? (
            <Alert severity="info" sx={{ m: 2 }}>
              Chưa có dữ liệu doanh thu cho ngày đã chọn.
            </Alert>
          ) : (
            <RevenueBarChart chartData={chartData} />
          )}
        </Box>
      </Paper>

      <FullscreenDialog
        open={chartFullscreen}
        onClose={() => setChartFullscreen(false)}
        title={`Biểu đồ doanh thu thợ — ${fromDate} → ${toDate}`}
        bgcolor="#fff"
        fillContent
      >
        <Box sx={{ flex: 1, minHeight: 0, width: '100%', p: { xs: 1, sm: 2 } }}>
          <RevenueBarChart chartData={chartData} fullscreen />
        </Box>
      </FullscreenDialog>

      <Divider sx={{ my: 2 }} />
      <Typography variant="caption" color="text.secondary" display="block" textAlign="right">
        Doanh thu = thành tiền hạng mục × % thực hiện × 75%
      </Typography>
    </Box>
  );
};

export default WorkerRevenueChart;
