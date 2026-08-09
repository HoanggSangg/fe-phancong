import { ACCENT, NAV } from './colors';

export { NAV };

export const BRAND = {
  tagline: 'Phân công · theo dõi · giao xe trong ngày.',
  logoUrl: 'https://res.cloudinary.com/drbjrsm0s/image/upload/v1745463450/logo_ulbaie.png',
  heroImage: '/images/garage-hero.png',
};

export const appBarSx = {
  background: `linear-gradient(105deg, ${NAV.dark} 0%, ${NAV.main} 55%, #c62828 100%)`,
  boxShadow: '0 2px 12px rgba(142, 0, 0, 0.28)',
};

export const drawerPaperSx = {
  width: { xs: 'min(86vw, 320px)', sm: 300 },
  height: '100%',
  border: 'none',
  background: 'linear-gradient(180deg, #ffffff 0%, #f7fafc 55%, #eef3f8 100%)',
  boxShadow: '-8px 0 32px rgba(15, 23, 42, 0.12)',
};

export const drawerUserHeaderSx = {
  position: 'relative',
  overflow: 'hidden',
  px: 2,
  py: 2.25,
  background: `linear-gradient(135deg, ${NAV.dark} 0%, ${NAV.main} 55%, #d32f2f 100%)`,
  color: '#fff',
  '&::after': {
    content: '""',
    position: 'absolute',
    right: -24,
    top: -28,
    width: 120,
    height: 120,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
  },
};

export const drawerNavItemSx = (selected) => ({
  mx: 1,
  mb: 0.35,
  py: 0.85,
  pl: 1.5,
  pr: 1.25,
  borderRadius: 2,
  gap: 1,
  color: selected ? NAV.main : '#334155',
  bgcolor: selected ? NAV.soft : 'transparent',
  border: '1px solid',
  borderColor: selected ? 'rgba(183, 28, 28, 0.18)' : 'transparent',
  boxShadow: selected ? '0 4px 12px rgba(183, 28, 28, 0.08)' : 'none',
  transition: 'background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease',
  '&:hover': {
    bgcolor: selected ? NAV.softHover : 'rgba(21, 101, 192, 0.06)',
    transform: 'translateX(-2px)',
  },
  '&.Mui-selected': {
    bgcolor: NAV.soft,
    color: NAV.main,
  },
  '&.Mui-selected:hover': {
    bgcolor: NAV.softHover,
  },
});

export const pageHeaderSx = {
  position: 'relative',
  overflow: 'hidden',
  borderRadius: 2.5,
  px: { xs: 1.5, sm: 2.25 },
  py: { xs: 1.25, sm: 1.75 },
  mb: { xs: 1.5, sm: 2 },
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 1.5,
  flexWrap: 'wrap',
  border: '1px solid',
  borderColor: 'rgba(21, 101, 192, 0.18)',
  background: 'linear-gradient(120deg, rgba(255,255,255,0.96) 0%, rgba(227,242,253,0.9) 55%, rgba(255,255,255,0.94) 100%)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.8) inset, 0 8px 24px rgba(15, 23, 42, 0.06)',
  '&::before': {
    content: '""',
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 4,
    borderRadius: 4,
    background: `linear-gradient(180deg, ${ACCENT.main}, ${NAV.main})`,
  },
};

export const filterPanelSx = {
  p: { xs: 1.5, sm: 2 },
  mb: 2,
  borderRadius: 2.5,
  border: '1px solid',
  borderColor: 'rgba(21, 101, 192, 0.14)',
  background: 'linear-gradient(180deg, #ffffff 0%, #f7fafc 100%)',
  boxShadow: '0 6px 18px rgba(15, 23, 42, 0.04)',
};

export const authFormPaperSx = {
  width: '100%',
  p: { xs: 3.5, sm: 4.75 },
  borderRadius: 3.5,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'linear-gradient(165deg, rgba(15,23,42,0.72) 0%, rgba(8,12,20,0.78) 100%)',
  backdropFilter: 'blur(18px) saturate(1.2)',
  WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
  boxShadow: '0 28px 70px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)',
};

export const authFieldSx = {
  '& .MuiOutlinedInput-root': {
    color: '#f1f5f9',
    borderRadius: 2,
    bgcolor: 'rgba(255,255,255,0.04)',
    fontSize: '1.12rem',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.18)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.35)' },
    '&.Mui-focused fieldset': { borderColor: ACCENT.light, borderWidth: 1.5 },
    '& input': { py: 1.7 },
  },
  '& .MuiInputLabel-root': { color: 'rgba(226,232,240,0.7)', fontSize: '1.05rem' },
  '& .MuiInputLabel-root.Mui-focused': { color: ACCENT.light },
  '& .MuiInputAdornment-root': { color: 'rgba(226,232,240,0.55)' },
  '& input:-webkit-autofill': {
    WebkitBoxShadow: '0 0 0 100px #1e293b inset',
    WebkitTextFillColor: '#f1f5f9',
    caretColor: '#f1f5f9',
  },
};

export const authSubmitSx = {
  py: 1.6,
  mt: 0.25,
  borderRadius: 2,
  fontSize: '1.12rem',
  fontWeight: 800,
  letterSpacing: '0.01em',
  background: `linear-gradient(105deg, ${NAV.dark} 0%, ${NAV.main} 55%, #d32f2f 100%)`,
  boxShadow: '0 10px 28px rgba(183, 28, 28, 0.4)',
  '&:hover': {
    background: `linear-gradient(105deg, ${NAV.main} 0%, #d32f2f 100%)`,
    boxShadow: '0 12px 32px rgba(183, 28, 28, 0.5)',
  },
  '&.Mui-disabled': {
    color: 'rgba(255,255,255,0.55)',
    background: 'rgba(183, 28, 28, 0.35)',
  },
};

export const authLinkSx = {
  color: ACCENT.light,
  fontWeight: 700,
  textDecorationColor: 'rgba(66, 165, 245, 0.4)',
  '&:hover': { color: '#90caf9' },
};

export const authRememberSx = {
  m: 0,
  '& .MuiFormControlLabel-label': {
    color: ACCENT.light,
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  '& .MuiCheckbox-root': {
    color: 'rgba(66, 165, 245, 0.55)',
    '&.Mui-checked': { color: ACCENT.light },
  },
};
