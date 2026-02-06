import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Typography,
  Box,
  Chip,
  Fade
} from '@mui/material';
import { useService } from '../context/ServiceContext';
import MainLayout from '../components/layout/MainLayout';
import { ServiceCardSkeleton } from '../components/SkeletonLoaders';

const ServicesPage = () => {
  const navigate = useNavigate();
  const { services, selectService } = useService();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading delay
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleServiceClick = (service) => {
    if (!service.enabled) return;
    
    selectService(service.id);
    navigate(`/services/${service.id}/dashboard`);
  };

  return (
    <MainLayout maxWidth="lg" showBreadcrumbs={false} showSidebar={false}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="600">
          Select a Service
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Choose a datastore service to build
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {loading ? (
          // Show skeletons while loading
          [1, 2, 3].map((i) => (
            <Grid item xs={4} key={i}>
              <ServiceCardSkeleton />
            </Grid>
          ))
        ) : (
          // Show actual services
          services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <Grid item xs={4} key={service.id}>
                <Fade in timeout={300 + index * 100}>
                  <Card 
                    sx={{ 
                      height: '100%',
                      cursor: service.enabled ? 'pointer' : 'not-allowed',
                      opacity: service.enabled ? 1 : 0.6,
                      transition: 'all 0.3s ease',
                      '&:hover': service.enabled ? {
                        transform: 'translateY(-4px)',
                        boxShadow: 6
                      } : {}
                    }}
                    onClick={() => handleServiceClick(service)}
                    role="button"
                    tabIndex={service.enabled ? 0 : -1}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleServiceClick(service);
                      }
                    }}
                    aria-label={`${service.name} service ${service.enabled ? 'available' : 'coming soon'}`}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <IconComponent 
                          sx={{ 
                            fontSize: 48, 
                            color: service.color,
                            mr: 2 
                          }} 
                        />
                        <Box>
                          <Typography variant="h5" component="h2" fontWeight="600">
                            {service.name}
                          </Typography>
                          {!service.enabled && (
                            <Chip 
                              label="Coming Soon" 
                              size="small" 
                              color="default" 
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {service.description}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        disabled={!service.enabled}
                        sx={{ color: service.color }}
                      >
                        {service.enabled ? 'Get Started' : 'Coming Soon'}
                      </Button>
                    </CardActions>
                  </Card>
                </Fade>
              </Grid>
            );
          })
        )}
      </Grid>
    </MainLayout>
  );
};

export default ServicesPage;
