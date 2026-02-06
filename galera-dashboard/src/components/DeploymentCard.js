import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Divider,
  Grid,
  LinearProgress,
  alpha,
  Button,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  OpenInNew as OpenInNewIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  Security as SecurityIcon,
  Memory as MemoryIcon,
  Dns as DnsIcon,
  StopCircle as StopCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { formatRelativeTime, formatFullTimestamp } from '../utils/timeUtils';
import { statusColors } from '../theme/theme';
import ConsoleLogsModal from './ConsoleLogsModal';

const DeploymentCard = ({ deployment, onViewDetails, onCancel, isAdmin }) => {
  const [expanded, setExpanded] = useState(false);
  const [logsModalOpen, setLogsModalOpen] = useState(false);

  // Handle Jenkins console view - opens modal with logs
  const handleViewJenkinsLogs = () => {
    setLogsModalOpen(true);
  };

  const getStatusConfig = (status) => {
    const configs = {
      'PENDING_APPROVAL': { 
        color: 'warning', 
        icon: <ScheduleIcon fontSize="small" />,
        ...statusColors.PENDING_APPROVAL,
      },
      'QUEUED': { 
        color: 'info', 
        icon: <ScheduleIcon fontSize="small" />,
        ...statusColors.QUEUED,
      },
      'RUNNING': { 
        color: 'info', 
        icon: <ScheduleIcon fontSize="small" />,
        ...statusColors.RUNNING,
      },
      'SUCCESS': { 
        color: 'success', 
        icon: <CheckCircleIcon fontSize="small" />,
        ...statusColors.SUCCESS,
      },
      'FAILURE': { 
        color: 'error', 
        icon: <ErrorIcon fontSize="small" />,
        ...statusColors.FAILURE,
      },
      'REJECTED': { 
        color: 'error', 
        icon: <ErrorIcon fontSize="small" />,
        ...statusColors.REJECTED,
      },
      'CANCELLED': { 
        color: 'default', 
        icon: <StopCircleIcon fontSize="small" />,
        ...statusColors.CANCELLED,
      },
      'ABORTED': { 
        color: 'warning', 
        icon: <StopCircleIcon fontSize="small" />,
        ...statusColors.ABORTED,
      },
      'NOT_BUILT': { 
        color: 'default', 
        icon: <ErrorIcon fontSize="small" />,
        ...statusColors.NOT_BUILT,
      },
    };
    return configs[status] || { 
      color: 'default', 
      icon: <ScheduleIcon fontSize="small" />,
      bg: '#f5f5f5',
      text: '#616161',
      border: '#9e9e9e',
    };
  };

  const parseConfig = (configJson) => {
    try {
      return JSON.parse(configJson);
    } catch (e) {
      return {};
    }
  };

  const config = parseConfig(deployment.deployment_config);
  const statusConfig = getStatusConfig(deployment.status);
  
  // Parse target hosts from database field or config
  const targetHostsString = deployment.target_hosts || config.TARGET_HOSTS || '';
  const hostArray = targetHostsString ? targetHostsString.split(',').map(h => h.trim()).filter(h => h) : [];
  const nodeCount = hostArray.length;
  
  // Parse SQL config to get buffer pool and max connections
  let bufferPool = '1G';
  let maxConnections = 100;
  try {
    const sqlConfig = config.SQL_CONFIG_JSON ? JSON.parse(config.SQL_CONFIG_JSON) : {};
    bufferPool = sqlConfig.innodb_buffer_pool_size || '1G';
    maxConnections = sqlConfig.max_connections || 100;
  } catch (e) {
    // Fallback to deployment fields
    bufferPool = deployment.buffer_pool || '1G';
    maxConnections = deployment.max_connections || 100;
  }
  
  // Galera clusters use SSL by default (wsrep_provider_options includes SSL)
  const hasSSL = true; // Galera always uses SSL for replication

  return (
    <>
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 6,
          },
        border: `2px solid ${alpha(statusConfig.text, 0.2)}`,
        position: 'relative',
        overflow: 'visible'
      }}
    >
      {/* Status indicator bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          bgcolor: statusConfig.text,
        }}
      />

      {deployment.status === 'RUNNING' && (
        <LinearProgress 
          sx={{ 
            position: 'absolute', 
            top: 4, 
            left: 0, 
            right: 0,
            height: 3
          }} 
        />
      )}

      <CardContent sx={{ flexGrow: 1, pt: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="h3" fontWeight="bold" gutterBottom>
              {deployment.cluster_name}
            </Typography>
            <Tooltip title={formatFullTimestamp(deployment.timestamp)} arrow placement="top">
              <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                ID: #{deployment.id} • {formatRelativeTime(deployment.timestamp)}
              </Typography>
            </Tooltip>
          </Box>
          <Chip
            icon={statusConfig.icon}
            label={deployment.status.replace(/_/g, ' ')}
            size="small"
            sx={{
              bgcolor: statusConfig.bg,
              color: statusConfig.text,
              fontWeight: 'bold',
              border: `1px solid ${statusConfig.border}`,
            }}
          />
        </Box>

        {/* Quick Stats */}
        <Grid container spacing={1} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Tooltip title="Number of Nodes" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <StorageIcon fontSize="small" color="primary" />
                <Typography variant="body2" fontWeight="medium">
                  {nodeCount} {nodeCount === 1 ? 'Node' : 'Nodes'}
                </Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={6}>
            <Tooltip title="SSL Status" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <SecurityIcon fontSize="small" color={hasSSL ? 'success' : 'disabled'} />
                <Typography variant="body2" fontWeight="medium">
                  SSL {hasSSL ? 'Enabled' : 'Disabled'}
                </Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={6}>
            <Tooltip title="Buffer Pool Size" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <MemoryIcon fontSize="small" color="primary" />
                <Typography variant="body2" fontWeight="medium">
                  {bufferPool}
                </Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={6}>
            <Tooltip title="Max Connections" arrow>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DnsIcon fontSize="small" color="primary" />
                <Typography variant="body2" fontWeight="medium">
                  {maxConnections} Conn
                </Typography>
              </Box>
            </Tooltip>
          </Grid>
        </Grid>

        {/* Template */}
        {deployment.template_name && (
          <Box sx={{ mb: 1 }}>
            <Chip
              label={`Template: ${deployment.template_name}`}
              size="small"
              variant="outlined"
              color="primary"
            />
          </Box>
        )}

        {/* Requester */}
        <Typography variant="caption" color="text.secondary" display="block">
          Requested by: {deployment.requester_email}
        </Typography>

        {/* Expanded Details */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Cluster Nodes:
          </Typography>
          {hostArray.length > 0 ? (
            <Box sx={{ pl: 2 }}>
              {hostArray.map((host, idx) => (
                <Typography key={idx} variant="caption" display="block" color="text.secondary">
                  • Node {idx + 1}: {host}
                </Typography>
              ))}
            </Box>
          ) : (
            <Typography variant="caption" color="text.secondary">
              No node information available
            </Typography>
          )}

          {/* Async Node */}
          {deployment.async_node && (
            <>
              <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 1.5 }}>
                Async Replica:
              </Typography>
              <Box sx={{ pl: 2 }}>
                <Typography variant="caption" display="block" color="text.secondary">
                  • {deployment.async_node}
                </Typography>
              </Box>
            </>
          )}

          {/* Custom Parameters */}
          {(() => {
            try {
              const galeraConfig = config.GALERA_CONFIG_JSON ? JSON.parse(config.GALERA_CONFIG_JSON) : {};
              // Filter out hard constraints to show only user's custom params
              const hardConstraints = ['binlog_format', 'default_storage_engine', 'wsrep_on', 'innodb_autoinc_lock_mode', 'wsrep_cluster_name', 'wsrep_sst_method'];
              const customParams = Object.entries(galeraConfig).filter(([key]) => !hardConstraints.includes(key));
              
              return customParams.length > 0 ? (
                <>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom sx={{ mt: 1.5 }}>
                    Custom Parameters:
                  </Typography>
                  <Box sx={{ pl: 2 }}>
                    {customParams.map(([key, value], idx) => (
                      <Typography key={idx} variant="caption" display="block" color="text.secondary">
                        • {key}: {value}
                      </Typography>
                    ))}
                  </Box>
                </>
              ) : null;
            } catch (e) {
              return null;
            }
          })()}
        </Collapse>
      </CardContent>

      <Divider />
      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2, pt: 1.5 }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => onViewDetails && onViewDetails(deployment)}
            variant="outlined"
            aria-label="View deployment details"
          >
            Details
          </Button>

          {deployment.jenkins_build_id && (deployment.status === 'RUNNING' || deployment.status === 'SUCCESS' || deployment.status === 'FAILURE') && (
            <Tooltip title="View Console Logs" arrow>
              <IconButton
                size="small"
                color="primary"
                onClick={handleViewJenkinsLogs}
                aria-label="View Jenkins console logs"
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          {/* Cancel Button - Only for QUEUED/RUNNING deployments and Admin users */}
          {isAdmin && ['QUEUED', 'RUNNING'].includes(deployment.status) && (
            <Button
              size="small"
              startIcon={<CancelIcon />}
              onClick={() => onCancel && onCancel(deployment.id)}
              color="error"
              variant="outlined"
              aria-label="Cancel build"
            >
              Cancel
            </Button>
          )}
        </Box>

        <Tooltip title={expanded ? "Show Less" : "Show More"} arrow>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse details" : "Expand details"}
            aria-expanded={expanded}
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s',
            }}
          >
            <ExpandMoreIcon />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
    
    {/* Console Logs Modal */}
    <ConsoleLogsModal
      open={logsModalOpen}
      onClose={() => setLogsModalOpen(false)}
      deploymentId={deployment.id}
      deploymentStatus={deployment.status}
      clusterName={deployment.cluster_name}
    />
    </>
  );
};

export default DeploymentCard;
