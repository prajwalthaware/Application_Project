import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Storage as StorageIcon,
  Memory as MemoryIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayArrowIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { runPrechecks, getPrechecksStatus } from '../services/api';

const PrechecksStep = ({ onPrechecksComplete, initialHosts, initialAsyncNode }) => {
  const [hosts, setHosts] = useState(initialHosts || ['', '', '']);
  const [asyncNode, setAsyncNode] = useState(initialAsyncNode || '');
  const [prechecksId, setPrechecksId] = useState(null);
  const [prechecksStatus, setPrechecksStatus] = useState(null);
  const [prechecksResults, setPrechecksResults] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [pollCount, setPollCount] = useState(0);

  // Poll for prechecks status with timeout
  useEffect(() => {
    if (!prechecksId || prechecksStatus === 'SUCCESS' || prechecksStatus === 'FAILED') {
      setPollCount(0);
      return;
    }

    const MAX_POLLS = 60; // 60 * 3s = 3 minutes max

    const interval = setInterval(async () => {
      setPollCount(prev => {
        const newCount = prev + 1;
        if (newCount >= MAX_POLLS) {
          setLoading(false);
          setErrorMessage('Prechecks timed out. Please check Jenkins and try again.');
          setPrechecksStatus('FAILED');
        }
        return newCount;
      });

      try {
        const response = await getPrechecksStatus(prechecksId);
        const data = response.data;
        
        setPrechecksStatus(data.status);
        
        if (data.status === 'SUCCESS' || data.status === 'FAILED') {
          setPrechecksResults(data.results);
          setErrorMessage(data.error_message || '');
          setLoading(false);
          setPollCount(0);
          // Don't auto-navigate - let user review results and click "Proceed"
        }
      } catch (error) {
        console.error('Failed to poll prechecks status:', error);
        // Continue polling - could be temporary network issue
      }
    }, 3000); // Poll every 3 seconds

    return () => {
      clearInterval(interval);
      setPollCount(0);
    };
  }, [prechecksId, prechecksStatus, onPrechecksComplete, hosts, asyncNode]);

  const handleHostChange = (index, value) => {
    const newHosts = [...hosts];
    newHosts[index] = value;
    setHosts(newHosts);
  };

  const handleRunPrechecks = async () => {
    // Validate inputs
    const validHosts = hosts.filter(h => h.trim() !== '');
    if (validHosts.length !== 3) {
      setErrorMessage('Please enter exactly 3 Galera node IPs');
      return;
    }
    if (!asyncNode.trim()) {
      setErrorMessage('Please enter Async node IP');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setPrechecksResults(null);
    setPrechecksStatus(null);

    try {
      const response = await runPrechecks({
        hosts: validHosts,
        async_node_ip: asyncNode.trim(),
      });

      setPrechecksId(response.data.preflight_id);
      setPrechecksStatus('RUNNING');
    } catch (error) {
      setLoading(false);
      setErrorMessage(error.response?.data?.error || 'Failed to start prechecks');
    }
  };

  const handleRetry = () => {
    setPrechecksId(null);
    setPrechecksStatus(null);
    setPrechecksResults(null);
    setErrorMessage('');
    setLoading(false);
    setPollCount(0);
  };

  const renderNodeResult = (node) => {
    const isSuccess = node.status === 'SUCCESS';
    
    return (
      <Paper 
        key={node.ip} 
        elevation={2} 
        sx={{ 
          p: 2, 
          mb: 2,
          borderLeft: 4,
          borderColor: isSuccess ? 'success.main' : 'error.main'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          {isSuccess ? (
            <CheckCircleIcon color="success" sx={{ mr: 1 }} />
          ) : (
            <ErrorIcon color="error" sx={{ mr: 1 }} />
          )}
          <Typography variant="h6">
            {node.hostname || node.ip}
          </Typography>
          <Chip 
            label={node.status} 
            color={isSuccess ? 'success' : 'error'}
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Box>

        {isSuccess ? (
          <>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <MemoryIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={`${node.ram_mb} MB RAM`}
                  secondary="Available Memory"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StorageIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={`${node.available_disk_gb} GB`}
                  secondary={`Available on ${node.disk_count} disk(s)`}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <StorageIcon color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={`${node.expected_vg_gb} GB`}
                  secondary="Expected VG Size (after LVM overhead)"
                />
              </ListItem>
            </List>
            
            {node.has_existing_mysql && (
              <Alert severity="warning" icon={<WarningIcon />} sx={{ mt: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  Existing MySQL Installation Detected
                </Typography>
                <Typography variant="caption" display="block">
                  VG Size: {node.existing_vg_size} - Will be destroyed during build
                </Typography>
              </Alert>
            )}
          </>
        ) : (
          <Alert severity="error" sx={{ mt: 1 }}>
            {node.errors && node.errors.length > 0 ? (
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {node.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            ) : (
              'Unknown error occurred'
            )}
          </Alert>
        )}
      </Paper>
    );
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Infrastructure Prechecks
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Verify connectivity and resource availability before building
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* Input Form */}
      {!prechecksStatus && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Galera Cluster Nodes (3 required)
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {hosts.map((host, index) => (
              <Grid item xs={12} sm={4} key={index}>
                <TextField
                  fullWidth
                  label={`Node ${index + 1} IP`}
                  value={host}
                  onChange={(e) => handleHostChange(index, e.target.value)}
                  placeholder="192.168.56.24"
                  disabled={loading}
                />
              </Grid>
            ))}
          </Grid>

          <Typography variant="h6" gutterBottom>
            Async Slave Node
          </Typography>
          <TextField
            fullWidth
            label="Async Node IP"
            value={asyncNode}
            onChange={(e) => setAsyncNode(e.target.value)}
            placeholder="192.168.56.27"
            disabled={loading}
            sx={{ mb: 3 }}
          />

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Button
            variant="contained"
            size="large"
            startIcon={<PlayArrowIcon />}
            onClick={handleRunPrechecks}
            disabled={loading}
            fullWidth
          >
            Run Connectivity Test
          </Button>
        </Box>
      )}

      {/* Loading State */}
      {prechecksStatus === 'RUNNING' && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={60} />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Running prechecks...
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Checking connectivity and resources on all nodes
          </Typography>
          <LinearProgress sx={{ mt: 2, maxWidth: 400, mx: 'auto' }} />
        </Box>
      )}

      {/* Results */}
      {prechecksResults && prechecksStatus !== 'RUNNING' && (
        <Box>
          <Alert 
            severity={prechecksStatus === 'SUCCESS' ? 'success' : 'error'}
            sx={{ mb: 3 }}
          >
            <Typography variant="h6">
              {prechecksStatus === 'SUCCESS' 
                ? '✅ All checks passed!' 
                : '❌ Prechecks failed'}
            </Typography>
            {errorMessage && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                {errorMessage}
              </Typography>
            )}
          </Alert>

          <Typography variant="h6" gutterBottom>
            Node Results
          </Typography>

          {prechecksResults.map(renderNodeResult)}

          <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleRetry}
              fullWidth
            >
              Run Again
            </Button>
            {prechecksStatus === 'SUCCESS' && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => onPrechecksComplete(prechecksId, hosts, asyncNode, prechecksResults)}
                fullWidth
              >
                Proceed to Build
              </Button>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PrechecksStep;
