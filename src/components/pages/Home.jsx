import React, { useState } from 'react';
import {
  Typography,
  Paper,
  Box,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  useTheme,
  useMediaQuery,
  Stack,
  MenuItem,
  FormControl,
  Select,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import BuildIcon from '@mui/icons-material/Build';
import DoneIcon from '@mui/icons-material/Done';
import LocalCarWashIcon from '@mui/icons-material/LocalCarWash';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReplayIcon from '@mui/icons-material/Replay';
import ErrorIcon from '@mui/icons-material/Error';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import { getSupervisorsFromCars } from '../../utils/carListHelpers';
import useHomeDashboard from '../../hooks/queries/useHomeDashboard';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import FilterPanel from '../common/FilterPanel';

const Home = () => {
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedSectionKey, setSelectedSectionKey] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState('');

  const { data, isLoading } = useHomeDashboard();

  const carsToday = data?.carsToday || [];
  const overdueCars = data?.overdueCars || [];
  const carsByStatus = data?.carsByStatus || {};
  const locations = data?.locations || [];
  const todayISO = data?.todayISO || new Date().toISOString().slice(0, 10);
  const todayDisplay = new Date().toLocaleDateString('vi-VN');

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const getColor = (car) => {
    if (car.isLate || ['warranty', 'rescue'].includes(car.condition)) return '#d32f2f';
    if (['vip', 'good'].includes(car.condition)) return 'green';
    return 'inherit';
  };

  const carSections = [
    { key: 'pending', label: '⏳ Xe chờ sửa:' },
    { key: 'working', label: '🔧 Xe đang sửa:' },
    { key: 'done', label: '✅ Xe hoàn thành:' },
    { key: 'waiting_wash', label: '🧼 Xe chờ rửa:' },
    { key: 'waiting_handover', label: '🚚 Xe chờ giao:' },
    { key: 'delivered', label: '📦 Xe đã giao:' },
    { key: 'additional_repair', label: '🔁 Xe sửa bổ sung:' },
  ];

  const statsConfig = [
    { key: 'pending', label: 'Chờ', icon: <QueryBuilderIcon color="warning" /> },
    { key: 'working', label: 'Đang sửa', icon: <BuildIcon color="primary" /> },
    { key: 'done', label: 'Hoàn thành', icon: <DoneIcon color="success" /> },
    { key: 'waiting_wash', label: 'Chờ rửa', icon: <LocalCarWashIcon color="info" /> },
    { key: 'waiting_handover', label: 'Chờ giao', icon: <LocalShippingIcon color="secondary" /> },
    { key: 'delivered', label: 'Đã giao', icon: <InventoryIcon color="action" /> },
    { key: 'additional_repair', label: 'Bổ sung', icon: <ReplayIcon color="error" /> },
    { key: 'late', label: 'Trễ hẹn', icon: <ErrorIcon color="error" /> },
  ];

  const getFilteredStats = () => {
    const result = {
      pending: 0,
      working: 0,
      done: 0,
      waiting_wash: 0,
      waiting_handover: 0,
      delivered: 0,
      additional_repair: 0,
    };

    for (const key in carsByStatus) {
      const cars = (carsByStatus[key] || []).filter((car) => car.currentDate === todayISO);
      const filtered = filterCars(cars);
      result[key] = filtered.length;
    }

    return result;
  };

  const getWorkersByRole = (workers = []) => {
    const formatWorkers = (role) =>
      workers
        .filter((w) => w.role === role)
        .map((w) => `- ${w.worker?.name}`)
        .filter(Boolean)
        .join('\n');

    return {
      mainWorkers: formatWorkers('main'),
      subWorkers: formatWorkers('sub'),
    };
  };

  const renderCarCard = (car, index) => {
    const { mainWorkers, subWorkers } = getWorkersByRole(car.workers);
    const color = getColor(car);
    return (
      <Paper key={car._id} sx={{ p: 1.5, borderRadius: 2, border: color !== 'inherit' ? `2px solid ${color}` : undefined }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <DirectionsCarIcon fontSize="small" color={color === '#d32f2f' ? 'error' : color === 'green' ? 'success' : 'primary'} />
          <Typography variant="subtitle1" fontWeight="bold" sx={{ color }}>{car.plateNumber}</Typography>
        </Stack>
        <Stack spacing={0.5}>
          <Typography variant="body2"><LocationOnIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'text-bottom' }} />{car.location?.name || '---'}</Typography>
          <Typography variant="body2">{car.externalCarTypeName || '---'} · {car.currentTime}</Typography>
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
            <Typography variant="caption">Thợ chính:</Typography>
            {mainWorkers ? <Chip label={mainWorkers} color="primary" /> : <Chip label="Trống" color="error" />}
          </Stack>
          <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap">
            <Typography variant="caption">Thợ phụ:</Typography>
            {subWorkers ? <Chip label={subWorkers} color="secondary" /> : <Chip label="Trống" color="error" />}
          </Stack>
          <Typography variant="caption" color="text.secondary">GS: {car.supervisor?.name || '---'}</Typography>
        </Stack>
      </Paper>
    );
  };

  const renderCarTable = (cars) => (
    <Box sx={{ width: '100%' }}>
      <Table sx={{ width: '100%' }} stickyHeader>
        <TableHead>
          <TableRow>
            {['STT', 'Biển số', 'Địa điểm', 'Loại xe', 'Nhận', 'Thợ chính', 'Thợ phụ', 'Giám sát'].map((title, idx) => (
              <TableCell key={title} align={idx === 0 ? 'center' : 'left'} sx={{ bgcolor: 'grey.100', fontWeight: 600, py: 1 }}>
                {title}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {cars.map((car, index) => {
            const { mainWorkers, subWorkers } = getWorkersByRole(car.workers);
            const color = getColor(car);
            return (
              <TableRow key={car._id} sx={{ backgroundColor: index % 2 === 0 ? '#fafafa' : '#fff', transition: 'background 0.2s', '&:hover': { backgroundColor: '#e3f2fd' } }}>
                <TableCell align="center"><Typography variant="body2" sx={{ color }}>{index + 1}</Typography></TableCell>
                <TableCell><Typography variant="body2" fontWeight={600} sx={{ color }}>{car.plateNumber}</Typography></TableCell>
                <TableCell><Typography variant="body2">{car.location?.name || '---'}</Typography></TableCell>
                <TableCell><Typography variant="body2">{car.externalCarTypeName || '---'}</Typography></TableCell>
                <TableCell><Typography variant="body2">{car.currentTime}</Typography></TableCell>
                <TableCell>{mainWorkers ? <Chip label={mainWorkers} color="primary" /> : <Chip label="Trống" color="error" />}</TableCell>
                <TableCell>{subWorkers ? <Chip label={subWorkers} color="primary" /> : <Chip label="Trống" color="error" />}</TableCell>
                <TableCell><Typography variant="body2">{car.supervisor?.name || '---'}</Typography></TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Box>
  );

  const allSupervisors = getSupervisorsFromCars([
    ...carsToday,
    ...overdueCars,
    ...Object.values(carsByStatus).flat(),
  ]);

  // Lọc theo địa điểm và giám sát viên
  const filterCars = (cars) => {
    let filtered = cars;
    if (selectedLocation) {
      filtered = filtered.filter((car) => car.location?._id === selectedLocation);
    }
    if (selectedSupervisor) {
      filtered = filtered.filter((car) => car.supervisor?._id === selectedSupervisor);
    }
    return filtered;
  };

  return (
    <PageLayout>
      {isLoading && (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress size={28} />
        </Box>
      )}

      <PageHeader
        icon={<DirectionsCarIcon color="primary" />}
        title={`Xe trong ngày (${todayDisplay})`}
        subtitle="Theo dõi trạng thái, lọc theo địa điểm và giám sát"
      />

      <FilterPanel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} useFlexGap flexWrap="wrap">
          <FormControl sx={{ minWidth: { xs: '100%', sm: 200 }, flex: 1 }} size="small">
            <InputLabel id="home-location-label">Địa điểm</InputLabel>
            <Select
              labelId="home-location-label"
              id="home-location-select"
              value={selectedLocation}
              label="Địa điểm"
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <MenuItem value="">Tất cả địa điểm</MenuItem>
              {locations.map((loc) => (
                <MenuItem key={loc._id} value={loc._id}>{loc.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: { xs: '100%', sm: 200 }, flex: 1 }} size="small">
            <InputLabel id="home-supervisor-label">Giám sát</InputLabel>
            <Select
              labelId="home-supervisor-label"
              id="home-supervisor-select"
              value={selectedSupervisor}
              label="Giám sát"
              onChange={(e) => setSelectedSupervisor(e.target.value)}
            >
              <MenuItem value="">Tất cả giám sát</MenuItem>
              {allSupervisors.map((sup) => (
                <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: { xs: '100%', sm: 200 }, flex: 1 }} size="small">
            <InputLabel id="home-section-label">Mục hiển thị</InputLabel>
            <Select
              labelId="home-section-label"
              id="home-section-select"
              value={selectedSectionKey}
              label="Mục hiển thị"
              onChange={(e) => setSelectedSectionKey(e.target.value)}
            >
              <MenuItem value="">Tất cả mục</MenuItem>
              <MenuItem value="today">Xe hôm nay</MenuItem>
              <MenuItem value="late">Xe trễ hẹn</MenuItem>
              {carSections.map((section) => (
                <MenuItem key={section.key} value={section.key}>{section.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </FilterPanel>

      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Thống kê</Typography>
        <Grid container spacing={1}>
          {statsConfig.map((stat) => (
            <Grid size={{ xs: 4, sm: 3, md: 1.5 }} key={stat.key}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1.5,
                  textAlign: 'center',
                  bgcolor: stat.key === 'late' ? '#fff3e0' : 'grey.50',
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ '& .MuiSvgIcon-root': { fontSize: 18 } }}>{stat.icon}</Box>
                <Typography variant="caption" display="block" fontWeight={600}>{stat.label}</Typography>
                <Typography variant="subtitle2" color={stat.key === 'late' ? 'error' : 'primary'}>
                  {stat.key === 'late' ? filterCars(overdueCars).length : getFilteredStats()[stat.key]}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {(!selectedSectionKey || selectedSectionKey === 'today') && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Xe hôm nay</Typography>
          {filterCars(carsToday).length === 0 ? (
            <Typography variant="body2" color="text.secondary">Không có xe nào.</Typography>
          ) : isMobile ? (
            <Stack spacing={1.5}>{filterCars(carsToday).map(renderCarCard)}</Stack>
          ) : (
            <Paper sx={{ overflowX: 'auto' }}>{renderCarTable(filterCars(carsToday))}</Paper>
          )}
        </Box>
      )}

      {(!selectedSectionKey || selectedSectionKey === 'late') && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" fontWeight={700} gutterBottom>Xe trễ hẹn</Typography>
          {filterCars(overdueCars).length === 0 ? (
            <Typography variant="body2" color="text.secondary">Không có xe nào.</Typography>
          ) : isMobile ? (
            <Stack spacing={1.5}>{filterCars(overdueCars).map(renderCarCard)}</Stack>
          ) : (
            <Paper sx={{ overflowX: 'auto' }}>{renderCarTable(filterCars(overdueCars))}</Paper>
          )}
        </Box>
      )}

      {carSections
        .filter(({ key }) => !selectedSectionKey || key === selectedSectionKey)
        .map(({ key, label }) => {
          const cars = carsByStatus[key] || [];
          const carsTodayOnly = cars.filter((car) => car.currentDate === todayISO);
          const filtered = filterCars(carsTodayOnly);
          return (
            <Box key={key} sx={{ mb: 2 }}>
              <Typography variant="subtitle2" fontWeight={700} gutterBottom>{label}</Typography>
              {filtered.length === 0 ? (
                <Typography variant="body2" color="text.secondary">Không có xe nào.</Typography>
              ) : isMobile ? (
                <Stack spacing={1.5}>{filtered.map(renderCarCard)}</Stack>
              ) : (
                <Paper sx={{ overflowX: 'auto' }}>{renderCarTable(filtered)}</Paper>
              )}
            </Box>
          );
        })}
    </PageLayout>
  );
};

export default Home;
