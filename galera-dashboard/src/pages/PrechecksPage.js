import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Paper, Button, Box } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MainLayout from '../components/layout/MainLayout';
import DeploymentStepper from '../components/layout/DeploymentStepper';
import PrechecksStep from '../components/PrechecksStep';
import { useDeployment } from '../context/DeploymentContext';

const PrechecksPage = () => {
  const navigate = useNavigate();
  const { serviceType } = useParams();
  const { formData, updateFormData, hasTemplate } = useDeployment();

  React.useEffect(() => {
    if (!hasTemplate()) {
      console.log('No template found, redirecting to dashboard');
      navigate(`/services/${serviceType}/dashboard`);
    }
  }, [hasTemplate, navigate, serviceType]);

  const handlePrechecksComplete = (preflightId, hosts, asyncNode, prechecksResults) => {
    console.log('Prechecks completed:', { preflightId, hosts, asyncNode });
    
    // Calculate minimum VG size across all nodes
    const minVgSize = Math.min(
      ...prechecksResults.map(node => parseFloat(node.expected_vg_gb || 0))
    );
    
    // Check if any node has existing MySQL installation
    const hasExisting = prechecksResults.some(node => node.has_existing_mysql === true);
    
    // Save prechecks data, verified hosts, and calculated values to deployment context
    updateFormData({
      preflight_id: preflightId,
      hosts: hosts.join(','),
      async_node_ip: asyncNode,
      preflight_min_vg_gb: minVgSize,
      preflight_has_existing: hasExisting
    });
    
    // Navigate to configuration page
    navigate(`/services/${serviceType}/deploy/configuration`);
  };

  const handleBack = () => {
    navigate(`/services/${serviceType}/deploy/infrastructure`);
  };

  if (!hasTemplate()) {
    return null;
  }

  // Get hosts from formData if available
  const initialHosts = formData.hosts ? formData.hosts.split(',').filter(h => h.trim()) : undefined;
  const initialAsyncNode = formData.async_node_ip || undefined;

  return (
    <MainLayout maxWidth="md">
      <DeploymentStepper activeStep={1} />

      <Paper elevation={3} sx={{ p: 4 }}>
        <PrechecksStep 
          onPrechecksComplete={handlePrechecksComplete}
          initialHosts={initialHosts}
          initialAsyncNode={initialAsyncNode}
        />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
          >
            Back
          </Button>
        </Box>
      </Paper>
    </MainLayout>
  );
};

export default PrechecksPage;
