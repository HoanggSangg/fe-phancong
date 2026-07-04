import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  TextField,
  CircularProgress,
  Stack,
  Paper,
  Chip,
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { getAvailableWorkers } from '../apis';
import PageLayout from '../common/PageLayout';
import PageHeader from '../common/PageHeader';
import useIsMobile from '../../hooks/useIsMobile';

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

const WorkerMobileRow = ({ worker }) => (
  <Paper
    sx={{
      px: 1,
      py: 0.75,
      display: 'flex',
      alignItems: 'center',
      gap: 1,
    }}
  >
    <Avatar
      src={worker.avatar || ''}
      alt={worker.name || 'Ảnh thợ'}
      sx={{ width: 36, height: 36, bgcolor: 'primary.main', flexShrink: 0 }}
    >
      {!worker.avatar && <Person sx={{ fontSize: 20 }} />}
    </Avatar>

    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="caption"
        fontWeight={700}
        noWrap
        sx={{ display: 'block', lineHeight: 1.3, fontSize: 12 }}
      >
        {getWorkerPrefix(worker)} · {worker.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" noWrap sx={{ fontSize: 11 }}>
        MNV {worker.soBaoDanh || '—'}
      </Typography>
    </Box>

    <Chip
      label="Rảnh"
      color="success"
      size="small"
      sx={{ height: 20, fontSize: 10, fontWeight: 700, flexShrink: 0 }}
    />
  </Paper>
);

const WorkerDesktopCard = ({ worker }) => (
  <Card
    sx={{
      width: '100%',
      minHeight: 280,
      borderRadius: 5,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: 3,
      transition: 'all .25s ease',
      '&:hover': {
        transform: 'translateY(-6px)',
        boxShadow: '0 12px 30px rgba(37,99,235,0.15)',
      },
    }}
  >
    <CardContent
      sx={{
        p: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <Avatar
        src={worker.avatar || ''}
        alt={worker.name || 'Ảnh thợ'}
        sx={{
          bgcolor: '#3b82f6',
          width: 110,
          height: 110,
          mb: 2,
          border: '4px solid #dbeafe',
          boxShadow: '0 8px 20px rgba(59,130,246,0.25)',
        }}
      >
        {!worker.avatar && <Person sx={{ fontSize: 50 }} />}
      </Avatar>

      <Typography
        sx={{
          fontSize: 22,
          fontWeight: 800,
          color: '#0f172a',
          textAlign: 'center',
          mb: 1,
        }}
      >
        {getWorkerPrefix(worker) === 'TX' ? 'Tài xế' : 'KTV'} {worker.name}
      </Typography>

      <Typography
        sx={{
          fontSize: 17,
          fontWeight: 700,
          color: '#2563eb',
          textAlign: 'center',
          mb: 1,
        }}
      >
        MNV: {worker.soBaoDanh || '---'}
      </Typography>

      <Box
        sx={{
          mt: 1,
          px: 2,
          py: 0.7,
          borderRadius: 999,
          bgcolor: '#dcfce7',
          color: '#15803d',
          fontWeight: 800,
          fontSize: 14,
        }}
      >
        ĐANG RẢNH
      </Box>
    </CardContent>
  </Card>
);

const AvailableWorkersPage = () => {
  const isMobile = useIsMobile();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchAvailableWorkers = async () => {
      try {
        const res = await getAvailableWorkers();
        setWorkers(res.data.workers || res.data || []);
      } catch (err) {
        console.error('Lỗi khi lấy danh sách thợ rảnh:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailableWorkers();
  }, []);

  const filteredWorkers = workers.filter((worker) =>
    worker.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <PageLayout>
      <PageHeader
        emoji="🧑‍🔧"
        title="Thợ đang rảnh"
        subtitle={
          isMobile
            ? `${filteredWorkers.length} thợ`
            : 'Tra cứu nhanh các thợ hiện đang rảnh để phân công công việc hiệu quả hơn.'
        }
      />

      <Box display="flex" mb={{ xs: 1.5, sm: 3 }} justifyContent="center">
        <TextField
          label={isMobile ? 'Tìm thợ' : 'Tìm kiếm thợ rảnh theo tên'}
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            maxWidth: { xs: '100%', sm: 450 },
            bgcolor: 'background.paper',
          }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress size={isMobile ? 28 : 40} />
        </Box>
      ) : filteredWorkers.length === 0 ? (
        <Typography align="center" variant="body2" color="text.secondary">
          Hiện không có thợ nào rảnh.
        </Typography>
      ) : isMobile ? (
        <Stack spacing={0.75}>
          {filteredWorkers.map((worker) => (
            <WorkerMobileRow key={worker._id} worker={worker} />
          ))}
        </Stack>
      ) : (
        <Grid container spacing={3} sx={{ mt: 1, width: '100%', mx: 0 }} justifyContent="center">
          {filteredWorkers.map((worker) => (
            <Grid
              size={{ sm: 6, md: 4 }}
              key={worker._id}
              sx={{ display: 'flex', justifyContent: 'center' }}
            >
              <Box sx={{ width: 260 }}>
                <WorkerDesktopCard worker={worker} />
              </Box>
            </Grid>
          ))}
        </Grid>
      )}
    </PageLayout>
  );
};

export default AvailableWorkersPage;
