import React from 'react';
import { Box, Container } from '@mui/material';
import Navbar from './Navbar';
import SidebarNav from './SidebarNav';
import BreadcrumbNav from './BreadcrumbNav';
import DevUserSwitcher from '../DevUserSwitcher';

const MainLayout = ({ children, maxWidth = 'lg', showBreadcrumbs = true, showSidebar = true }) => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      <DevUserSwitcher />
      {showSidebar ? (
        <SidebarNav>
          <Box id="main-content" component="main" sx={{ py: 4 }}>
            <Container maxWidth={maxWidth}>
              {showBreadcrumbs && <BreadcrumbNav />}
              {children}
            </Container>
          </Box>
        </SidebarNav>
      ) : (
        <Box id="main-content" component="main" sx={{ py: 4 }}>
          <Container maxWidth={maxWidth}>
            {showBreadcrumbs && <BreadcrumbNav />}
            {children}
          </Container>
        </Box>
      )}
    </Box>
  );
};

export default MainLayout;
