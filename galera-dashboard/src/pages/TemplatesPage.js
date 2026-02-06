import React, { useState, useEffect } from 'react';
import { 
  Container, Paper, Typography, Box, Button, Dialog, DialogTitle, 
  DialogContent, DialogActions, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, Grid, IconButton, Chip, MenuItem,
  FormControlLabel, Checkbox, Alert, Tabs, Tab, Snackbar
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../context/AuthContext';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, approveTemplate, rejectTemplate } from '../services/api';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const TemplatesPage = () => {
  const { serviceType } = useParams();
  const navigate = useNavigate();
  const { isAdmin, user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [activeTab, setActiveTab] = useState(0); // 0 = Active, 1 = Pending
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [viewTemplate, setViewTemplate] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    buffer_pool: 1,
    max_connections: 100,
    custom_params: [{ key: '', value: '' }],
    logs_gb: 3,
    tmp_gb: 3,
    gcache_gb: 3,
  });

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await getTemplates();
      setTemplates(res.data);
    } catch (err) {
      console.error('Failed to load templates', err);
    }
  };

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      description: '',
      buffer_pool: 1,
      max_connections: 100,
      custom_params: [{ key: '', value: '' }],
      logs_gb: 3,
      tmp_gb: 3,
      gcache_gb: 3,
    });
    setEditMode(false);
    setCurrentTemplate(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (template) => {
    const parsedParams = parseCustomParams(template.custom_params);
    // Parse buffer_pool from format like '1G' or '512M' to GB number
    const parseBufferPool = (bp) => {
      if (!bp) return 1;
      const match = bp.match(/^(\d+)([MG])$/);
      if (match) {
        const val = parseInt(match[1]);
        return match[2] === 'M' ? val / 1024 : val;
      }
      return 1;
    };
    setFormData({
      name: template.name,
      description: template.description || '',
      buffer_pool: parseBufferPool(template.buffer_pool),
      max_connections: template.max_connections || 100,
      custom_params: parsedParams,
      logs_gb: template.logs_gb || 3,
      tmp_gb: template.tmp_gb || 3,
      gcache_gb: template.gcache_gb || 3,
    });
    setEditMode(true);
    setCurrentTemplate(template);
    setDialogOpen(true);
  };

  const handleOpenView = (template) => {
    setViewTemplate(template);
    setViewDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setCurrentTemplate(null);
  };

  const handleCloseViewDialog = () => {
    setViewDialogOpen(false);
    setViewTemplate(null);
  };

  const parseCustomParams = (customParamsJson) => {
    try {
      const params = JSON.parse(customParamsJson || '{}');
      const entries = Object.entries(params);
      return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }];
    } catch (e) {
      return [{ key: '', value: '' }];
    }
  };

  const handleParamChange = (index, field, value) => {
    const newParams = [...formData.custom_params];
    newParams[index][field] = value;
    setFormData({ ...formData, custom_params: newParams });
  };

  const addParamRow = () => {
    setFormData({ 
      ...formData, 
      custom_params: [...formData.custom_params, { key: '', value: '' }] 
    });
  };

  const removeParamRow = (index) => {
    const newParams = formData.custom_params.filter((_, i) => i !== index);
    setFormData({ 
      ...formData, 
      custom_params: newParams.length > 0 ? newParams : [{ key: '', value: '' }] 
    });
  };

  const handleSave = async () => {
    const customParamsObj = {};
    formData.custom_params.forEach(p => { 
      if (p.key) customParamsObj[p.key] = p.value; 
    });

    // Convert buffer_pool from GB number to 'XG' format
    const bufferPoolValue = parseFloat(formData.buffer_pool) || 1;
    const bufferPoolFormatted = `${Math.round(bufferPoolValue)}G`;

    const payload = {
      name: formData.name,
      description: formData.description,
      buffer_pool: bufferPoolFormatted,
      max_connections: parseInt(formData.max_connections),
      custom_params: customParamsObj,
      logs_gb: parseFloat(formData.logs_gb) || 3,
      tmp_gb: parseFloat(formData.tmp_gb) || 3,
      gcache_gb: parseFloat(formData.gcache_gb) || 3,
    };

    try {
      if (editMode) {
        const response = await updateTemplate(currentTemplate.id, payload);
        const message = response.data?.message || 'Template updated successfully';
        setSnackbar({ open: true, message, severity: 'success' });
        // If regular user edited, switch to pending tab
        if (!isAdmin) setActiveTab(1);
      } else {
        const response = await createTemplate(payload);
        const message = response.data?.message || 'Template created successfully';
        setSnackbar({ open: true, message, severity: 'success' });
        // If regular user created, switch to pending tab to see it
        if (!isAdmin) setActiveTab(1);
      }
      loadTemplates();
      handleCloseDialog();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to save template', severity: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this template?')) return;
    try {
      await deleteTemplate(id);
      setSnackbar({ open: true, message: 'Template deleted successfully', severity: 'success' });
      loadTemplates();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to delete template', severity: 'error' });
    }
  };

  const handleDuplicate = async (id) => {
    try {
      await duplicateTemplate(id);
      setSnackbar({ open: true, message: 'Template duplicated successfully', severity: 'success' });
      // Switch to pending tab if regular user (duplicate needs approval)
      if (!isAdmin) setActiveTab(1);
      loadTemplates();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to duplicate template', severity: 'error' });
    }
  };

  const handleApprove = async (id) => {
    try {
      const response = await approveTemplate(id);
      setSnackbar({ open: true, message: response.data?.message || 'Template approved', severity: 'success' });
      loadTemplates();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to approve template', severity: 'error' });
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this template?')) return;
    try {
      const response = await rejectTemplate(id);
      setSnackbar({ open: true, message: response.data?.message || 'Template rejected', severity: 'success' });
      loadTemplates();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.error || 'Failed to reject template', severity: 'error' });
    }
  };

  const getCustomParamsDisplay = (template) => {
    try {
      const params = JSON.parse(template.custom_params || '{}');
      return Object.entries(params).map(([key, value]) => `${key}: ${value}`).join('\n') || 'None';
    } catch (e) {
      return 'None';
    }
  };

  const getStatusChip = (status) => {
    switch(status) {
      case 'ACTIVE':
        return <Chip label="Active" color="success" size="small" />;
      case 'PENDING_APPROVAL':
        return <Chip label="Pending" color="warning" size="small" />;
      case 'REJECTED':
        return <Chip label="Rejected" color="error" size="small" />;
      default:
        return <Chip label={status} size="small" />;
    }
  };

  // Filter templates by tab
  const activeTemplates = templates.filter(t => t.status === 'ACTIVE');
  const pendingTemplates = templates.filter(t => t.status === 'PENDING_APPROVAL');
  const displayTemplates = activeTab === 0 ? activeTemplates : pendingTemplates;

  return (
    <MainLayout maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/services/${serviceType}/dashboard`)}
            >
              Back
            </Button>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Templates
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadTemplates}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreate}
            >
              Create Template
            </Button>
          </Box>
        </Box>

        {/* Tabs for Active / Pending */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab label={`Active (${activeTemplates.length})`} />
            <Tab label={`Pending Approval (${pendingTemplates.length})`} />
          </Tabs>
        </Box>

        {displayTemplates.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {activeTab === 0 ? 'No active templates found' : 'No pending templates'}
            </Typography>
            {activeTab === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenCreate}
                sx={{ mt: 2 }}
              >
                Create First Template
              </Button>
            )}
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={3}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Description</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Buffer Pool</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Connections</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Min Disk</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayTemplates.map((template) => (
                  <TableRow key={template.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {template.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {template.description || '-'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={template.buffer_pool} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{template.max_connections}</TableCell>
                    <TableCell>
                      <Chip 
                        icon={<StorageIcon sx={{ fontSize: 14 }} />}
                        label={`${((template.logs_gb || 3) + (template.tmp_gb || 3) + (template.gcache_gb || 3)).toFixed(1)} GB`} 
                        size="small" 
                        color="info"
                      />
                    </TableCell>
                    <TableCell>
                      {getStatusChip(template.status)}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton 
                          size="small" 
                          color="primary"
                          onClick={() => handleOpenView(template)}
                        >
                          <VisibilityIcon />
                        </IconButton>
                        
                        {/* Approve/Reject buttons - any user except creator */}
                        {template.status === 'PENDING_APPROVAL' && template.created_by !== user?.email && (
                          <>
                            <IconButton 
                              size="small" 
                              color="success"
                              onClick={() => handleApprove(template.id)}
                              title="Approve Template"
                            >
                              <CheckCircleIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleReject(template.id)}
                              title="Reject Template"
                            >
                              <CancelIcon />
                            </IconButton>
                          </>
                        )}
                        
                        {/* Edit/Duplicate - all users for ACTIVE templates */}
                        {template.status === 'ACTIVE' && (
                          <>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleOpenEdit(template)}
                            >
                              <EditIcon />
                            </IconButton>
                            <IconButton 
                              size="small" 
                              color="primary"
                              onClick={() => handleDuplicate(template.id)}
                            >
                              <ContentCopyIcon />
                            </IconButton>
                          </>
                        )}
                        
                        {/* Delete - admin only */}
                        {isAdmin && template.status === 'ACTIVE' && (
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDelete(template.id)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

      {/* Create/Edit Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editMode ? 'Edit Template' : 'Create New Template'}
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Template Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            sx={{ mb: 2 }}
            required
          />
          <TextField
            fullWidth
            label="Description (optional)"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Buffer Pool Size (GB)"
                value={formData.buffer_pool}
                onChange={(e) => setFormData({ ...formData, buffer_pool: e.target.value })}
                inputProps={{ min: 1, step: 1 }}
                helperText="Enter size in GB (e.g., 1, 2, 4)"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                type="number"
                label="Max Connections"
                value={formData.max_connections}
                onChange={(e) => setFormData({ ...formData, max_connections: e.target.value })}
                inputProps={{ min: 10, max: 5000 }}
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
            <StorageIcon color="primary" />
            Disk Allocation (GB)
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Fixed partition sizes that will be applied during deployment. 
            Minimum disk required: {((parseFloat(formData.logs_gb) || 0) + (parseFloat(formData.tmp_gb) || 0) + (parseFloat(formData.gcache_gb) || 0)).toFixed(1)} GB
          </Alert>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Logs Partition"
                value={formData.logs_gb}
                onChange={(e) => setFormData({ ...formData, logs_gb: e.target.value })}
                inputProps={{ min: 0.5, step: 0.5 }}
                helperText="GB for /var/log/mysql"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="Tmp Partition"
                value={formData.tmp_gb}
                onChange={(e) => setFormData({ ...formData, tmp_gb: e.target.value })}
                inputProps={{ min: 0.5, step: 0.5 }}
                helperText="GB for /var/tmp"
              />
            </Grid>
            <Grid item xs={4}>
              <TextField
                fullWidth
                type="number"
                label="GCache Partition"
                value={formData.gcache_gb}
                onChange={(e) => setFormData({ ...formData, gcache_gb: e.target.value })}
                inputProps={{ min: 0.5, step: 0.5 }}
                helperText="GB for GCache"
              />
            </Grid>
          </Grid>

          <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
            Custom Parameters
          </Typography>
          {formData.custom_params.map((param, index) => (
            <Grid container spacing={2} key={index} sx={{ mb: 1 }}>
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Key"
                  value={param.key}
                  onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                />
              </Grid>
              <Grid item xs={5}>
                <TextField
                  fullWidth
                  size="small"
                  label="Value"
                  value={param.value}
                  onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                />
              </Grid>
              <Grid item xs={2}>
                {index > 0 && (
                  <IconButton color="error" onClick={() => removeParamRow(index)}>
                    <DeleteIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addParamRow}
            size="small"
            sx={{ mt: 1 }}
          >
            Add Parameter
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editMode ? 'Save Changes' : 'Create Template'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onClose={handleCloseViewDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{viewTemplate?.name}</DialogTitle>
        <DialogContent dividers>
          {viewTemplate && (
            <Box>
              {viewTemplate.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic', p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                  {viewTemplate.description}
                </Typography>
              )}
              <Typography variant="body2" gutterBottom>
                <strong>Buffer Pool:</strong> {viewTemplate.buffer_pool}
              </Typography>
              <Typography variant="body2" gutterBottom>
                <strong>Max Connections:</strong> {viewTemplate.max_connections}
              </Typography>
              <Typography variant="body2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <strong>Min Disk:</strong> 
                <Chip 
                  icon={<StorageIcon sx={{ fontSize: 14 }} />}
                  label={`${((viewTemplate.logs_gb || 3) + (viewTemplate.tmp_gb || 3) + (viewTemplate.gcache_gb || 3)).toFixed(1)} GB`} 
                  size="small" 
                  color="info"
                />
                <Typography variant="caption" color="text.secondary">
                  (logs:{viewTemplate.logs_gb || 3}g, tmp:{viewTemplate.tmp_gb || 3}g, gcache:{viewTemplate.gcache_gb || 3}g)
                </Typography>
              </Typography>
              <Typography variant="body2" sx={{ mt: 2, mb: 1 }}>
                <strong>Custom Parameters:</strong>
              </Typography>
              <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                <pre style={{ margin: 0, fontSize: '0.875rem' }}>
                  {getCustomParamsDisplay(viewTemplate)}
                </pre>
              </Paper>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                Created by: {viewTemplate.created_by} on {new Date(viewTemplate.created_at).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseViewDialog}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default TemplatesPage;
