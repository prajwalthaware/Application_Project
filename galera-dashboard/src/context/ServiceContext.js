import React, { createContext, useContext, useState } from 'react';
import StorageIcon from '@mui/icons-material/Storage';
import QueueIcon from '@mui/icons-material/Queue';
import SearchIcon from '@mui/icons-material/Search';

const ServiceContext = createContext();

export const useService = () => {
  const context = useContext(ServiceContext);
  if (!context) {
    throw new Error('useService must be used within a ServiceProvider');
  }
  return context;
};

export const SERVICES = [
  {
    id: 'galera',
    name: 'Galera Cluster',
    description: 'Build high-availability MySQL Galera clusters',
    icon: StorageIcon,
    color: '#5F259F',
    enabled: true
  },
  {
    id: 'rmq',
    name: 'RabbitMQ',
    description: 'Build RabbitMQ message broker clusters',
    icon: QueueIcon,
    color: '#9C27B0',
    enabled: false
  },
  {
    id: 'elasticsearch',
    name: 'Elasticsearch',
    description: 'Build Elasticsearch search and analytics clusters',
    icon: SearchIcon,
    color: '#7B1FA2',
    enabled: false
  }
];

export const ServiceProvider = ({ children }) => {
  const [selectedService, setSelectedService] = useState(null);

  const selectService = (serviceId) => {
    const service = SERVICES.find(s => s.id === serviceId);
    setSelectedService(service);
  };

  const clearService = () => {
    setSelectedService(null);
  };

  const value = {
    services: SERVICES,
    selectedService,
    selectService,
    clearService
  };

  return (
    <ServiceContext.Provider value={value}>
      {children}
    </ServiceContext.Provider>
  );
};
