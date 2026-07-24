import React, { useEffect, useState } from 'react';
import { Box, Paper, Stack, Typography, Avatar, CircularProgress } from '@mui/material';
import { Person } from '@mui/icons-material';
import { getWorkerWeeklyRevenueSummary } from '../apis/index';
import { formatMoney, getYesterdayDate } from '../../utils/dateFilters';
import { PageContent } from '../common/AnimatedValue';

const VARIANTS = {
  praise: {
    workerKey: 'bestWorker',
    title: '🏆 TUYÊN DƯƠNG THỢ ĐÃ ĐẠT KPI TRONG TUẦN',
    border: '#f59e0b',
    background: 'linear-gradient(135deg,#fff7ed,#fef3c7)',
    boxShadow: '0 16px 40px rgba(146, 64, 14, 0.16)',
    titleColor: '#92400e',
    loadingColor: '#92400e',
    avatarBorder: '#f59e0b',
    avatarColor: '#d97706',
    avatarShadow: '0 10px 25px rgba(146,64,14,0.25)',
    badge: '🏆 KPI TỐT',
    badgeBg: '#f59e0b',
    badgeShadow: '0 6px 16px rgba(245,158,11,0.35)',
    revenueColor: '#d97706',
    infoBorder: '#fcd34d',
    messageBg: '#fff',
    messageBorder: '#fcd34d',
    messageColor: '#78350f',
    message:
      'Chúc mừng bạn đã đạt KPI trong tuần. Cảm ơn sự nỗ lực, tinh thần trách nhiệm và đóng góp tích cực của bạn cho tập thể.',
    errorLabel: 'tuyên dương',
  },
  warning: {
    workerKey: 'worstWorker',
    title: '⚠️ THỢ CHƯA ĐẠT ĐƯỢC KPI TRONG TUẦN',
    border: '#dc2626',
    background: 'linear-gradient(135deg,#fff1f2,#fee2e2)',
    boxShadow: '0 16px 40px rgba(153, 27, 27, 0.16)',
    titleColor: '#991b1b',
    loadingColor: '#991b1b',
    avatarBorder: '#dc2626',
    avatarColor: '#dc2626',
    avatarShadow: '0 10px 25px rgba(153,27,27,0.25)',
    badge: '⚠ KPI THẤP',
    badgeBg: '#dc2626',
    badgeShadow: '0 6px 16px rgba(220,38,38,0.3)',
    revenueColor: '#dc2626',
    infoBorder: '#fecaca',
    messageBg: '#fff7ed',
    messageBorder: '#fed7aa',
    messageColor: '#7f1d1d',
    message:
      'Bạn cần cố gắng hơn trong tuần tới để cải thiện KPI cá nhân, nâng cao hiệu quả công việc và đạt mục tiêu chung của đội ngũ.',
    errorLabel: 'cảnh cáo',
  },
};

