import React from 'react';
import { Breadcrumbs, Link, Typography, Box } from '@mui/material';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import HomeIcon from '@mui/icons-material/Home';

const BreadcrumbNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { serviceType } = useParams();

  // Generate breadcrumb items based on current path
  const getBreadcrumbs = () => {
    const pathnames = location.pathname.split('/').filter((x) => x);
    const breadcrumbs = [
      { label: 'Home', path: '/services', icon: <HomeIcon sx={{ fontSize: 16, mr: 0.5 }} /> },
    ];

    if (pathnames.length === 0) return breadcrumbs;

    // Handle different routes
    if (pathnames.includes('services') && serviceType) {
      breadcrumbs.push({
        label: `${serviceType.charAt(0).toUpperCase() + serviceType.slice(1)} Service`,
        path: `/services/${serviceType}/dashboard`,
      });

      if (pathnames.includes('deploy')) {
        breadcrumbs.push({ label: 'Deploy', path: null });

        if (pathnames.includes('infrastructure')) {
          breadcrumbs.push({ label: 'Infrastructure', path: null });
        } else if (pathnames.includes('configuration')) {
          breadcrumbs.push({ label: 'Configuration', path: null });
        } else if (pathnames.includes('advanced')) {
          breadcrumbs.push({ label: 'Advanced', path: null });
        } else if (pathnames.includes('review')) {
          breadcrumbs.push({ label: 'Review', path: null });
        }
      }

      if (pathnames.includes('deployments')) {
        breadcrumbs.push({ label: 'Builds', path: null });
      }

      if (pathnames.includes('templates')) {
        breadcrumbs.push({ label: 'Templates', path: null });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          bgcolor: 'white',
          p: 1.5,
          borderRadius: 1,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;

          if (isLast) {
            return (
              <Typography
                key={crumb.label}
                color="text.primary"
                fontWeight="500"
                sx={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}
              >
                {crumb.icon}
                {crumb.label}
              </Typography>
            );
          }

          return (
            <Link
              key={crumb.label}
              component="button"
              underline="hover"
              color="inherit"
              onClick={() => navigate(crumb.path)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.875rem',
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {crumb.icon}
              {crumb.label}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default BreadcrumbNav;
