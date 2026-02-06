import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  IconButton,
  Chip,
  Alert,
  Card,
  CardContent,
  Tooltip,
  Fade,
  Zoom,
  alpha
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import StorageIcon from '@mui/icons-material/Storage';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import InfoIcon from '@mui/icons-material/Info';
import { useDeployment } from '../context/DeploymentContext';
import MainLayout from '../components/layout/MainLayout';
import DeploymentStepper from '../components/layout/DeploymentStepper';

const InfrastructurePage = () => {
  const navigate = useNavigate();
  const { serviceType } = useParams();
  const { formData, updateFormData, hasTemplate } = useDeployment();
  
  // Fixed: 3 cluster nodes + 1 async node
  const [clusterNodes, setClusterNodes] = useState(['', '', '']);
  const [asyncNode, setAsyncNode] = useState('');
  
  const [clusterErrors, setClusterErrors] = useState(['', '', '']);
  const [asyncError, setAsyncError] = useState('');

  // Load saved data if exists
  useEffect(() => {
    if (formData.hosts) {
      const savedNodes = formData.hosts.split(',').filter(h => h.trim());
      if (savedNodes.length > 0) {
        setClusterNodes([
          savedNodes[0] || '',
          savedNodes[1] || '',
          savedNodes[2] || ''
        ]);
      }
    }
    if (formData.async_node_ip) {
      setAsyncNode(formData.async_node_ip);
    }
  }, []);

  useEffect(() => {
    console.log('InfrastructurePage mounted');
    console.log('formData:', formData);
    console.log('hasTemplate():', hasTemplate());
    console.log('clusterNodes:', clusterNodes);
    
    if (!hasTemplate()) {
      console.log('No template found, redirecting back to dashboard');
      navigate(`/services/${serviceType}/dashboard`);
      return;
    }
  }, [hasTemplate, navigate, serviceType]);

  const validateIP = (ip) => {
    if (!ip || !ip.trim()) return false;
    const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipPattern.test(ip.trim());
  };

  const handleClusterNodeChange = (index, value) => {
    const newNodes = [...clusterNodes];
    newNodes[index] = value;
    setClusterNodes(newNodes);
    
    // Validate
    const newErrors = [...clusterErrors];
    if (value && !validateIP(value)) {
      newErrors[index] = 'Invalid IP address';
    } else if (value && value.trim()) {
      // Check for duplicates in cluster nodes
      const duplicateIndex = newNodes.findIndex((node, i) => 
        i !== index && node.trim() === value.trim()
      );
      if (duplicateIndex !== -1) {
        newErrors[index] = `Duplicate of Node ${duplicateIndex + 1}`;
      } else if (asyncNode && asyncNode.trim() === value.trim()) {
        newErrors[index] = 'Cannot be same as Async Node';
      } else {
        newErrors[index] = '';
      }
    } else {
      newErrors[index] = '';
    }
    setClusterErrors(newErrors);
  };

  const handleAsyncNodeChange = (value) => {
    setAsyncNode(value);
    if (value && !validateIP(value)) {
      setAsyncError('Invalid IP address');
    } else if (value && value.trim()) {
      // Check if async node conflicts with cluster nodes
      const conflictIndex = clusterNodes.findIndex(node => 
        node.trim() === value.trim()
      );
      if (conflictIndex !== -1) {
        setAsyncError(`Cannot be same as Node ${conflictIndex + 1}`);
      } else {
        setAsyncError('');
      }
    } else {
      setAsyncError('');
    }
  };

  const handleNext = () => {
    // Collect all IPs for duplicate checking
    const allIPs = [...clusterNodes.filter(n => n.trim())];
    if (asyncNode && asyncNode.trim()) {
      allIPs.push(asyncNode);
    }
    
    // Check for duplicates across all IPs
    const uniqueIPs = new Set(allIPs.map(ip => ip.trim()));
    const hasDuplicates = uniqueIPs.size !== allIPs.length;
    
    // Validate all cluster nodes
    const newClusterErrors = clusterNodes.map((node, index) => {
      if (!node.trim()) return 'Required';
      if (!validateIP(node)) return 'Invalid IP';
      
      // Check for duplicates in cluster nodes
      const duplicateIndex = clusterNodes.findIndex((n, i) => 
        i !== index && n.trim() === node.trim()
      );
      if (duplicateIndex !== -1) {
        return `Duplicate of Node ${duplicateIndex + 1}`;
      }
      
      // Check if conflicts with async node
      if (asyncNode && asyncNode.trim() === node.trim()) {
        return 'Cannot be same as Async Node';
      }
      
      return '';
    });
    
    setClusterErrors(newClusterErrors);
    
    // Validate async node
    let newAsyncError = '';
    if (asyncNode) {
      if (!validateIP(asyncNode)) {
        newAsyncError = 'Invalid IP';
      } else {
        // Check if conflicts with cluster nodes
        const conflictIndex = clusterNodes.findIndex(node => 
          node.trim() === asyncNode.trim()
        );
        if (conflictIndex !== -1) {
          newAsyncError = `Cannot be same as Node ${conflictIndex + 1}`;
        }
      }
      setAsyncError(newAsyncError);
    }
    
    // Check for errors
    if (newClusterErrors.some(e => e) || newAsyncError) {
      return;
    }

    // Update deployment data
    updateFormData({ 
      hosts: clusterNodes.join(','),
      async_node_ip: asyncNode
    });
    
    navigate(`/services/${serviceType}/deploy/prechecks`);
  };

  const handleBack = () => {
    navigate(`/services/${serviceType}/dashboard`);
  };

  const allValid = clusterNodes.every(n => validateIP(n)) && (!asyncNode || validateIP(asyncNode));

  return (
    <MainLayout maxWidth="lg">
          <DeploymentStepper activeStep={0} serviceType={serviceType} />

          {/* Template Info */}
          {formData.template_name && (
            <Alert 
              severity="info" 
              sx={{ mt: 3, borderRadius: 1 }}
            >
              Using template: <strong>{formData.template_name}</strong>
            </Alert>
          )}

          <Grid container spacing={3} sx={{ mt: 1 }}>
            {/* Main Content */}
            <Grid item xs={12} md={8}>
              {/* Cluster Nodes */}
              <Paper sx={{ p: 3, mb: 3, borderRadius: 1 }}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Cluster Nodes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Enter IP addresses for the 3 cluster nodes
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {clusterNodes.map((node, index) => (
                    <Box key={index}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                        <Box
                          sx={{
                            minWidth: 36,
                            height: 36,
                            borderRadius: 1,
                            bgcolor: node && validateIP(node) ? 'success.main' : 'grey.300',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            mt: 0.5
                          }}
                        >
                          {index + 1}
                        </Box>
                        
                        <TextField
                          fullWidth
                          label={`Node ${index + 1}`}
                          placeholder={`192.168.1.${10 + index}`}
                          value={node}
                          onChange={(e) => handleClusterNodeChange(index, e.target.value)}
                          error={!!clusterErrors[index]}
                          helperText={clusterErrors[index]}
                          InputProps={{
                            endAdornment: node && validateIP(node) && (
                              <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                            )
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              {/* Async Node */}
              <Paper sx={{ p: 3, borderRadius: 1 }}>
                <Typography variant="h6" fontWeight="600" gutterBottom>
                  Async Replication Node
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
                  <Box
                    sx={{
                      minWidth: 36,
                      height: 36,
                      borderRadius: 1,
                      bgcolor: asyncNode && validateIP(asyncNode) ? 'success.main' : 'grey.300',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      mt: 0.5
                    }}
                  >
                    A
                  </Box>
                  
                  <TextField
                    fullWidth
                    label="Async Node"
                    placeholder="192.168.1.20"
                    value={asyncNode}
                    onChange={(e) => handleAsyncNodeChange(e.target.value)}
                    error={!!asyncError}
                    helperText={asyncError}
                    InputProps={{
                      endAdornment: asyncNode && validateIP(asyncNode) && (
                        <CheckCircleIcon sx={{ color: 'success.main', mr: 1 }} />
                      )
                    }}
                  />
                </Box>
              </Paper>
            </Grid>

            {/* Sidebar */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 1, position: 'sticky', top: 20 }}>
                <Typography variant="subtitle1" fontWeight="600" gutterBottom>
                  Configuration Summary
                </Typography>
                
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Cluster Nodes
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" fontWeight="600">
                        {clusterNodes.filter(n => validateIP(n)).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        / 3 configured
                      </Typography>
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Async Node
                    </Typography>
                    <Typography variant="body2" fontWeight="500">
                      {asyncNode && validateIP(asyncNode) ? '✓ Configured' : 'Not configured'}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Navigation */}
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              size="large"
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={!allValid}
              size="large"
            >
              Continue
            </Button>
          </Box>
    </MainLayout>
  );
};

export default InfrastructurePage;
