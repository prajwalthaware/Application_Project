import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
  Typography,
  Tooltip,
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import DashboardIcon from '@mui/icons-material/Dashboard';
import HistoryIcon from '@mui/icons-material/History';
import DescriptionIcon from '@mui/icons-material/Description';
import { useService } from '../../context/ServiceContext';

const drawerWidth = 240;

const SidebarNav = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedService } = useService();
  const [open, setOpen] = useState(true);

  // If no service is selected, don't show the sidebar
  if (!selectedService) {
    return <Box sx={{ width: '100%' }}>{children}</Box>;
  }

  // Generate menu items dynamically based on selected service
  const menuItems = [
    {
      text: 'Services',
      icon: <DashboardIcon />,
      path: '/services',
      description: 'Browse available services',
    },
    {
      text: 'Builds',
      icon: <HistoryIcon />,
      path: `/services/${selectedService.id}/deployments`,
      description: 'View build history',
    },
    {
      text: 'Templates',
      icon: <DescriptionIcon />,
      path: `/services/${selectedService.id}/templates`,
      description: 'Manage templates',
    },
  ];

  const ServiceIcon = selectedService.icon;

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: 64,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ServiceIcon sx={{ color: selectedService.color, fontSize: 28 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ color: selectedService.color }}>
            {selectedService.name}
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle} size="small" aria-label="Close sidebar">
          <ChevronLeftIcon />
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1, pt: 2 }}>
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Tooltip key={item.text} title={item.description} placement="right" arrow>
              <ListItem disablePadding sx={{ px: 1 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  selected={isActive}
                  sx={{
                    borderRadius: 1,
                    mb: 0.5,
                    '&.Mui-selected': {
                      bgcolor: 'primary.main',
                      color: 'white',
                      '&:hover': {
                        bgcolor: 'primary.dark',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'white',
                      },
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? 'white' : 'primary.main',
                      minWidth: 40,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 600 : 400,
                      fontSize: '0.875rem',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </Tooltip>
          );
        })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Persistent sidebar */}
      <Drawer
        variant="persistent"
        open={open}
        sx={{
          width: open ? drawerWidth : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            bgcolor: '#fafbfc',
            top: 64, // Below navbar
            height: 'calc(100vh - 64px)',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          transition: 'margin 0.3s ease',
          marginLeft: open ? 0 : `-${drawerWidth}px`,
          width: '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default SidebarNav;
