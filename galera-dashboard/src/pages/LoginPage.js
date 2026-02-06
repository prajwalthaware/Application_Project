import React from 'react';
import { Container, Paper, Typography, Button, Box } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={6}
          sx={{
            p: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" gutterBottom fontWeight="bold" color="primary">
            Database Cluster Manager
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            Internal Infrastructure Tools
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            startIcon={<GoogleIcon />}
            onClick={login}
            sx={{
              mt: 2,
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              textTransform: 'none',
            }}
          >
            Sign in with Google
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3 }}>
            Secure OAuth 2.0 Authentication
          </Typography>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;
