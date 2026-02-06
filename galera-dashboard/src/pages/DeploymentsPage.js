import React, { useState, useEffect } from 'react';
import { 
  Container, Paper, Typography, Box, Chip, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, IconButton, Tooltip, Grid, ToggleButtonGroup,
  ToggleButton, Alert, Divider, Fade
} from '@mui/material';
import MainLayout from '../components/layout/MainLayout';
import DeploymentCard from '../components/DeploymentCard';
import { useAuth } from '../context/AuthContext';
import { getHistory, approveDeployment, rejectDeployment, cancelDeployment } from '../services/api';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import ViewListIcon from '@mui/icons-material/ViewList';
import FilterListIcon from '@mui/icons-material/FilterList';
import { useParams, useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const DeploymentsPage = () => {
  const { isAdmin, user } = useAuth();
  const { serviceType } = useParams();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [reviewItem, setReviewItem] = useState(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await getHistory();
      setHistory(res.data);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenReview = (item) => {
    setReviewItem(item);
    setReviewDialogOpen(true);
  };

  const handleCloseReview = () => {
    setReviewItem(null);
    setReviewDialogOpen(false);
  };

  const handleApprove = async () => {
    if (!reviewItem) return;
    try {
      await approveDeployment(reviewItem.id);
      loadHistory();
      handleCloseReview();
    } catch (err) {
      alert('Failed to approve build');
    }
  };

  const handleReject = async () => {
    if (!reviewItem) return;
    try {
      await rejectDeployment(reviewItem.id);
      loadHistory();
      handleCloseReview();
    } catch (err) {
      alert('Failed to reject build');
    }
  };

  const handleCancel = async (deploymentId) => {
    if (!window.confirm('Are you sure you want to cancel this build? This will stop the Jenkins build.')) {
      return;
    }
    try {
      console.log('Cancelling deployment:', deploymentId);
      const response = await cancelDeployment(deploymentId);
      console.log('Cancel response:', response);
      alert('Build cancelled successfully!');
      loadHistory();
    } catch (err) {
      console.error('Cancel error:', err);
      console.error('Error response:', err.response);
      const errorMsg = err.response?.data?.error || err.message || 'Failed to cancel build';
      alert(errorMsg);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'PENDING_APPROVAL': 'warning',
      'QUEUED': 'info',
      'RUNNING': 'info',
      'SUCCESS': 'success',
      'FAILURE': 'error',
      'REJECTED': 'error',
      'CANCELLED': 'default',
    };
    return colors[status] || 'default';
  };

  const formatConfig = (jsonString) => {
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch (e) {
      return 'Error parsing config';
    }
  };

  // Filter deployments by status
  const filteredHistory = statusFilter === 'all' 
    ? history 
    : history.filter(item => {
        if (statusFilter === 'active') return ['PENDING_APPROVAL', 'QUEUED', 'RUNNING'].includes(item.status);
        if (statusFilter === 'completed') return item.status === 'SUCCESS';
        if (statusFilter === 'failed') return ['FAILURE', 'REJECTED', 'CANCELLED', 'ABORTED', 'NOT_BUILT'].includes(item.status);
        return true;
      });

  const statusCounts = {
    all: history.length,
    active: history.filter(h => ['PENDING_APPROVAL', 'QUEUED', 'RUNNING'].includes(h.status)).length,
    completed: history.filter(h => h.status === 'SUCCESS').length,
    failed: history.filter(h => ['FAILURE', 'REJECTED', 'CANCELLED', 'ABORTED', 'NOT_BUILT'].includes(h.status)).length,
  };

  return (
    <MainLayout maxWidth="xl">
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton
                onClick={() => navigate(serviceType ? `/services/${serviceType}/dashboard` : '/services')}
                sx={{ bgcolor: 'white', '&:hover': { bgcolor: 'grey.100' } }}
              >
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h4" fontWeight="bold" color="primary">
                  Build History
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Monitor and manage all your cluster builds
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                size="small"
              >
                <ToggleButton value="grid">
                  <Tooltip title="Grid View">
                    <ViewModuleIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
                <ToggleButton value="list">
                  <Tooltip title="List View">
                    <ViewListIcon fontSize="small" />
                  </Tooltip>
                </ToggleButton>
              </ToggleButtonGroup>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={loadHistory}
                disabled={loading}
              >
                Refresh
              </Button>
            </Box>
          </Box>

          {/* Filter Chips */}
          <Paper sx={{ p: 2, bgcolor: 'white' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <FilterListIcon fontSize="small" color="action" />
                <Typography variant="body2" fontWeight="medium">
                  Filter:
                </Typography>
              </Box>
              <Chip
                label={`All (${statusCounts.all})`}
                onClick={() => setStatusFilter('all')}
                color={statusFilter === 'all' ? 'primary' : 'default'}
                variant={statusFilter === 'all' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`Active (${statusCounts.active})`}
                onClick={() => setStatusFilter('active')}
                color={statusFilter === 'active' ? 'info' : 'default'}
                variant={statusFilter === 'active' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`Completed (${statusCounts.completed})`}
                onClick={() => setStatusFilter('completed')}
                color={statusFilter === 'completed' ? 'success' : 'default'}
                variant={statusFilter === 'completed' ? 'filled' : 'outlined'}
              />
              <Chip
                label={`Failed (${statusCounts.failed})`}
                onClick={() => setStatusFilter('failed')}
                color={statusFilter === 'failed' ? 'error' : 'default'}
                variant={statusFilter === 'failed' ? 'filled' : 'outlined'}
              />
            </Box>
          </Paper>
        </Box>

        {/* Content */}
        {filteredHistory.length === 0 ? (
          <Paper sx={{ p: 8, textAlign: 'center', bgcolor: 'white' }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No builds found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {statusFilter !== 'all' 
                ? 'Try changing the filter to see more builds.'
                : 'Start a new build to see it here.'}
            </Typography>
          </Paper>
        ) : viewMode === 'grid' ? (
          <Fade in timeout={500}>
            <Grid container spacing={3} alignItems="flex-start">
              {filteredHistory.map((deployment) => (
                <Grid item xs={12} sm={6} lg={4} key={deployment.id}>
                  <DeploymentCard
                    deployment={deployment}
                    onViewDetails={handleOpenReview}
                    onCancel={handleCancel}
                    isAdmin={isAdmin}
                  />
                </Grid>
              ))}
            </Grid>
          </Fade>
        ) : (
          <Fade in timeout={500}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredHistory.map((deployment) => (
                <DeploymentCard
                  key={deployment.id}
                  deployment={deployment}
                  onViewDetails={handleOpenReview}
                  onCancel={handleCancel}
                  isAdmin={isAdmin}
                />
              ))}
            </Box>
          </Fade>
        )}

      {/* Review Dialog */}
      <Dialog 
        open={reviewDialogOpen} 
        onClose={handleCloseReview}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" fontWeight="bold">
              Build Request #{reviewItem?.id}
            </Typography>
            {reviewItem && (
              <Chip 
                label={reviewItem.status} 
                color={getStatusColor(reviewItem.status)}
                size="small"
              />
            )}
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {reviewItem && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Requester
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {reviewItem.requester_email}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Cluster Name
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {reviewItem.cluster_name}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Template
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {reviewItem.template_name || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    Submitted
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(reviewItem.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
              </Grid>

              {reviewItem.status === 'PENDING_APPROVAL' && user && reviewItem.requester_email !== user.email && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Peer Review:</strong> This build is awaiting approval. You can approve or reject it.
                  </Typography>
                </Alert>
              )}
              
              {reviewItem.status === 'PENDING_APPROVAL' && user && reviewItem.requester_email === user.email && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  <Typography variant="body2">
                    <strong>Awaiting Approval:</strong> Your build request is pending review by a peer.
                  </Typography>
                </Alert>
              )}

              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Build Configuration
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: 400, overflow: 'auto' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                  {formatConfig(reviewItem.deployment_config)}
                </pre>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleCloseReview}>Close</Button>
          {reviewItem?.status === 'PENDING_APPROVAL' && user && reviewItem.requester_email !== user.email && (
            <>
              <Button 
                onClick={handleReject} 
                color="error"
                variant="outlined"
                startIcon={<CancelIcon />}
              >
                Reject
              </Button>
              <Button 
                onClick={handleApprove} 
                color="success"
                variant="contained"
                startIcon={<CheckCircleIcon />}
              >
                Approve & Build
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default DeploymentsPage;
