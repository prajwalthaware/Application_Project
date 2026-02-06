import React, { useState } from 'react';
import { 
  Container, Paper, Typography, TextField, Button, Box, Grid, IconButton,
  Alert, Divider, InputAdornment, Chip
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import DeploymentStepper from '../components/layout/DeploymentStepper';
import { useDeployment } from '../context/DeploymentContext';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';

const AdvancedPage = () => {
  const navigate = useNavigate();
  const { serviceType } = useParams();
  const { formData, updateFormData } = useDeployment();
  
  const [customParams, setCustomParams] = useState(formData.custom_params || [{ key: '', value: '' }]);
  
  // Check if template has disk allocations (GB values)
  const hasTemplateDiskAllocation = formData.template_logs_gb !== null && 
                                     formData.template_logs_gb !== undefined;
  
  // Initialize disk values based on template or defaults
  const [logsGb, setLogsGb] = useState(formData.template_logs_gb || 3);
  const [tmpGb, setTmpGb] = useState(formData.template_tmp_gb || 3);
  const [gcacheGb, setGcacheGb] = useState(formData.template_gcache_gb || 3);

  const minVgSize = formData.preflight_min_vg_gb || 0;
  
  // Calculate available space for data
  const usedSpace = parseFloat(logsGb) + parseFloat(tmpGb) + parseFloat(gcacheGb);
  const availableForData = Math.max(0, minVgSize - usedSpace);
  
  // Initialize data GB: use saved value if exists, otherwise auto-calculate available space
  const [dataGb, setDataGb] = useState(() => {
    if (formData.data_gb && formData.data_gb > 0) {
      return formData.data_gb;
    }
    return availableForData > 0 ? availableForData.toFixed(1) : 0;
  });

  const handleParamChange = (index, field, value) => {
    const newParams = [...customParams];
    newParams[index][field] = value;
    setCustomParams(newParams);
  };

  const addParamRow = () => {
    setCustomParams([...customParams, { key: '', value: '' }]);
  };

  const removeParamRow = (index) => {
    const newParams = customParams.filter((_, i) => i !== index);
    setCustomParams(newParams.length > 0 ? newParams : [{ key: '', value: '' }]);
  };

  const handleDataChange = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0) {
      setDataGb(numValue);
    }
  };

  const handleLogsChange = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0) {
      setLogsGb(numValue);
    }
  };

  const handleTmpChange = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0) {
      setTmpGb(numValue);
    }
  };

  const handleGcacheChange = (value) => {
    const numValue = parseFloat(value) || 0;
    if (numValue >= 0) {
      setGcacheGb(numValue);
    }
  };

  // Calculate total disk usage
  const totalDiskUsage = parseFloat(logsGb) + parseFloat(tmpGb) + parseFloat(gcacheGb) + parseFloat(dataGb);
  const isOverLimit = totalDiskUsage > minVgSize;

  const handleNext = () => {
    updateFormData({
      custom_params: customParams,
      data_gb: parseFloat(dataGb),
      template_logs_gb: parseFloat(logsGb),
      template_tmp_gb: parseFloat(tmpGb),
      template_gcache_gb: parseFloat(gcacheGb),
    });
    navigate(`/services/${serviceType}/deploy/review`);
  };

  return (
    <MainLayout maxWidth="md">
        <DeploymentStepper activeStep={3} />

        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold" color="primary">
            Advanced Settings
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Configure disk allocation and custom parameters
          </Typography>

          {/* Show template info if exists */}
          {formData.template_name && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Using template: <strong>{formData.template_name}</strong>
            </Alert>
          )}

          {/* Disk Allocation Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <StorageIcon color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">
                Disk Allocation
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Available space: <strong>{minVgSize.toFixed(2)} GB</strong>
              {hasTemplateDiskAllocation && (
                <Chip 
                  label={`From template (editable)`} 
                  size="small" 
                  color="info" 
                  variant="outlined"
                  sx={{ ml: 2 }} 
                />
              )}
            </Typography>

            {minVgSize === 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                No prechecks data available. Please run prechecks first.
              </Alert>
            )}

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Logs Partition"
                  value={logsGb}
                  onChange={(e) => handleLogsChange(e.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">GB</InputAdornment>,
                  }}
                  helperText="Mount: /var/log/mysql"
                  disabled={minVgSize === 0}
                  inputProps={{ min: 0, step: 0.1 }}
                  error={isOverLimit}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Tmp Partition"
                  value={tmpGb}
                  onChange={(e) => handleTmpChange(e.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">GB</InputAdornment>,
                  }}
                  helperText="Mount: /var/tmp/mysql"
                  disabled={minVgSize === 0}
                  inputProps={{ min: 0, step: 0.1 }}
                  error={isOverLimit}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="GCache Partition"
                  value={gcacheGb}
                  onChange={(e) => handleGcacheChange(e.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">GB</InputAdornment>,
                  }}
                  helperText="Mount: /opt/gcache"
                  disabled={minVgSize === 0}
                  inputProps={{ min: 0, step: 0.1 }}
                  error={isOverLimit}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Data Partition"
                  value={dataGb}
                  onChange={(e) => handleDataChange(e.target.value)}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">GB</InputAdornment>,
                  }}
                  helperText={`Mount: /var/lib/mysql | Remaining: ${availableForData.toFixed(1)} GB`}
                  disabled={minVgSize === 0}
                  inputProps={{ min: 0, step: 0.1 }}
                  error={isOverLimit}
                />
              </Grid>
            </Grid>

            {isOverLimit && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Total disk allocation ({totalDiskUsage.toFixed(1)} GB) exceeds available space ({minVgSize.toFixed(1)} GB).
                Please reduce one or more partition sizes.
              </Alert>
            )}
            
            {!isOverLimit && minVgSize > 0 && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Total: {totalDiskUsage.toFixed(1)} GB / {minVgSize.toFixed(1)} GB 
                ({((totalDiskUsage / minVgSize) * 100).toFixed(1)}% used)
              </Alert>
            )}
          </Box>

          <Divider sx={{ my: 4 }} />

          {/* Custom Parameters Section */}
          <Box>
            <Typography variant="h6" gutterBottom>
              Custom MariaDB/Galera Flags
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add custom configuration parameters (optional)
            </Typography>

            {customParams.map((param, index) => (
              <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Parameter Key"
                    value={param.key}
                    onChange={(e) => handleParamChange(index, 'key', e.target.value)}
                    placeholder="e.g., expire_logs_days"
                  />
                </Grid>
                <Grid item xs={5}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Value"
                    value={param.value}
                    onChange={(e) => handleParamChange(index, 'value', e.target.value)}
                    placeholder="e.g., 10"
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
            >
              Add Parameter
            </Button>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 4 }}>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate(`/services/${serviceType}/deploy/configuration`)}
            >
              Back
            </Button>
            <Button
              variant="contained"
              endIcon={<ArrowForwardIcon />}
              onClick={handleNext}
              disabled={minVgSize === 0 || isOverLimit || totalDiskUsage === 0}
            >
              Next: Review & Build
            </Button>
          </Box>
        </Paper>
    </MainLayout>
  );
};

export default AdvancedPage;
