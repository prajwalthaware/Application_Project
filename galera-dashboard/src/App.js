import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

// Theme
import theme from './theme/theme';

// Context Providers
import { AuthProvider, useAuth } from './context/AuthContext';
import { DeploymentProvider } from './context/DeploymentContext';
import { ServiceProvider } from './context/ServiceContext';
import { NotificationProvider } from './context/NotificationContext';

// Components
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LoginPage from './pages/LoginPage';
import ServicesPage from './pages/ServicesPage';
import ServiceDashboardPage from './pages/ServiceDashboardPage';
import InfrastructurePage from './pages/InfrastructurePage';
import PrechecksPage from './pages/PrechecksPage';
import ConfigurationPage from './pages/ConfigurationPage';
import AdvancedPage from './pages/AdvancedPage';
import ReviewPage from './pages/ReviewPage';
import DeploymentsPage from './pages/DeploymentsPage';
import TemplatesPage from './pages/TemplatesPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// App Routes Component
const AppRoutes = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route 
        path="/login" 
        element={isAuthenticated ? <Navigate to="/services" replace /> : <LoginPage />} 
      />

      {/* Protected Routes */}
      <Route 
        path="/services" 
        element={
          <ProtectedRoute>
            <ServicesPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:serviceType/dashboard" 
        element={
          <ProtectedRoute>
            <ServiceDashboardPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:serviceType/deploy/infrastructure" 
        element={
          <ProtectedRoute>
            <InfrastructurePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:serviceType/deploy/prechecks" 
        element={
          <ProtectedRoute>
            <PrechecksPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:serviceType/deploy/configuration" 
        element={
          <ProtectedRoute>
            <ConfigurationPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:serviceType/deploy/advanced" 
        element={
          <ProtectedRoute>
            <AdvancedPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:serviceType/deploy/review" 
        element={
          <ProtectedRoute>
            <ReviewPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:serviceType/deployments" 
        element={
          <ProtectedRoute>
            <DeploymentsPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/services/:serviceType/templates" 
        element={
          <ProtectedRoute>
            <TemplatesPage />
          </ProtectedRoute>
        } 
      />

      {/* Legacy Routes - Redirect to new structure */}
      <Route path="/dashboard" element={<Navigate to="/services" replace />} />
      <Route path="/deploy/*" element={<Navigate to="/services/galera/dashboard" replace />} />
      <Route path="/deployments" element={<Navigate to="/services/galera/deployments" replace />} />
      <Route path="/templates" element={<Navigate to="/services/galera/templates" replace />} />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/services" replace />} />
      <Route path="*" element={<Navigate to="/services" replace />} />
    </Routes>
  );
};

// Main App Component
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <NotificationProvider>
              <ServiceProvider>
                <DeploymentProvider>
                  <AppRoutes />
                </DeploymentProvider>
              </ServiceProvider>
            </NotificationProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
