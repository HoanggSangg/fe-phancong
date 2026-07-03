// ./components/pages/AvailableWorkersPage.jsx
import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Paper,
  TextField,
  CircularProgress,
  Divider,
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { getAvailableWorkers } from '../apis';

const AvailableWorkersPage = () => {
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

  const removeVietnameseTones = (str = '') => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  };

  const getWorkerPrefix = (worker) => {
    const teamName = removeVietnameseTones(worker.team?.name || '');

    if (
      teamName.includes('lai xe') ||
      teamName.includes('tai xe') ||
      teamName.includes('driver')
    ) {
      return 'Tài xế';
    }

    return 'KTV';
  };

  return (
    <Box
      sx={{
        p: { xs: 1, sm: 3 },
        width: '100%',
        maxWidth: '100%',
        backgroundColor: '#f8fafc',
        minHeight: '100vh',
        borderRadius: 0,
        boxSizing: 'border-box',
        px: { xs: 1, sm: 2 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 3,
          background: '#fff',
          borderRadius: 4,
          boxShadow: '0 4px 24px rgba(37,99,235,0.07)',
          mb: 4,
          py: { xs: 3, sm: 4 },
          px: { xs: 2, sm: 6 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'rgba(59,130,246,0.08)',
            borderRadius: '50%',
            width: 72,
            height: 72,
            mr: { xs: 0, sm: 2 },
            mb: { xs: 2, sm: 0 },
          }}
        >
          <span role="img" aria-label="worker" style={{ fontSize: 44 }}>
            🧑‍🔧
          </span>
        </Box>

        <Box>
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              fontSize: { xs: 24, sm: 32 },
              color: '#1e293b',
              mb: 1,
            }}
          >
            Danh sách thợ đang rảnh
          </Typography>

          <Typography
            sx={{
              color: '#64748b',
              fontSize: 17,
              fontWeight: 400,
              maxWidth: 600,
            }}
          >
            Tra cứu nhanh các thợ hiện đang rảnh để phân công công việc hiệu quả hơn.
          </Typography>
        </Box>
      </Paper>

      <Box mb={3}>
        <Divider />
      </Box>

      <Box display="flex" gap={2} mb={3} justifyContent="center" sx={{ px: { xs: 0, sm: 2 } }}>
        <TextField
          label="Tìm kiếm thợ rảnh theo tên"
          variant="outlined"
          size="small"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{
            maxWidth: { xs: '100%', sm: 450 },
            background: '#fff',
            borderRadius: 2,
          }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : filteredWorkers.length === 0 ? (
        <Typography align="center">🚫 Hiện không có thợ nào rảnh.</Typography>
      ) : (
        <Grid
          container
          spacing={3}
          sx={{ mt: 1, width: '100%', mx: 0 }}
          justifyContent="center"
        >
          {filteredWorkers.map((worker) => (
            <Grid
              item
              xs={12}
              sm={6}
              md={4}
              key={worker._id}
              sx={{
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <Card
                elevation={4}
                sx={{
                  width: { xs: '92vw', sm: 260 },
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
                    {getWorkerPrefix(worker)} {worker.name}
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
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default AvailableWorkersPage;