import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Avatar,
  TextField,
  CircularProgress,
  Paper,
  Chip,
  Stack,
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { getAvailableWorkers } from '../apis';
import { filterWorkersByKeyword } from '../../utils/workerSearch';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import useIsMobile from '../../hooks/useIsMobile';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import usePageVisible from '../../hooks/usePageVisible';

const removeVietnameseTones = (str = '') =>
  str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

const getWorkerPrefix = (worker) => {
  const teamName = removeVietnameseTones(worker.team?.name || '');
  if (teamName.includes('lai xe') || teamName.includes('tai xe') || teamName.includes('driver')) {
    return 'TX';
  }
  return 'KTV';
};

const REFRESH_INTERVAL_MS = 30_000;

const WorkerRow = ({ worker }) => (
  <Paper
    variant="outlined"
    sx={{
      px: 1.25,
      py: 0.85,
      borderRadius: 1.5,
      border: '2px solid',
      borderColor: 'grey.300',
      bgcolor: 'background.paper',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      height: '100%',
      transition: 'border-color 0.2s',
      '&:hover': {
        borderColor: 'success.light',
      },
    }}
  >
    <Avatar
      src={worker.avatar || ''}
      alt={worker.name || 'Ảnh thợ'}
      sx={{ width: 40, height: 40, bgcolor: 'primary.main', flexShrink: 0 }}
    >
      {!worker.avatar && <Person sx={{ fontSize: 22 }} />}
    </Avatar>

    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography variant="body2" fontWeight={700} noWrap sx={{ lineHeight: 1.3, fontSize: 13 }}>
        {getWorkerPrefix(worker)} · {worker.name}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.15 }}>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
          MNV {worker.soBaoDanh || '—'}
        </Typography>
        <Typography variant="caption" color="text.disabled" sx={{ fontSize: 11 }}>
          ·
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
          {worker.team?.name || 'Chưa có tổ'}
        </Typography>
      </Box>
    </Box>

    <Chip
      label="Rảnh"
      color="success"
      size="small"
      sx={{ height: 22, fontSize: 10, fontWeight: 700, flexShrink: 0 }}
    />
  </Paper>
);

const AvailableWorkersPage = () => {
  const isMobile = useIsMobile();
  const pageVisible = usePageVisible();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAvailableWorkers = useCallback(async (silent = false) => {
    if (silent && document.visibilityState === 'hidden') return;
    if (!silent) setLoading(true);
    try {
      const res = await getAvailableWorkers();
      setWorkers(res.data.workers || res.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Lỗi khi lấy danh sách thợ rảnh:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let intervalId;

    const start = async () => {
      await fetchAvailableWorkers();
      if (cancelled || !pageVisible) return;
      intervalId = setInterval(() => fetchAvailableWorkers(true), REFRESH_INTERVAL_MS);
    };

    start();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fetchAvailableWorkers, pageVisible]);

  const filteredWorkers = useMemo(
    () => filterWorkersByKeyword(workers, debouncedSearchTerm),
    [workers, debouncedSearchTerm],
  );

  const groupedWorkers = useMemo(() => {
    const map = new Map();
    filteredWorkers.forEach((worker) => {
      const teamName = worker.team?.name || 'Chưa có tổ';
      if (!map.has(teamName)) map.set(teamName, []);
      map.get(teamName).push(worker);
    });

    return [...map.entries()]
      .map(([teamName, teamWorkers]) => ({
        teamName,
        workers: teamWorkers.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi')),
      }))
      .sort((a, b) => a.teamName.localeCompare(b.teamName, 'vi'));
  }, [filteredWorkers]);

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    return lastUpdated.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <PageLayout>
      <PageHeader
        emoji="🧑‍🔧"
        title="Thợ đang rảnh"
        subtitle={
          isMobile
            ? `${filteredWorkers.length} thợ · ${groupedWorkers.length} tổ${lastUpdated ? ` · ${formatLastUpdated()}` : ''}`
            : `Nhóm theo tổ — tự cập nhật mỗi 30 giây${lastUpdated ? ` (lần cuối: ${formatLastUpdated()})` : ''}`
        }
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: 1.5,
          bgcolor: 'background.paper',
          borderRadius: 2,
          border: 1,
          borderColor: 'divider',
          p: { xs: 1.5, sm: 2 },
          mb: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Chip
            label={`${filteredWorkers.length} thợ rảnh`}
            color="success"
            variant="outlined"
            size="small"
            sx={{ fontWeight: 700 }}
          />
        </Box>

        <TextField
          label={isMobile ? 'Tìm thợ' : 'Tìm kiếm thợ rảnh'}
          placeholder="Tên, MNV, tổ..."
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ flex: 1, minWidth: 0 }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={3}>
          <CircularProgress size={isMobile ? 28 : 32} />
        </Box>
      ) : filteredWorkers.length === 0 ? (
        <Typography align="center" variant="body2" color="text.secondary">
          {searchTerm.trim()
            ? 'Không tìm thấy thợ rảnh phù hợp.'
            : 'Hiện không có thợ nào rảnh.'}
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {groupedWorkers.map((group) => (
            <Paper
              key={group.teamName}
              variant="outlined"
              sx={{
                p: 1.25,
                borderRadius: 2,
                border: '2px solid',
                borderColor: 'grey.200',
                bgcolor: 'grey.50',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  mb: 1,
                  px: 0.25,
                }}
              >
                <Typography variant="subtitle2" fontWeight={800}>
                  {group.teamName}
                </Typography>
                <Chip
                  size="small"
                  label={`${group.workers.length} thợ rảnh`}
                  color="success"
                  variant="outlined"
                />
              </Box>
              <Grid container spacing={1}>
                {group.workers.map((worker) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={worker._id}>
                    <WorkerRow worker={worker} />
                  </Grid>
                ))}
              </Grid>
            </Paper>
          ))}
        </Stack>
      )}
    </PageLayout>
  );
};

export default AvailableWorkersPage;
