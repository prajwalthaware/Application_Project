import React from 'react';
import { 
  Container, Paper, Typography, TextField, Button, Box, Grid,
  InputAdornment, IconButton
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import MainLayout from '../components/layout/MainLayout';
import DeploymentStepper from '../components/layout/DeploymentStepper';
import { useDeployment } from '../context/DeploymentContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

const ConfigurationPage = () => {
  const navigate = useNavigate();
  const { serviceType } = useParams();
  const { formData, updateFormData, hasTemplate } = useDeployment();
  const [showDbPass, setShowDbPass] = React.useState(false);
  const [showAppPass, setShowAppPass] = React.useState(false);
  
  // Parse buffer_pool from format like '1G' or '512M' to GB number
  const parseBufferPool = (bp) => {
    if (!bp) return 1;
    if (typeof bp === 'number') return bp;
    const match = String(bp).match(/^(\d+)([MG])$/);
    if (match) {
      const val = parseInt(match[1]);
      return match[2] === 'M' ? Math.round(val / 1024) : val;
    }
    return parseInt(bp) || 1;
  };

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      cluster_name: formData.cluster_name,
      db_root_pass: formData.db_root_pass,
      app_pass: formData.app_pass,
      buffer_pool: parseBufferPool(formData.buffer_pool),
      max_connections: formData.max_connections,
    },
  });

  const onSubmit = (data) => {
    // Convert buffer_pool from GB number to 'XG' format for backend
    const bufferPoolFormatted = `${Math.round(parseFloat(data.buffer_pool) || 1)}G`;
    updateFormData({
      ...data,
      buffer_pool: bufferPoolFormatted
    });
    navigate(`/services/${serviceType}/deploy/advanced`);
  };

  React.useEffect(() => {
    console.log('ConfigurationPage mounted');
    console.log('formData:', formData);
    console.log('hasTemplate():', hasTemplate());
    
    if (!hasTemplate()) {
      console.log('No template found, redirecting to dashboard');
      navigate(`/services/${serviceType}/dashboard`);
    }
  }, [hasTemplate, navigate, serviceType]);

  if (!hasTemplate()) {
    return null;
  }

  return (
    <MainLayout maxWidth="md">
        <DeploymentStepper activeStep={2} />

        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
            Database Configuration
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Set up your cluster name, passwords, and performance settings
          </Typography>

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Cluster Name"
              {...register('cluster_name', { 
                required: 'Cluster name is required',
                pattern: {
                  value: /^[a-zA-Z0-9_]+$/,
                  message: 'Only alphanumeric characters and underscores allowed'
                }
              })}
              error={!!errors.cluster_name}
              helperText={errors.cluster_name?.message || 'Example: prod_cluster_01'}
              sx={{ mb: 3 }}
              placeholder="prod_cluster_01"
            />

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="DB Root Password"
                  type={showDbPass ? 'text' : 'password'}
                  {...register('db_root_pass', { 
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                  error={!!errors.db_root_pass}
                  helperText={errors.db_root_pass?.message || 'Minimum 8 characters'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowDbPass(!showDbPass)}
                          edge="end"
                        >
                          {showDbPass ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="App User Password"
                  type={showAppPass ? 'text' : 'password'}
                  {...register('app_pass', { 
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'Password must be at least 8 characters'
                    }
                  })}
                  error={!!errors.app_pass}
                  helperText={errors.app_pass?.message || 'Minimum 8 characters'}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowAppPass(!showAppPass)}
                          edge="end"
                        >
                          {showAppPass ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3, mb: 2 }}>
              Performance Settings
            </Typography>

            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Buffer Pool Size (GB)"
                  {...register('buffer_pool', {
                    required: 'Buffer pool size is required',
                    min: { value: 1, message: 'Minimum 1 GB' },
                    max: { value: 128, message: 'Maximum 128 GB' }
                  })}
                  error={!!errors.buffer_pool}
                  helperText={errors.buffer_pool?.message || 'InnoDB buffer pool size in GB'}
                  inputProps={{ min: 1, max: 128, step: 1 }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">GB</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Max Connections"
                  {...register('max_connections', {
                    min: { value: 10, message: 'Minimum 10 connections' },
                    max: { value: 5000, message: 'Maximum 5000 connections' }
                  })}
                  error={!!errors.max_connections}
                  helperText={errors.max_connections?.message}
                  inputProps={{ min: 10, max: 5000 }}
                />
              </Grid>
            </Grid>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 4 }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate(`/services/${serviceType}/deploy/infrastructure`)}
              >
                Back
              </Button>
              <Button
                type="submit"
                variant="contained"
                endIcon={<ArrowForwardIcon />}
              >
                Next: Advanced Settings
              </Button>
            </Box>
          </form>
        </Paper>
    </MainLayout>
  );
};

export default ConfigurationPage;
