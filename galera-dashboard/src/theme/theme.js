import { createTheme } from '@mui/material/styles';

// Centralized color palette
const colors = {
  primary: {
    main: '#5F259F',      // PhonePe Purple
    light: '#8B4FC7',     // Lighter purple
    dark: '#3D1766',      // Darker purple
    contrastText: '#fff',
  },
  secondary: {
    main: '#9C27B0',
    light: '#BA68C8',
    dark: '#7B1FA2',
  },
  success: {
    main: '#2e7d32',
    light: '#4caf50',
    dark: '#1b5e20',
  },
  error: {
    main: '#d32f2f',
    light: '#ef5350',
    dark: '#c62828',
  },
  warning: {
    main: '#ed6c02',
    light: '#ff9800',
    dark: '#e65100',
  },
  info: {
    main: '#0288d1',
    light: '#03a9f4',
    dark: '#01579b',
  },
  background: {
    default: '#f5f7fa',  // Standardized background
    paper: '#ffffff',
  },
  text: {
    primary: '#1a1a1a',
    secondary: '#666666',
  },
};

// Status colors for deployments
export const statusColors = {
  PENDING_APPROVAL: {
    bg: '#fff3e0',
    text: '#e65100',
    border: '#ff9800',
  },
  QUEUED: {
    bg: '#f3e5f5',
    text: '#6A1B9A',
    border: '#9C27B0',
  },
  RUNNING: {
    bg: '#ede7f6',
    text: '#5F259F',
    border: '#7B1FA2',
  },
  SUCCESS: {
    bg: '#e8f5e9',
    text: '#2e7d32',
    border: '#4caf50',
  },
  FAILURE: {
    bg: '#ffebee',
    text: '#c62828',
    border: '#ef5350',
  },
  REJECTED: {
    bg: '#fce4ec',
    text: '#c2185b',
    border: '#e91e63',
  },
  CANCELLED: {
    bg: '#f5f5f5',
    text: '#757575',
    border: '#9e9e9e',
  },
  ABORTED: {
    bg: '#fff3e0',
    text: '#f57c00',
    border: '#ff9800',
  },
  NOT_BUILT: {
    bg: '#fafafa',
    text: '#9e9e9e',
    border: '#bdbdbd',
  },
};

// Create the theme
const theme = createTheme({
  palette: colors,
  
  // Consistent spacing (8px base unit)
  spacing: 8,
  
  // Consistent border radius
  shape: {
    borderRadius: 8,
  },
  
  // Typography
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  
  // Component overrides
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
          padding: '8px 16px',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 2,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          '&:focus-visible': {
            outline: '2px solid #5F259F',
            outlineOffset: '2px',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
  },
  
  // Transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
    },
  },
});

export default theme;
