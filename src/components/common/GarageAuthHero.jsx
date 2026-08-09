import React from 'react';
import { Box, keyframes, Typography } from '@mui/material';
import { BRAND } from '../../constants/brand';

const kenBurns = keyframes`
  0% { transform: scale(1.04) translate3d(0, 0, 0); }
  100% { transform: scale(1.12) translate3d(-1.2%, -0.8%, 0); }
`;

const fadeUp = keyframes`
  0% { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
`;

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';
const PC_INSET = '56px';

/** Full-bleed garage hero — brand trái, form phải. */
const GarageAuthHero = ({ children, title }) => (
  <Box
    sx={{
      position: 'relative',
      minHeight: '100vh',
      display: 'grid',
      gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(420px, 580px)' },
      columnGap: { md: 5 },
      overflow: 'hidden',
      bgcolor: '#0b1220',
    }}
  >
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden' }}>
      <Box
        component="img"
        src={BRAND.heroImage}
        alt=""
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '58% center',
          animation: `${kenBurns} 24s ease-in-out infinite alternate`,
          willChange: 'transform',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: {
            xs: 'linear-gradient(180deg, rgba(8,12,20,0.42) 0%, rgba(8,12,20,0.62) 40%, rgba(8,12,20,0.88) 100%)',
            md: 'linear-gradient(90deg, rgba(8,12,20,0.72) 0%, rgba(8,12,20,0.28) 48%, rgba(8,12,20,0.55) 72%, rgba(8,12,20,0.78) 100%)',
          },
        }}
      />
    </Box>

    <Box
      sx={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: { xs: 'center', md: 'flex-start' },
        textAlign: { xs: 'center', md: 'left' },
        justifyContent: { xs: 'flex-end', md: 'center' },
        px: { xs: 2.5, sm: 4, md: 6 },
        pt: { xs: 4.5, md: 0 },
        pb: { xs: 0.5, md: 0 },
        minHeight: { xs: '36vh', md: '100vh' },
        transform: { xs: 'none', md: `translateX(${PC_INSET})` },
        animation: `${fadeUp} 0.65s ${EASE} both`,
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 2.5,
          px: { xs: 1.75, md: 2.25 },
          py: { xs: 1.25, md: 1.5 },
          borderRadius: 2.5,
          bgcolor: 'rgba(255, 255, 255, 0.94)',
          border: '1px solid rgba(255, 255, 255, 0.85)',
          boxShadow: '0 10px 28px rgba(0,0,0,0.28)',
        }}
      >
        <Box
          component="img"
          src={BRAND.logoUrl}
          alt={BRAND.name}
          sx={{ width: { xs: 180, sm: 220, md: 268 }, height: 'auto', display: 'block' }}
        />
      </Box>
      <Typography
        component="h1"
        sx={{
          fontFamily: '"Sora", "Segoe UI", sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: '#e53935',
          fontSize: { xs: '2.6rem', sm: '3.2rem', md: '3.85rem' },
          lineHeight: 1.05,
          textShadow: '0 2px 0 rgba(255,255,255,0.35), 0 10px 32px rgba(0,0,0,0.45)',
          maxWidth: 620,
        }}
      >
        {BRAND.name}
      </Typography>
      <Typography
        sx={{
          mt: 1.35,
          color: 'rgba(255,255,255,0.84)',
          fontFamily: '"Manrope", "Segoe UI", sans-serif',
          fontSize: { xs: '1.1rem', md: '1.28rem' },
          maxWidth: 480,
          lineHeight: 1.5,
        }}
      >
        {title || BRAND.tagline}
      </Typography>
    </Box>

    <Box
      sx={{
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'center',
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 2.25, md: 4 },
        pr: { md: 5 },
        transform: { xs: 'none', md: `translateX(-${PC_INSET})` },
        animation: `${fadeUp} 0.65s 0.06s ${EASE} both`,
      }}
    >
      {children}
    </Box>
  </Box>
);

export default GarageAuthHero;
