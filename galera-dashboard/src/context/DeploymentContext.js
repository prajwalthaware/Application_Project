import React, { createContext, useState, useContext, useEffect, useRef } from 'react';

const DeploymentContext = createContext();

export const useDeployment = () => {
  const context = useContext(DeploymentContext);
  if (!context) {
    throw new Error('useDeployment must be used within DeploymentProvider');
  }
  return context;
};

const getInitialFormData = () => {
  // Try to load from localStorage
  try {
    const saved = localStorage.getItem('deploymentFormData');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading deployment data from localStorage:', e);
  }
  
  // Default initial state
  return {
    service_type: 'galera',
    hosts: '',
    async_node_ip: '',
    cluster_name: '',
    db_root_pass: '',
    app_pass: '',
    buffer_pool: '1G',
    max_connections: 100,
    custom_params: [{ key: '', value: '' }],
    preflight_id: null,
    preflight_min_vg_gb: null,
    preflight_has_existing: false,
    template_id: null,
    template_name: null,
    template_logs_gb: null,
    template_tmp_gb: null,
    template_gcache_gb: null,
    data_gb: 0,  // User-specified data partition size (0 = use 100%FREE)
    disk_allocation_pct: { data: 65, logs: 20, tmp: 10, gcache: 5 },
  };
};

export const DeploymentProvider = ({ children }) => {
  // Form data state (persists across pages via localStorage)
  const [formData, setFormData] = useState(getInitialFormData);
  
  // Ref to hold debounce timer
  const saveTimerRef = useRef(null);

  // Debounced save to localStorage (waits 500ms after last change before saving)
  useEffect(() => {
    // Clear existing timer
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    // Set new timer to save after 500ms of no changes
    saveTimerRef.current = setTimeout(() => {
      try {
        const { preflight_id, ...dataToSave } = formData;
        localStorage.setItem('deploymentFormData', JSON.stringify(dataToSave));
      } catch (e) {
        console.error('Error saving deployment data to localStorage:', e);
      }
    }, 500);

    // Cleanup function to clear timer on unmount
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [formData]);

  const updateFormData = (newData) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const resetFormData = () => {
    const defaultData = {
      service_type: 'galera',
      hosts: '',
      async_node_ip: '',
      cluster_name: '',
      db_root_pass: '',
      app_pass: '',
      buffer_pool: '1G',
      max_connections: 100,
      custom_params: [{ key: '', value: '' }],
      preflight_id: null,
      preflight_min_vg_gb: null,
      preflight_has_existing: false,
      template_id: null,
      template_name: null,
      template_logs_gb: null,
      template_tmp_gb: null,
      template_gcache_gb: null,
      disk_allocation_pct: { data: 65, logs: 20, tmp: 10, gcache: 5 },
    };
    setFormData(defaultData);
    localStorage.removeItem('deploymentFormData');
  };

  const applyTemplate = (template) => {
    const parsedParams = parseCustomParams(template.custom_params);
    setFormData((prev) => ({
      ...prev,
      buffer_pool: template.buffer_pool || '1G',
      max_connections: template.max_connections || 100,
      custom_params: parsedParams,
      template_id: template.id,
      template_name: template.name,
      service_type: template.service_type || prev.service_type || 'galera',
      // Store template disk allocations (GB values)
      template_logs_gb: template.logs_gb || 3,
      template_tmp_gb: template.tmp_gb || 3,
      template_gcache_gb: template.gcache_gb || 3,
    }));
  };

  const clearTemplate = () => {
    setFormData((prev) => ({
      ...prev,
      buffer_pool: '1G',
      max_connections: 100,
      custom_params: [{ key: '', value: '' }],
      force_wipe: false,
      template_id: null,
      template_name: null,
    }));
  };

  const setServiceType = (serviceType) => {
    setFormData((prev) => ({ ...prev, service_type: serviceType }));
  };

  const hasTemplate = () => {
    return formData.template_name !== null && formData.template_name !== '';
  };

  const parseCustomParams = (customParamsJson) => {
    try {
      const params = JSON.parse(customParamsJson || '{}');
      const entries = Object.entries(params);
      return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }];
    } catch (e) {
      return [{ key: '', value: '' }];
    }
  };

  const value = {
    formData,
    deploymentData: formData, // Alias for compatibility
    updateFormData,
    updateDeploymentData: updateFormData, // Alias for compatibility
    resetFormData,
    applyTemplate,
    clearTemplate,
    setServiceType,
    hasTemplate,
  };

  return <DeploymentContext.Provider value={value}>{children}</DeploymentContext.Provider>;
};

