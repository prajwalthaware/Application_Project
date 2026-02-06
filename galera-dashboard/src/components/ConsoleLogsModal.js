import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { getConsoleLogs } from '../services/api';

const ConsoleLogsModal = ({ open, onClose, deploymentId, deploymentStatus, clusterName }) => {
  const [logs, setLogs] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const isRunning = deploymentStatus === 'RUNNING' || deploymentStatus === 'QUEUED';

  // Fetch logs function
  const fetchLogs = async () => {
    if (!deploymentId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await getConsoleLogs(deploymentId);
      setLogs(response.data.logs || 'No logs available');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch when modal opens
  useEffect(() => {
    if (open && deploymentId) {
      fetchLogs();
    }
  }, [open, deploymentId]);

  // Auto-refresh for running deployments
  useEffect(() => {
    if (open && isRunning) {
      setAutoRefresh(true);
      const interval = setInterval(fetchLogs, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    } else {
      setAutoRefresh(false);
    }
  }, [open, isRunning, deploymentId]);

  // Download logs
  const handleDownload = () => {
    const blob = new Blob([logs], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jenkins-console-${clusterName || deploymentId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Copy to clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{
        sx: {
          height: '85vh',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Typography variant="h6">
          Jenkins Console Logs {clusterName && `- ${clusterName}`}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {autoRefresh && (
            <Tooltip title="Auto-refreshing every 5s">
              <RefreshIcon color="info" sx={{ animation: 'spin 2s linear infinite' }} />
            </Tooltip>
          )}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 0 }}>
        {loading && !logs && (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Box sx={{ p: 2 }}>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {!loading && !error && logs && (
          <Box
            sx={{
              bgcolor: '#1e1e1e',
              color: '#d4d4d4',
              p: 2,
              height: '100%',
              overflow: 'auto',
              fontFamily: '"Consolas", "Monaco", "Courier New", monospace',
              fontSize: '13px',
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {logs}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2, py: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1, width: '100%', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Refresh logs">
              <Button
                onClick={fetchLogs}
                disabled={loading}
                startIcon={<RefreshIcon />}
                size="small"
              >
                Refresh
              </Button>
            </Tooltip>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title={copySuccess ? 'Copied!' : 'Copy to clipboard'}>
              <Button
                onClick={handleCopy}
                disabled={!logs}
                startIcon={<CopyIcon />}
                size="small"
                color={copySuccess ? 'success' : 'primary'}
              >
                {copySuccess ? 'Copied' : 'Copy'}
              </Button>
            </Tooltip>
            <Tooltip title="Download logs as text file">
              <Button
                onClick={handleDownload}
                disabled={!logs}
                startIcon={<DownloadIcon />}
                size="small"
              >
                Download
              </Button>
            </Tooltip>
            <Button onClick={onClose} variant="outlined" size="small">
              Close
            </Button>
          </Box>
        </Box>
      </DialogActions>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Dialog>
  );
};

export default ConsoleLogsModal;
