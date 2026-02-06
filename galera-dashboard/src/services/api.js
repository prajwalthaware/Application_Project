import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Enable cookies for authentication
axios.defaults.withCredentials = true;

// Create axios instance with base config
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// AUTH ENDPOINTS
export const checkLogin = () => api.get('/api/user');
export const logout = () => api.post('/api/logout');

// PRECHECKS ENDPOINTS
export const runPrechecks = (payload) => api.post('/api/preflight', payload);
export const getPrechecksStatus = (id) => api.get(`/api/preflight/${id}`);

// DEPLOYMENT ENDPOINTS
export const deployCluster = (payload) => api.post('/api/deploy', payload);
export const getHistory = () => api.get('/api/history');
export const approveDeployment = (id) => api.post(`/api/approve/${id}`);
export const rejectDeployment = (id) => api.post(`/api/reject/${id}`);
export const cancelDeployment = (id) => api.post(`/api/cancel/${id}`);
export const getConsoleLogs = (id) => api.get(`/api/deployments/${id}/console-logs`);

// TEMPLATE ENDPOINTS
export const getTemplates = () => api.get('/api/templates');
export const createTemplate = (payload) => api.post('/api/templates', payload);
export const updateTemplate = (id, payload) => api.put(`/api/templates/${id}`, payload);
export const deleteTemplate = (id) => api.delete(`/api/templates/${id}`);
export const duplicateTemplate = (id) => api.post(`/api/templates/${id}/duplicate`);
export const approveTemplate = (id) => api.post(`/api/templates/approve/${id}`);
export const rejectTemplate = (id) => api.post(`/api/templates/reject/${id}`);

export { API_URL };
export default api;
