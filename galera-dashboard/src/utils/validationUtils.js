// Debounce function for real-time validation
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// IP address validation
export const validateIP = (ip) => {
  if (!ip || !ip.trim()) return false;
  const ipPattern = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipPattern.test(ip.trim());
};

// Password strength validation
export const validatePasswordStrength = (password) => {
  if (!password) return { strength: 'none', score: 0 };
  
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  
  if (score <= 1) return { strength: 'weak', score, color: '#d32f2f' };
  if (score <= 3) return { strength: 'medium', score, color: '#ed6c02' };
  return { strength: 'strong', score, color: '#2e7d32' };
};

// Cluster name validation
export const validateClusterName = (name) => {
  if (!name || !name.trim()) return { valid: false, error: 'Cluster name is required' };
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return { valid: false, error: 'Only alphanumeric characters and underscores allowed' };
  }
  if (name.length < 3) return { valid: false, error: 'Minimum 3 characters required' };
  if (name.length > 50) return { valid: false, error: 'Maximum 50 characters allowed' };
  return { valid: true, error: '' };
};
