import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  Button,
  Typography,
  Box,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  alpha,
  Skeleton
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import HistoryIcon from '@mui/icons-material/History';
import SettingsIcon from '@mui/icons-material/Settings';
import StarIcon from '@mui/icons-material/Star';
import WarningIcon from '@mui/icons-material/Warning';
import StorageIcon from '@mui/icons-material/Storage';
import { useDeployment } from '../context/DeploymentContext';
import { getTemplates } from '../services/api';
import MainLayout from '../components/layout/MainLayout';

const ServiceDashboardPage = () => {
  const navigate = useNavigate();
  const { serviceType } = useParams();
  const { applyTemplate, setServiceType } = useDeployment();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  useEffect(() => {
    setServiceType(serviceType);
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceType]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await getTemplates();
      const data = res.data || res;
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template) => {
    console.log('Selected template:', template);
    setSelectedTemplate(template);
    setConfirmDialogOpen(true);
  };

  const handleConfirmTemplate = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!selectedTemplate) {
      return;
    }
    
    console.log('Applying template:', selectedTemplate);
    
    // Apply template to context
    applyTemplate(selectedTemplate);
    
    // Close dialog
    setConfirmDialogOpen(false);
    
    // Wait longer to ensure localStorage is updated
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log('Navigating to infrastructure page');
    
    // Navigate using React Router
    navigate(`/services/${serviceType}/deploy/infrastructure`);
  };

  return (
    <MainLayout maxWidth="lg">
          {/* Header Section */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <IconButton 
                onClick={() => navigate('/services')} 
                size="small"
                sx={{ 
                  bgcolor: 'white',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  '&:hover': { 
                    bgcolor: 'grey.100',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                  }
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
              <Box>
                <Typography variant="h5" fontWeight="600" color="text.primary">
                  {serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Cluster Builder
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose a template to begin your build
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Template Grid */}
          <Grid container spacing={2.5}>
            {/* Default Template - Loaded from API */}
            {!loading && templates.find(t => t.name === 'Default Template') && (
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    position: 'relative',
                    border: '2px solid',
                    borderColor: 'primary.main',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(95,37,159,0.15)',
                    }
                  }}
                  onClick={() => handleTemplateSelect(templates.find(t => t.name === 'Default Template'))}
                >
                {/* Recommended Badge */}
                <Chip
                  icon={<StarIcon sx={{ fontSize: 12 }} />}
                  label="RECOMMENDED"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    height: 22,
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    bgcolor: 'primary.main',
                    color: 'white',
                    '& .MuiChip-icon': { color: 'white' }
                  }}
                />
                
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mt: 0.5, mb: 1.5 }}>
                    Default Template
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.5 }}>
                    Optimized configuration for production workloads
                  </Typography>
                  
                  {/* Specs Box */}
                  <Box sx={{ 
                    bgcolor: 'grey.50', 
                    borderRadius: 1.5, 
                    p: 2,
                    mb: 2
                  }}>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Buffer Pool
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          1G
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                          Connections
                        </Typography>
                        <Typography variant="body2" fontWeight="600">
                          100
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  {/* Tags */}
                  <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                    <Chip 
                      icon={<StorageIcon sx={{ fontSize: 14 }} />} 
                      label="Min Disk: 9.0 GB" 
                      size="small" 
                      color="info" 
                      sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600 }} 
                    />
                    <Chip label="Quick Start" size="small" color="primary" sx={{ height: 24, fontSize: '0.7rem' }} />
                    <Chip label="Production Ready" size="small" variant="outlined" sx={{ height: 24, fontSize: '0.7rem' }} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            )}

            {/* Loading Skeletons */}
            {loading && [1, 2, 3, 4, 5].map((i) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} />
              </Grid>
            ))}

            {/* Custom Templates (excluding Default Template) */}
            {!loading && templates.filter(t => t.name !== 'Default Template').slice(0, 5).map((template) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: 'grey.300',
                    borderRadius: 2,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                      borderColor: 'primary.light'
                    }
                  }}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Typography variant="h6" fontWeight="600" gutterBottom sx={{ mb: 1.5 }}>
                      {template.name}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, lineHeight: 1.5, minHeight: 42 }}>
                      {template.description || 'Custom configuration'}
                    </Typography>
                    
                    {/* Specs Box */}
                    <Box sx={{ 
                      bgcolor: 'grey.50', 
                      borderRadius: 1.5, 
                      p: 2,
                      mb: 2
                    }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Buffer Pool
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {template.buffer_pool || '1G'}
                          </Typography>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Connections
                          </Typography>
                          <Typography variant="body2" fontWeight="600">
                            {template.max_connections || 100}
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>
                    
                    {/* Tags */}
                    <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                      <Chip 
                        icon={<StorageIcon sx={{ fontSize: 14 }} />} 
                        label={`Min Disk: ${((template.logs_gb || 3) + (template.tmp_gb || 3) + (template.gcache_gb || 3)).toFixed(1)} GB`} 
                        size="small" 
                        color="info" 
                        sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600 }} 
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Footer Actions */}
          <Box sx={{ mt: 4, display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap' }}>
            {templates.length > 5 && !loading && (
              <Button
                variant="text"
                size="small"
                onClick={() => navigate(`/services/${serviceType}/templates`)}
              >
                + {templates.length - 5} more templates
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<HistoryIcon />}
              onClick={() => navigate(`/services/${serviceType}/deployments`)}
            >
              History
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<SettingsIcon />}
              onClick={() => navigate(`/services/${serviceType}/templates`)}
            >
              Manage
            </Button>
          </Box>

      {/* Template Confirmation Dialog */}
      <Dialog 
        open={confirmDialogOpen} 
        onClose={() => setConfirmDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2.5 }
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              bgcolor: 'primary.main', 
              p: 0.75, 
              borderRadius: 1.5,
              display: 'flex'
            }}>
              <SettingsIcon sx={{ color: 'white', fontSize: 20 }} />
            </Box>
            <Typography variant="h6" fontWeight="600">
              Confirm Build
            </Typography>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          {selectedTemplate && (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                You're about to build using:
              </Typography>
              
              <Box sx={{ 
                bgcolor: alpha('#5F259F', 0.04),
                border: '1.5px solid',
                borderColor: alpha('#5F259F', 0.2),
                borderRadius: 2,
                p: 2.5
              }}>
                <Typography variant="subtitle1" fontWeight="600" color="primary" gutterBottom>
                  {selectedTemplate.name}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                  {selectedTemplate.description}
                </Typography>
                
                <Box sx={{ bgcolor: 'white', borderRadius: 1.5, p: 1.5 }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Buffer Pool
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {selectedTemplate.buffer_pool || '1G'}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                        Max Connections
                      </Typography>
                      <Typography variant="body2" fontWeight="600">
                        {selectedTemplate.max_connections || 100}
                      </Typography>
                    </Grid>
                  </Grid>
                  
                  {/* Disk Allocation (Template-Defined) */}
                  <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                      Disk Allocation (GB)
                    </Typography>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">Logs</Typography>
                        <Typography variant="body2" fontWeight="600">{selectedTemplate.logs_gb || 3}GB</Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">Tmp</Typography>
                        <Typography variant="body2" fontWeight="600">{selectedTemplate.tmp_gb || 3}GB</Typography>
                      </Grid>
                      <Grid size={{ xs: 4 }}>
                        <Typography variant="caption" color="text.secondary">GCache</Typography>
                        <Typography variant="body2" fontWeight="600">{selectedTemplate.gcache_gb || 3}GB</Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  {/* Custom Parameters */}
                  {(() => {
                    try {
                      const customParams = typeof selectedTemplate.custom_params === 'string' 
                        ? JSON.parse(selectedTemplate.custom_params) 
                        : selectedTemplate.custom_params || {};
                      const paramCount = Object.keys(customParams).length;
                      
                      return paramCount > 0 ? (
                        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                            Custom Parameters
                          </Typography>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {Object.entries(customParams).map(([key, value]) => (
                              <Typography key={key} variant="caption" sx={{ fontFamily: 'monospace' }}>
                                <strong>{key}:</strong> {value}
                              </Typography>
                            ))}
                          </Box>
                        </Box>
                      ) : null;
                    } catch (e) {
                      return null;
                    }
                  })()}
                  
                  {/* Force Wipe Warning */}
                  {!!selectedTemplate.force_wipe && (
                    <Box sx={{ 
                      mt: 2, 
                      pt: 2, 
                      borderTop: '1px solid', 
                      borderColor: 'divider',
                      bgcolor: alpha('#d32f2f', 0.05),
                      borderRadius: 1,
                      p: 1,
                      mx: -1.5,
                      mb: -1.5
                    }}>
                      <Typography variant="caption" color="error" fontWeight="600" display="flex" alignItems="center" gap={0.5}>
                        <WarningIcon sx={{ fontSize: 14 }} />
                        Force Clean Installation Enabled
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        All existing data will be wiped
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 2.5, pt: 2, gap: 1 }}>
          <Button 
            onClick={() => setConfirmDialogOpen(false)} 
            variant="outlined" 
            fullWidth
            sx={{ height: 42 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleConfirmTemplate}
            startIcon={<SettingsIcon />}
            fullWidth
            sx={{ height: 42 }}
          >
            Build Cluster
          </Button>
        </DialogActions>
      </Dialog>
    </MainLayout>
  );
};

export default ServiceDashboardPage;