const WeeklySummaryForm = ({ variant = 'praise' }) => {
  const config = VARIANTS[variant] || VARIANTS.praise;
  const [worker, setWorker] = useState(null);
  const [week, setWeek] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const config = VARIANTS[variant] || VARIANTS.praise;
      try {
        setLoading(true);
        const res = await getWorkerWeeklyRevenueSummary(getYesterdayDate());
        setWorker(res.data[config.workerKey]);
        setWeek(res.data.week);
      } catch (error) {
        console.error(`Lỗi lấy dữ liệu ${config.errorLabel}:`, error);
        alert(error.response?.data?.message || `Lỗi lấy dữ liệu ${config.errorLabel}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [variant]);

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: '100vh',
        bgcolor: '#f1f5f9',
        px: { xs: 1.5, sm: 3, md: 5 },
        py: { xs: 2, sm: 3, md: 5 },
      }}
    >
      <PageContent animationKey={variant}>
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 1200,
          mx: 'auto',
          minHeight: { xs: 'auto', md: '75vh' },
          p: { xs: 2, sm: 3, md: 5 },
          borderRadius: { xs: 3, md: 5 },
          border: `3px solid ${config.border}`,
          background: config.background,
          boxShadow: config.boxShadow,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
          '&:hover': { transform: 'translateY(-2px)' },
        }}
      >
        <Typography
          sx={{
            fontWeight: 900,
            fontSize: { xs: 24, sm: 34, md: 42 },
            color: config.titleColor,
            mb: { xs: 2, sm: 3, md: 4 },
            textAlign: 'center',
            letterSpacing: 0.5,
          }}
        >
          {config.title}
        </Typography>

        {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress sx={{ color: config.loadingColor, mb: 2 }} />
              <Typography
                sx={{
                  fontSize: { xs: 18, sm: 22 },
                  fontWeight: 700,
                  color: config.loadingColor,
                }}
              >
                Đang tải dữ liệu...
              </Typography>
            </Box>
        ) : (
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 3, md: 5 }}
            alignItems="center"
          >
            <Box
              sx={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                width: { xs: '100%', md: 420 },
              }}
            >
              <Avatar
                src={worker?.avatar || ''}
                alt={worker?.name || 'Ảnh thợ'}
                sx={{
                  width: { xs: 220, sm: 300, md: 340 },
                  height: { xs: 220, sm: 300, md: 340 },
                  border: `8px solid ${config.avatarBorder}`,
                  bgcolor: '#fff',
                  boxShadow: config.avatarShadow,
                  fontSize: { xs: 80, sm: 100, md: 120 },
                  color: config.avatarColor,
                }}
              >
                {!worker?.avatar && <Person sx={{ fontSize: 120 }} />}
              </Avatar>

              <Box
                sx={{
                  position: 'absolute',
                  top: { xs: 0, sm: 5 },
                  right: { xs: 40, sm: 40, md: 20 },
                  bgcolor: config.badgeBg,
                  color: '#fff',
                  px: 2,
                  py: 1,
                  borderRadius: 3,
                  fontWeight: 900,
                  fontSize: { xs: 14, sm: 17 },
                  boxShadow: config.badgeShadow,
                }}
              >
                {config.badge}
              </Box>
            </Box>

            <Box sx={{ flex: 1, width: '100%' }}>
              <Typography
                sx={{
                  fontSize: { xs: 30, sm: 42, md: 52 },
                  fontWeight: 900,
                  color: '#111827',
                  lineHeight: 1.1,
                  textAlign: { xs: 'center', md: 'left' },
                }}
              >
                {worker?.name || 'Chưa có dữ liệu'}
              </Typography>

              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  bgcolor: '#fff',
                  border: `1px solid ${config.infoBorder}`,
                }}
              >
                <Typography sx={{ fontSize: { xs: 18, sm: 22 }, mb: 1.5 }}>
                  Mã nhân viên: <b>{worker?.soBaoDanh || '---'}</b>
                </Typography>
                <Typography sx={{ fontSize: { xs: 18, sm: 22 }, mb: 1.5 }}>
                  KPI TUẦN:{' '}
                  <b style={{ color: config.revenueColor }}>
                    {formatMoney(worker?.weeklyRevenue || 0)}
                  </b>
                </Typography>
                <Typography sx={{ fontSize: { xs: 18, sm: 22 } }}>
                  Thời gian: <b>{week?.from || '---'}</b> đến <b>{week?.to || '---'}</b>
                </Typography>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  mt: 3,
                  p: { xs: 2, sm: 3 },
                  borderRadius: 3,
                  bgcolor: config.messageBg,
                  border: `1px solid ${config.messageBorder}`,
                }}
              >
                <Typography
                  sx={{
                    fontSize: { xs: 17, sm: 20, md: 22 },
                    fontStyle: 'italic',
                    lineHeight: 1.8,
                    color: config.messageColor,
                    fontWeight: 600,
                  }}
                >
                  {config.message}
                </Typography>
              </Paper>
            </Box>
          </Stack>
        )}
      </Paper>
      </PageContent>
    </Box>
  );
};

export default WeeklySummaryForm;
