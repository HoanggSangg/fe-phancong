import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2', dark: '#115293', light: '#42a5f5', contrastText: '#fff' },
    background: { default: '#f5f5f5', paper: '#ffffff' },
  },
  shape: { borderRadius: 8 },
  typography: {
    h4: { fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.3 },
    h5: { fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.35 },
    h6: { fontSize: '1rem', fontWeight: 600, lineHeight: 1.4 },
    subtitle2: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: '#f5f5f5' },
      },
    },
    MuiButton: {
      defaultProps: { size: 'small' },
      styleOverrides: {
        root: { textTransform: 'none', fontWeight: 600 },
      },
    },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiFormControl: { defaultProps: { size: 'small' } },
    MuiTable: { defaultProps: { size: 'small' } },
    MuiChip: { defaultProps: { size: 'small' } },
    MuiPaper: {
      defaultProps: { elevation: 0, variant: 'outlined' },
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
