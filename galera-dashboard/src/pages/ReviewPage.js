import React, { useState } from 'react';
import { 
  Container, Paper, Typography, Button, Box, Grid, Alert, Divider,
  CircularProgress, Card, CardContent, Chip
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DeploymentStepper from '../components/layout/DeploymentStepper';
import { useDeployment } from '../context/DeploymentContext';
import { useAuth } from '../context/AuthContext';
import { deployCluster } from '../services/api';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const ReviewPage = () => {
  const navigate = useNavigate();
  const { serviceType } = useParams();
  const { formData, resetFormData } = useDeployment();
  const { isAdmin } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleDeploy = async () => {
    setLoading(true);
    setStatus(null);

    // Validate prechecks was completed
    if (!formData.preflight_id) {
      setStatus({ 
        type: 'error', 
        msg: 'Prechecks not completed. Please run prechecks first.' 
      });
      setLoading(false);
      return;
    }

    // Parse hosts - can be comma-separated or newline-separated
    const hostArray = formData.hosts
      .split(/[,\n]/)
      .map(h => h.trim())
      .filter(h => h);
    
    const customParamsObj = {};
    formData.custom_params.forEach(p => { 
      if (p.key) customParamsObj[p.key] = p.value; 
    });

    const payload = {
      hosts: hostArray,
      async_node_ip: formData.async_node_ip || '',
      db_root_pass: formData.db_root_pass,
      app_user: 'app_user',
      app_pass: formData.app_pass,
      cluster_name: formData.cluster_name,
      buffer_pool: formData.buffer_pool,
      max_connections: parseInt(formData.max_connections),
      custom_params: customParamsObj,
      disk_allocation_pct: formData.disk_allocation_pct,
      data_gb: formData.data_gb || 0,  // User-specified data partition size
      preflight_id: formData.preflight_id ? parseInt(formData.preflight_id) : null,
      template_id: formData.template_id ? parseInt(formData.template_id) : null,
      template_name: formData.template_name || null
    };

    console.log('Deployment payload:', payload);

    try {
      const res = await deployCluster(payload);
      if (res.data.status === 'QUEUED') {
        setStatus({ type: 'success', msg: 'Success! Build Started' });
      } else {
        setStatus({ type: 'success', msg: 'Request Sent! Waiting for Admin Approval.' });
      }
      
      setTimeout(() => {
        resetFormData(); // This clears preflight_id too
        navigate(`/services/${serviceType}/deployments`);
      }, 2000);
    } catch (err) {
      setStatus({ 
        type: 'error', 
        msg: `Error: ${err.response?.data?.error || err.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  // Parse hosts for display
  const hostArray = formData.hosts
    .split(/[,\n]/)
    .map(h => h.trim())
    .filter(h => h);
  const customParamsObj = {};
  formData.custom_params.forEach(p => { 
    if (p.key) customParamsObj[p.key] = p.value; 
  });
  const hasCustomParams = Object.keys(customParamsObj).length > 0;

  return (
    <MainLayout maxWidth="md">
        <DeploymentStepper activeStep={4} />

        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
            Review & Build
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Please review your configuration before building
          </Typography>

          {/* Infrastructure Section */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Infrastructure
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Target Nodes</Typography>
                  <Box sx={{ mt: 1 }}>
                    {hostArray.map((host, index) => (
                      <Chip key={index} label={host} sx={{ mr: 1, mb: 1 }} />
                    ))}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Async Replica Node</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formData.async_node_ip}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Configuration Section */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Cluster Name</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formData.cluster_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Template</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formData.template_name || 'None'}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Buffer Pool Size</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formData.buffer_pool}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary">Max Connections</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formData.max_connections}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Disk Allocation */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Disk Allocation
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Minimum VG Size: <strong>{formData.preflight_min_vg_gb?.toFixed(2) || 'N/A'} GB</strong>
              </Typography>
              <Grid container spacing={2}>
                {formData.template_id ? (
                  // Template-based: Show fixed GB values
                  <>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Logs</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.template_logs_gb || 3} GB
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (From template)
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Tmp</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.template_tmp_gb || 3} GB
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (From template)
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">GCache</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.template_gcache_gb || 3} GB
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (From template)
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Data</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.data_gb && formData.data_gb > 0 ? `${formData.data_gb} GB` : '100%FREE'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (Remaining space)
                      </Typography>
                    </Grid>
                  </>
                ) : (
                  // Percentage-based: Show percentages (legacy mode)
                  <>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Data</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.disk_allocation_pct?.data || 65}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        (Uses 100%FREE)
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Logs</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.disk_allocation_pct?.logs || 20}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ≈ {((formData.preflight_min_vg_gb || 0) * (formData.disk_allocation_pct?.logs || 20) / 100).toFixed(1)} GB
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Tmp</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.disk_allocation_pct?.tmp || 10}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ≈ {((formData.preflight_min_vg_gb || 0) * (formData.disk_allocation_pct?.tmp || 10) / 100).toFixed(1)} GB
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">GCache</Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formData.disk_allocation_pct?.gcache || 5}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ≈ {((formData.preflight_min_vg_gb || 0) * (formData.disk_allocation_pct?.gcache || 5) / 100).toFixed(1)} GB
                      </Typography>
                    </Grid>
                  </>
                )}
              </Grid>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom color="primary">
                Advanced Settings
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Custom Parameters</Typography>
                  {hasCustomParams ? (
                    <Box sx={{ mt: 1 }}>
                      {Object.entries(customParamsObj).map(([key, value]) => (
                        <Chip 
                          key={key} 
                          label={`${key}: ${value}`} 
                          sx={{ mr: 1, mb: 1 }} 
                          size="small"
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body1">None</Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {formData.preflight_has_existing && (
            <Alert severity="error" sx={{ mb: 3 }}>
              <Typography variant="body1" fontWeight="bold">
                ⚠️ Destructive Action Required
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Existing MySQL installation(s) detected during prechecks.
                <strong> All existing data will be automatically destroyed during build.</strong>
              </Typography>
            </Alert>
          )}

          {status && (
            <Alert 
              severity={status.type} 
              icon={status.type === 'success' ? <CheckCircleIcon /> : undefined}
              sx={{ mb: 3 }}
            >
              {status.msg}
            </Alert>
          )}

          <Divider sx={{ my: 3 }} />

          <Alert severity="info" sx={{ mb: 3 }}>
            {isAdmin 
              ? 'As an admin, your build will start immediately upon submission.'
              : 'Your build request will be queued for admin approval before execution.'
            }
          </Alert>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/services/${serviceType}/deploy/advanced`)}
              disabled={loading}
            >
              Back
            </Button>
            <Button
              variant="contained"
              size="large"
              color="success"
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
              onClick={handleDeploy}
              disabled={loading}
            >
              {loading ? 'Building...' : (isAdmin ? 'Build' : 'Request Build')}
            </Button>
          </Box>
        </Paper>
    </MainLayout>
  );
};

export default ReviewPage;
