import { createTheme } from '@mui/material/styles';
import { ACCENT, NAV, SURFACE } from '../constants/colors';

const theme = createTheme({
  palette: {
    primary: {
      main: ACCENT.main,
      dark: ACCENT.dark,
      light: ACCENT.light,
      contrastText: '#fff',
    },
    error: { main: NAV.main },
    background: { default: SURFACE.page, paper: SURFACE.paper },
    text: { primary: SURFACE.ink, secondary: SURFACE.muted },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Manrope", "Segoe UI", sans-serif',
    h4: { fontFamily: '"Sora", "Segoe UI", sans-serif', fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.3 },
    h5: { fontFamily: '"Sora", "Segoe UI", sans-serif', fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.35 },
    h6: { fontFamily: '"Sora", "Segoe UI", sans-serif', fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
    subtitle2: { fontWeight: 650 },
    button: { fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: SURFACE.page,
          backgroundImage: `
            radial-gradient(ellipse 80% 50% at 10% -10%, rgba(21, 101, 192, 0.1), transparent 55%),
            radial-gradient(ellipse 60% 40% at 100% 0%, rgba(183, 28, 28, 0.05), transparent 50%)
          `,
          backgroundAttachment: 'fixed',
        },
      },
    },
    MuiButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 700, borderRadius: 10 },
        containedPrimary: {
          boxShadow: '0 8px 18px rgba(21, 101, 192, 0.28)',
          '&:hover': { boxShadow: '0 10px 22px rgba(21, 101, 192, 0.34)' },
        },
      },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiTable: { defaultProps: { size: 'small' } },
    MuiChip: { defaultProps: { size: 'small' } },
    MuiPaper: {
      defaultProps: { elevation: 0, variant: 'outlined' },
      styleOverrides: {
        root: { borderColor: SURFACE.line },
      },
    },
    MuiCard: {
      defaultProps: { variant: 'outlined' },
    },
    MuiToolbar: {
      styleOverrides: {
        root: { minHeight: 48, '@media (min-width:0px)': { minHeight: 48 } },
      },
    },
  },
});

export default theme;
